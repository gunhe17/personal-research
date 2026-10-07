import { annotationUI } from './annotations.js';
import { el, fmt, playground } from './playground.js';

const $ = id => document.getElementById(id);
const KEY = 'space-draft';
const research = window.research;
let cache = {};
try { cache = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
let scope = { domain: 'space', space: null }, chat = null, sending = false, timer = null, doc = null;
let quote = cache.quote || null, activeContext = cache.context || null, retryPayload = cache.retryPayload || null;
let selectionText = '', selectionAnswer = null;
const threads = new Map(), rendered = new Set(), playgrounds = new Map();
const annotations = annotationUI({ initial: cache.annotations || [], changed: () => { retryPayload = null; persist(); } });

function button(text, cls, fn) { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; }
function persist() { try { localStorage.setItem(KEY, JSON.stringify({ draft: $('message-input').value, quote, annotations: annotations.items, context: activeContext, retryPayload })); } catch (_) {} }
function inline(node, text) {
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).forEach(piece => {
    if (piece.startsWith('**') && piece.endsWith('**')) node.append(el('strong', '', piece.slice(2, -2)));
    else if (piece.startsWith('`') && piece.endsWith('`')) node.append(el('code', '', piece.slice(1, -1)));
    else node.append(document.createTextNode(piece));
  });
}
function paragraph(parent, text, cls = '') {
  const pieces = text.split(/`{2,3}[a-z]*\s*([\s\S]*?)`{2,3}/);
  let last = null;
  pieces.forEach((piece, index) => {
    if (index % 2) { parent.append(el('pre', 'code-block', piece.trim())); return; }
    if (!piece.trim()) return;
    last = el('p', cls); inline(last, piece.trim()); parent.append(last);
  });
  return last || parent;
}
function author(label = 'Codex') { const n = el('div', 'author'); n.append(el('span', 'author-mark', label === 'Codex' ? '∂' : '↓'), el('span', '', label)); return n; }
function scroller() { return $('space-scroll'); }

// render
function renderAnswer(answer, label) {
  const article = el('article', 'assistant-message'); article.dataset.answerId = answer.id; article.append(author(label));
  const content = el('div', 'article-content');
  if (answer.rich) {
    content.append(el('h2', '', answer.rich.title));
    answer.rich.blocks.forEach((block, index) => {
      if (block.kind === 'playground' && block.playground) {
        const key = `${answer.id}:${index}`;
        const pg = playground(block.playground, context => { activeContext = { ...context, source_answer_id: answer.id }; persist(); }, key);
        playgrounds.set(key, pg); content.append(pg); if (block.text) paragraph(pg, block.text, 'pg-task');
      } else if (block.kind === 'heading') content.append(el('h3', '', block.text));
      else if (block.kind === 'formula') content.append(el('div', 'formula', block.text));
      else if (block.kind === 'code') content.append(el('pre', 'code-block', block.text));
      else if (block.kind === 'bullet') { const list = el('ul'), item = el('li'); inline(item, block.text); list.append(item); content.append(list); }
      else paragraph(content, block.text);
    });
    if (answer.rich.follow_up) paragraph(content, answer.rich.follow_up, 'article-followup');
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
      parent.append(renderAnswer(message, asked?.kind === 'collect' ? '수집' : 'Codex')); rendered.add(message.id); added = true;
    }
  }
  if (added) { if (nearBottom) scrollBottom(); else $('jump-bottom').hidden = false; }
}

function renderHeader() {
  $('space-title').textContent = scope.domain === 'agent' ? 'Agent' : scope.space?.title || '새 space';
  $('conversation-title').textContent = chat?.title || '새 대화';
  $('space-empty').hidden = Boolean(chat?.messages.length);
  $('links-count').textContent = String(chat?.documents.length || 0);
  $('space-banner').hidden = !chat || chat.codex_available;
  if (chat && !chat.codex_available) $('space-banner').textContent = '서버에서 codex CLI 를 찾지 못했습니다. 컨테이너에서 codex login --device-auth 를 확인해 주세요.';
}

function renderLinks() {
  const menu = $('links-menu'); menu.replaceChildren();
  const documents = chat?.documents || [];
  menu.append(el('div', 'link-head', documents.length ? `이 대화의 자료 ${documents.length}` : '이 대화의 자료가 없습니다'));
  documents.forEach((item, index) => {
    const row = el('div', 'link-row');
    row.append(button(item.path, 'open', () => { research.openFile(item.id); menu.classList.add('hidden'); }));
    if (index === 0 && chat) row.append(button('×', 'drop', () => relink('')));
    menu.append(row);
  });
  if (chat && doc && !documents.some(d => d.id === doc.id)) menu.append(button(`지금 문서로 바꾸기 · ${doc.path.split('/').pop()}`, 'link-action', () => relink(doc.id)));
  if (!chat && doc) menu.append(el('div', 'link-head', `첫 질문 때 ${doc.path.split('/').pop()} 를 자료로 둡니다`));
}

function row(title, meta, selected, fn) {
  const item = button('', 'menu-row', fn); item.setAttribute('aria-selected', String(selected));
  item.append(el('strong', '', title), el('span', '', meta));
  return item;
}

async function renderSpaces() {
  const menu = $('space-menu'), spaces = (await json('/api/spaces')).items || [];
  menu.replaceChildren(
    row('Agent', '홈에서 시작한 대화', scope.domain === 'agent', () => choose({ domain: 'agent', space: null })),
    ...spaces.map(item => row(item.title, `${(item.updated_at || '').slice(0, 10)} · 대화 ${item.conversation_count}`, item.id === scope.space?.id, () => choose({ domain: 'space', space: item }))),
    row('+ 새 space', '다음 질문으로 새 space 를 시작합니다', false, () => choose({ domain: 'space', space: null })),
  );
}

async function renderConversations() {
  const menu = $('conversation-menu');
  const items = scope.domain === 'agent' ? (await json('/api/agent/conversations')).items : scope.space ? (await json(`/api/spaces/${scope.space.id}`)).conversations : [];
  menu.replaceChildren(
    ...(items || []).map(item => row(item.title, `${(item.updated_at || '').slice(0, 16).replace('T', ' ')} · 메시지 ${item.message_count}`, item.id === chat?.id, () => open(scope.domain, item.id))),
    row('+ 새 대화', '다음 질문으로 새 대화를 시작합니다', !chat, () => open(scope.domain, null)),
  );
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
  $('space-menu').classList.add('hidden');
}

async function open(domain, id) {
  clearTimeout(timer); threads.clear(); rendered.clear(); playgrounds.clear(); $('messages').replaceChildren();
  scope.domain = domain; chat = null;
  $('conversation-menu').classList.add('hidden');
  if (id) await refresh(id);
  if (chat?.space_id && chat.space_id !== scope.space?.id) scope.space = await json(`/api/spaces/${chat.space_id}`);
  locate(); renderHeader(); renderLinks();
}

async function refresh(id = chat?.id) {
  try {
    chat = await json(`/api/${scope.domain}/conversations/${encodeURIComponent(id)}`, { cache: 'no-store' });
    renderHeader(); renderLinks(); renderMessages(); annotations.paint();
  } catch (error) {
    $('space-banner').hidden = false; $('space-banner').textContent = `대화를 불러오지 못했습니다. ${error.message}`;
  }
  clearTimeout(timer);
  if (chat?.messages.some(m => ['queued', 'running'].includes(m.status))) timer = setTimeout(() => refresh(), 1500);
}

async function relink(collectedId) {
  try { chat = { ...chat, ...(await post(base(), { collected_id: collectedId }, 'PUT')), codex_available: chat.codex_available }; renderHeader(); renderLinks(); }
  catch (error) { $('form-status').textContent = error.message; }
}

async function action(type, id) { try { await post(`${base()}/${type}`, { message_id: id }); await refresh(); } catch (error) { $('form-status').textContent = error.message; } }

async function send(event) {
  event?.preventDefault();
  const text = $('message-input').value.trim() || (annotations.items.length ? '첨부한 주석을 확인하고 설명해줘.' : '');
  if (!text || sending) return;
  const payload = retryPayload?.content === text ? retryPayload : {
    client_id: crypto.randomUUID(), content: text,
    kind: /^(\/next|next|go|다음)$/i.test(text) ? 'next' : /인출/.test(text) ? 'retrieval' : 'question',
    context: { ...(activeContext || {}), selected_text: quote?.text || '', source_path: quote?.path || '', annotations: annotations.items.map(a => ({ ...a })) },
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

function rename(target) {
  const trigger = $(target === 'space' ? 'btn-space' : 'btn-conversation');
  const owner = target === 'space' ? scope.space : chat;
  if (!owner || trigger.hidden) return;
  only(null);
  const input = el('input', 'rename-input'); input.value = owner.title; input.setAttribute('aria-label', '이름');
  trigger.hidden = true; trigger.after(input); input.focus(); input.select();
  let finished = false;
  const done = async save => {
    if (finished) return; finished = true;
    const title = input.value.trim();
    input.remove(); trigger.hidden = false;
    if (!save || !title || title === owner.title) return;
    const url = target === 'space' ? `/api/spaces/${owner.id}` : base();
    try { await post(url, { title }, 'PUT'); owner.title = title; research.spacesChanged(); } catch (error) { $('form-status').textContent = error.message; }
    renderHeader();
  };
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); done(true); } if (event.key === 'Escape') done(false); });
  input.addEventListener('blur', () => done(true));
}

function resizeInput() { const input = $('message-input'); input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 180)}px`; }

// events
$('message-input').value = cache.draft || '';
$('message-input').addEventListener('input', () => { resizeInput(); persist(); });
$('message-input').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); send(); } });
$('composer').addEventListener('submit', send);
$('jump-bottom').addEventListener('click', scrollBottom);
$('clear-quote').addEventListener('click', () => { quote = null; renderQuote(); persist(); });
$('btn-space').addEventListener('click', async event => {
  event.stopPropagation(); only('space-menu');
  if (!$('space-menu').classList.toggle('hidden')) await renderSpaces();
});
$('btn-conversation').addEventListener('click', async event => {
  event.stopPropagation(); only('conversation-menu');
  if (!$('conversation-menu').classList.toggle('hidden')) await renderConversations();
});
function only(keep) { ['space-menu', 'conversation-menu', 'links-menu'].filter(id => id !== keep).forEach(id => $(id).classList.add('hidden')); }
document.addEventListener('keydown', event => { if (event.key === 'Escape') only(null); });
$('btn-space').addEventListener('dblclick', () => rename('space'));
$('btn-conversation').addEventListener('dblclick', () => rename('conversation'));
$('btn-links').addEventListener('click', event => { event.stopPropagation(); only('links-menu'); renderLinks(); $('links-menu').classList.toggle('hidden'); });
document.addEventListener('click', event => {
  if (!$('space-dd').contains(event.target)) $('space-menu').classList.add('hidden');
  if (!$('conversation-dd').contains(event.target)) $('conversation-menu').classList.add('hidden');
  if (!$('links-dd').contains(event.target)) $('links-menu').classList.add('hidden');
});
$('layout-seg').querySelectorAll('[data-layout]').forEach(b => b.addEventListener('click', () => research.setLayout(b.dataset.layout)));
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
async function follow(current) {
  doc = current; renderLinks();
  const url = new URL(location.href);
  if (!doc || chat || url.searchParams.get('conversation') || url.searchParams.get('agent')) return;
  const found = (await json(`/api/conversations?collected_id=${encodeURIComponent(doc.id)}`)).items || [];
  if (found.length && !chat) { scope = { domain: 'space', space: null }; await open('space', found[0].id); }
}
window.addEventListener('research:doc', event => follow(event.detail));
window.addEventListener('research:layout', event => {
  $('layout-seg').querySelectorAll('[data-layout]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.layout === event.detail)));
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && chat) refresh(); });

renderQuote(); resizeInput();
async function start() {
  const url = new URL(location.href), agent = url.searchParams.get('agent'), space = url.searchParams.get('space'), conversation = url.searchParams.get('conversation');
  if (agent) return open('agent', agent);
  if (conversation) return open('space', conversation);
  if (space) return choose({ domain: 'space', space: await json(`/api/spaces/${space}`) });
  renderHeader(); follow(research.current());
}
start();
window.dispatchEvent(new CustomEvent('research:layout', { detail: localStorage.getItem('layout') || 'split' }));
