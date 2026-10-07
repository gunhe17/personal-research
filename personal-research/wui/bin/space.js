import { annotationUI } from './annotations.js';
import { blocks } from './blocks.js';
import { el, fmt } from './playground.js';

const $ = id => document.getElementById(id);
const KEY = 'space-draft';
const research = window.research;
let cache = {};
try { cache = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
let scope = { domain: 'space', space: null }, chat = null, sending = false, timer = null, doc = null;
let quote = cache.quote || null, activeContext = cache.context || null, retryPayload = cache.retryPayload || null;
let selectionText = '', selectionAnswer = null;
const threads = new Map(), rendered = new Set(), playgrounds = new Map();
const COMMANDS = [
  { name: '/next', hint: '다음 학습 단계로 넘어갑니다', kind: 'next' },
  { name: '/retrieval', hint: '배운 내용을 내 말로 설명하고 점검받습니다', kind: 'retrieval' },
];
let commandIndex = 0, catalog = null, model = null;
try { model = JSON.parse(localStorage.getItem('model') || 'null'); } catch (_) {}
const annotations = annotationUI({ initial: cache.annotations || [], changed: () => { retryPayload = null; persist(); } });

function button(text, cls, fn) { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; }
function persist() { try { localStorage.setItem(KEY, JSON.stringify({ draft: $('message-input').value, quote, annotations: annotations.items, context: activeContext, retryPayload })); } catch (_) {} }
function author(label = 'Codex') { const n = el('div', 'author'); n.append(el('span', 'author-mark', label === '수집' ? '↓' : '∂'), el('span', '', label)); return n; }
function answeredBy(question) { const picked = question?.context?.model; return catalog?.providers.flatMap(p => p.models).find(m => m.id === picked?.model)?.label || 'Codex'; }
function scroller() { return $('space-scroll'); }

// render
function renderAnswer(answer, label) {
  const article = el('article', 'assistant-message'); article.dataset.answerId = answer.id; article.append(author(label));
  const content = el('div', 'article-content');
  if (answer.rich) {
    blocks(content, answer.rich, { key: answer.id, playgrounds, onContext: context => { activeContext = { ...context, source_answer_id: answer.id }; persist(); } });
  } else {
    const md = el('div', 'md-chat'); md.innerHTML = window.marked ? marked.parse(answer.content || '') : ''; if (!window.marked) md.textContent = answer.content; content.append(md);
  }
  article.append(content);
  if ((answer.sources || []).length) {
    const box = el('div', 'sources'); box.append(el('span', '', '근거'));
    answer.sources.forEach(s => box.append(button(s.path, '', () => research.openFile(s.id))));
    article.append(box);
  }
  const actions = el('div', 'message-actions');
  actions.append(button('이 답변에 질문하기', 'quiet', () => {
    quote = { text: answer.rich ? answer.rich.title : answer.content.slice(0, 200) }; activeContext = { ...(activeContext || {}), source_answer_id: answer.id };
    renderQuote(); persist(); $('message-input').focus();
  }), button('복사', 'quiet', async () => {
    try { await navigator.clipboard.writeText(answer.content); $('form-status').textContent = '답변을 복사했습니다.'; }
    catch (_) { $('form-status').textContent = '답변을 드래그해 복사해 주세요.'; }
  }));
  article.append(actions);
  return article;
}

function renderQuestion(question) {
  const root = el('section', 'exchange');
  const user = el('div', 'user-message'); user.append(el('div', 'user-label', '나'));
  const c = question.context || {};
  if (c.selected_text) user.append(el('blockquote', '', c.selected_text));
  (c.citations || []).forEach(cite => user.append(el('blockquote', '', cite.text || '')));
  (c.annotations || []).forEach((a, i) => {
    const tag = el('details', 'sent-annotation'); tag.append(el('summary', '', `${i + 1}. ${a.text.slice(0, 80)}`));
    tag.append(el('blockquote', '', a.text)); if (a.comment) tag.append(el('p', '', a.comment)); user.append(tag);
  });
  user.append(el('div', '', question.content));
  if (c.source_path) user.append(el('div', 'user-context', c.source_path));
  if (Number.isFinite(c.w)) {
    const details = el('div', 'user-context', `w=${fmt(c.w)}, h=${fmt(c.h)} · ${c.mode || ''}`);
    details.append(document.createTextNode('  '), button('이 장면 보기', 'quiet', () => restoreScene(c))); user.append(details);
  }
  const answers = el('div'), status = el('div', 'job-status'); status.setAttribute('role', 'status');
  root.append(user, answers, status); $('messages').append(root);
  const entry = { answers, status, hash: '' }; threads.set(question.id, entry);
  return entry;
}

function renderStatus(question, entry) {
  const hash = JSON.stringify([question.status, question.error, chat.codex_available]);
  if (entry.hash === hash) return;
  entry.hash = hash; entry.status.replaceChildren(); entry.status.className = 'job-status';
  if (!question.status || question.status === 'completed') return;
  if (['queued', 'running'].includes(question.status)) {
    entry.status.append(el('span', 'thinking-dot'), el('span', '', question.status === 'queued' ? '차례를 기다리고 있습니다.' : '수집물을 조사하고 답을 쓰고 있습니다.'), button('중지', 'quiet', () => action('cancel', question.id)));
    return;
  }
  entry.status.classList.add('error');
  entry.status.append(el('span', '', question.error || (question.status === 'cancelled' ? '답변 생성을 중지했습니다.' : '답변을 받지 못했습니다.')));
  if (chat.codex_available) entry.status.append(button('다시 시도', 'quiet', () => action('retry', question.id)));
}

function renderMessages() {
  const box = scroller(), nearBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 300;
  let added = false, previous = null;
  for (const message of chat.messages) {
    if (message.role === 'user') {
      previous = message;
      const entry = threads.get(message.id) || (added = true, renderQuestion(message));
      renderStatus(message, entry);
    } else if (!rendered.has(message.id)) {
      const asked = chat.messages.find(m => m.id === message.question_id) || previous;
      const parent = threads.get(asked?.id)?.answers || $('messages');
      parent.append(renderAnswer(message, asked?.kind === 'collect' ? '수집' : answeredBy(asked))); rendered.add(message.id); added = true;
    }
  }
  if (added) { if (nearBottom) scrollBottom(); else $('jump-bottom').hidden = false; }
}

function renderHeader() {
  $('pane-name').textContent = chat?.title || '새 대화';
  $('space-empty').hidden = Boolean(chat?.messages.length);
  research.titled?.({ kind: scope.domain === 'agent' ? 'agent' : 'chat', title: chat?.title || '새 대화', space: scope.space?.id || '', conversation: chat?.id || '', agent: scope.domain === 'agent' ? chat?.id || '' : '' });
  $('space-banner').hidden = !chat || chat.codex_available;
  if (chat && !chat.codex_available) $('space-banner').textContent = '서버에서 codex CLI 를 찾지 못했습니다. 컨테이너에서 codex login --device-auth 를 확인해 주세요.';
}

function restoreScene(c) {
  const candidates = [...playgrounds.entries()].filter(([key]) => !c.source_answer_id || key.startsWith(c.source_answer_id));
  const found = candidates.find(([, pg]) => pg.dataset.mode === c.mode) || candidates[0];
  if (found) { found[1].restore(c); found[1].scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  activeContext = { ...c }; persist();
}
function renderQuote() {
  $('quote-box').hidden = !quote; $('quote-text').textContent = quote?.text || '';
  $('quote-label').textContent = quote?.path ? `인용 · ${quote.path.split('/').pop()}` : '인용';
}
function scrollBottom() { scroller().scrollTo({ top: scroller().scrollHeight, behavior: 'smooth' }); $('jump-bottom').hidden = true; }

// data
async function json(url, options) {
  const response = await fetch(url, options); const result = await response.json();
  if (!response.ok) throw new Error(result.error || '요청을 처리하지 못했습니다.');
  return result;
}
function post(url, payload, method = 'POST') { return json(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
function base() { return `/api/${scope.domain}/conversations/${chat.id}`; }

function locate() {
  const url = new URL(location.href);
  ['space', 'conversation', 'agent'].forEach(key => url.searchParams.delete(key));
  if (scope.domain === 'agent' && chat) url.searchParams.set('agent', chat.id);
  if (scope.domain === 'space' && scope.space) url.searchParams.set('space', scope.space.id);
  if (scope.domain === 'space' && chat) url.searchParams.set('conversation', chat.id);
  history.replaceState(null, '', url);
}

async function choose(next) {
  scope = next;
  const latest = scope.domain === 'space' && scope.space ? (await json(`/api/spaces/${scope.space.id}`)).conversations[0] : null;
  await open(scope.domain, latest?.id || null);
}

async function open(domain, id) {
  clearTimeout(timer); threads.clear(); rendered.clear(); playgrounds.clear(); $('messages').replaceChildren();
  scope.domain = domain; chat = null;
  if (id) await refresh(id);
  if (chat?.space_id && chat.space_id !== scope.space?.id) scope.space = await json(`/api/spaces/${chat.space_id}`);
  locate(); renderHeader();
}

async function refresh(id = chat?.id) {
  try {
    chat = await json(`/api/${scope.domain}/conversations/${encodeURIComponent(id)}`, { cache: 'no-store' });
    renderHeader(); renderMessages(); annotations.paint();
  } catch (error) {
    $('space-banner').hidden = false; $('space-banner').textContent = `대화를 불러오지 못했습니다. ${error.message}`;
  }
  clearTimeout(timer);
  if (chat?.messages.some(m => ['queued', 'running'].includes(m.status))) timer = setTimeout(() => refresh(), 1500);
}

async function action(type, id) { try { await post(`${base()}/${type}`, { message_id: id }); await refresh(); } catch (error) { $('form-status').textContent = error.message; } }

async function send(event) {
  event?.preventDefault();
  const text = $('message-input').value.trim() || (annotations.items.length ? '첨부한 주석을 확인하고 설명해줘.' : '');
  if (!text || sending) return;
  const payload = retryPayload?.content === text ? retryPayload : {
    client_id: crypto.randomUUID(), content: text,
    kind: commanded(text)?.kind || (/^(next|go|다음)$/i.test(text) ? 'next' : /인출/.test(text) ? 'retrieval' : 'question'),
    context: { ...(activeContext || {}), model, selected_text: quote?.text || '', source_path: quote?.path || '', annotations: annotations.items.map(a => ({ ...a })) },
  };
  retryPayload = payload; sending = true; $('send').disabled = true; persist(); $('form-status').textContent = '보내는 중…';
  try {
    if (!chat) {
      if (scope.domain === 'space' && !scope.space) scope.space = await post('/api/spaces', { title: named(text) });
      const created = await post(`/api/${scope.domain}/conversations`, { space_id: scope.space?.id, collected_id: doc?.id || '' });
      await open(scope.domain, created.id);
    }
    await post(`${base()}/messages`, payload);
    $('message-input').value = ''; quote = null; annotations.clear(); retryPayload = null;
    renderQuote(); resizeInput(); persist(); $('form-status').textContent = ''; await refresh(); scrollBottom();
    research.spacesChanged();
  } catch (error) {
    $('form-status').textContent = `${error.message} 입력 내용은 유지됩니다.`; persist();
  } finally { sending = false; $('send').disabled = false; }
}
function named(text) {
  const repository = doc?.path.match(/^repos\/github\/([^/]+\/[^/]+)/);
  if (repository) return repository[1];
  if (doc) return doc.path.split('/').pop().replace(/\.(md|html)$/, '');
  return text.length > 24 ? `${text.slice(0, 24)}…` : text;
}

// commands
function commanded(text) { return COMMANDS.find(c => text === c.name || text.startsWith(`${c.name} `)); }
function matching() { const value = $('message-input').value; return /^\/\S*$/.test(value) ? COMMANDS.filter(c => c.name.startsWith(value.toLowerCase())) : []; }
function renderCommands() {
  const found = matching(), menu = $('command-menu');
  menu.hidden = !found.length;
  commandIndex = Math.min(commandIndex, Math.max(found.length - 1, 0));
  menu.replaceChildren(...found.map((command, index) => row(command.name, command.hint, index === commandIndex, () => pickCommand(command))));
}
function pickCommand(command) { $('message-input').value = `${command.name} `; $('command-menu').hidden = true; resizeInput(); persist(); $('message-input').focus(); }
function row(title, hint, selected, pick) {
  const item = el('button', 'menu-row'); item.type = 'button'; item.setAttribute('role', 'option'); item.setAttribute('aria-selected', String(selected));
  item.append(el('strong', '', title), el('span', '', hint));
  item.addEventListener('pointerdown', event => event.preventDefault());
  item.addEventListener('click', pick);
  return item;
}

// model
async function loadModels() {
  catalog = await json('/api/models').catch(() => null);
  if (!catalog) return;
  const provider = catalog.providers.find(p => p.id === model?.provider);
  if (!provider?.models.some(m => m.id === model.model)) model = catalog.default;
  renderModels();
}
function renderModels() {
  const provider = catalog.providers.find(p => p.id === model.provider);
  $('provider-label').textContent = provider.label;
  $('model-label').textContent = provider.models.find(m => m.id === model.model)?.label || model.model;
  $('provider-menu').replaceChildren(...catalog.providers.map(p => row(p.label, `${p.models.length}개 모델`, p.id === model.provider, () => setModel({ provider: p.id, model: p.id === model.provider ? model.model : p.model }))));
  $('model-menu').replaceChildren(...provider.models.map(m => row(m.label, m.id, m.id === model.model, () => setModel({ ...model, model: m.id }))));
}
function setModel(next) { model = next; try { localStorage.setItem('model', JSON.stringify(model)); } catch (_) {} closeMenus(); renderModels(); }
function toggleMenu(name) { const open = $(`${name}-menu`).hidden; closeMenus(); $(`${name}-menu`).hidden = !open; $(`${name}-button`).setAttribute('aria-expanded', String(open)); }
function closeMenus() { for (const name of ['provider', 'model']) { $(`${name}-menu`).hidden = true; $(`${name}-button`).setAttribute('aria-expanded', 'false'); } }

function resizeInput() { const input = $('message-input'); input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 180)}px`; }

// events
$('message-input').value = cache.draft || '';
$('message-input').addEventListener('input', () => { commandIndex = 0; renderCommands(); resizeInput(); persist(); });
$('message-input').addEventListener('keydown', event => {
  const found = $('command-menu').hidden ? [] : matching();
  if (found.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); commandIndex = (commandIndex + (event.key === 'ArrowDown' ? 1 : -1) + found.length) % found.length; return renderCommands(); }
  if (found.length && ['Enter', 'Tab'].includes(event.key) && !event.isComposing) { event.preventDefault(); return pickCommand(found[commandIndex]); }
  if (found.length && event.key === 'Escape') { $('command-menu').hidden = true; return; }
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); send(); }
});
$('message-input').addEventListener('blur', () => { $('command-menu').hidden = true; });
$('provider-button').addEventListener('click', () => toggleMenu('provider'));
$('model-button').addEventListener('click', () => toggleMenu('model'));
document.addEventListener('pointerdown', event => { if (!event.target.closest('.picker')) closeMenus(); });
$('composer').addEventListener('submit', send);
$('jump-bottom').addEventListener('click', scrollBottom);
$('clear-quote').addEventListener('click', () => { quote = null; renderQuote(); persist(); });
scroller().addEventListener('scroll', () => {
  annotations.paint();
  if (scroller().scrollTop + scroller().clientHeight >= scroller().scrollHeight - 300) $('jump-bottom').hidden = true;
}, { passive: true });
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection(), text = selection?.toString().trim(), anchor = selection?.anchorNode?.parentElement;
  if (text && anchor && $('messages').contains(anchor)) {
    selectionText = text.slice(0, 2000); selectionAnswer = anchor.closest('[data-answer-id]')?.dataset.answerId || null; $('quote-selection').hidden = false;
  } else if (!text) $('quote-selection').hidden = true;
});
$('quote-selection').addEventListener('pointerdown', event => event.preventDefault());
$('quote-selection').addEventListener('click', () => {
  const candidate = annotations.capture(window.getSelection()); if (candidate) annotations.add(candidate);
  quote = { text: selectionText }; if (selectionAnswer) activeContext = { ...(activeContext || {}), source_answer_id: selectionAnswer };
  renderQuote(); persist(); $('quote-selection').hidden = true; $('message-input').focus();
});
window.addEventListener('research:quote', event => {
  quote = { text: event.detail.text.slice(0, 2000), path: event.detail.path, id: event.detail.id };
  renderQuote(); persist(); $('message-input').focus();
});
function follow(current) {
  doc = current;
}
window.addEventListener('research:doc', event => follow(event.detail));
window.addEventListener('research:settings', loadModels);
document.addEventListener('visibilitychange', () => { if (!document.hidden && chat) refresh(); });

renderQuote(); resizeInput(); await loadModels();
async function start() {
  const url = new URL(location.href), agent = url.searchParams.get('agent'), space = url.searchParams.get('space'), conversation = url.searchParams.get('conversation');
  if (agent) return open('agent', agent);
  if (conversation) return open('space', conversation);
  if (space && url.searchParams.get('new')) { scope = { domain: 'space', space: await json(`/api/spaces/${space}`) }; return open('space', null); }
  if (space) return choose({ domain: 'space', space: await json(`/api/spaces/${space}`) });
  renderHeader(); follow(research.current());
}
start();
