import { annotationUI } from './annotations.js';
import { el, fmt, playground } from './playground.js';

const $ = id => document.getElementById(id);
const KEY = 'space-draft';
const research = window.research;
let cache = {};
try { cache = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
let space = null, sending = false, timer = null, doc = null;
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
function paragraph(parent, text, cls = '') { const p = el('p', cls); inline(p, text); parent.append(p); return p; }
function author() { const n = el('div', 'author'); n.append(el('span', 'author-mark', '∂'), el('span', '', 'Codex')); return n; }
function scroller() { return $('space-scroll'); }

// render
function renderAnswer(answer) {
  const article = el('article', 'assistant-message'); article.dataset.answerId = answer.id; article.append(author());
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
      else if (block.kind === 'bullet') { const list = el('ul'), item = el('li'); inline(item, block.text); list.append(item); content.append(list); }
      else paragraph(content, block.text);
    });
    if (answer.rich.follow_up) paragraph(content, answer.rich.follow_up, 'article-followup');
  } else {
    const md = el('div', 'md-chat'); md.innerHTML = window.marked ? marked.parse(answer.body || '') : ''; if (!window.marked) md.textContent = answer.body; content.append(md);
  }
  article.append(content);
  if ((answer.sources || []).length) {
    const box = el('div', 'sources'); box.append(el('span', '', '근거'));
    answer.sources.forEach(s => box.append(button(s.path, '', () => research.openFile(s.id))));
    article.append(box);
  }
  const actions = el('div', 'message-actions');
  actions.append(button('이 답변에 질문하기', 'quiet', () => {
    quote = { text: answer.rich ? answer.rich.title : answer.body.slice(0, 200) }; activeContext = { ...(activeContext || {}), source_answer_id: answer.id };
    renderQuote(); persist(); $('message-input').focus();
  }), button('복사', 'quiet', async () => {
    try { await navigator.clipboard.writeText(answer.body); $('form-status').textContent = '답변을 복사했습니다.'; }
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
  user.append(el('div', '', question.body));
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
  const hash = JSON.stringify([question.status, question.error, space.codex_available]);
  if (entry.hash === hash) return;
  entry.hash = hash; entry.status.replaceChildren(); entry.status.className = 'job-status';
  if (question.status === 'completed') return;
  if (['queued', 'running'].includes(question.status)) {
    entry.status.append(el('span', 'thinking-dot'), el('span', '', question.status === 'queued' ? '차례를 기다리고 있습니다.' : '수집물을 조사하고 답을 쓰고 있습니다.'), button('중지', 'quiet', () => action('cancel', question.id)));
    return;
  }
  entry.status.classList.add('error');
  entry.status.append(el('span', '', question.error || (question.status === 'cancelled' ? '답변 생성을 중지했습니다.' : '답변을 받지 못했습니다.')));
  if (space.codex_available) entry.status.append(button('다시 시도', 'quiet', () => action('retry', question.id)));
}

function renderMessages() {
  const box = scroller(), nearBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 300;
  let added = false;
  for (const message of space.messages) {
    if (message.role === 'user') {
      const entry = threads.get(message.id) || (added = true, renderQuestion(message));
      renderStatus(message, entry);
    } else if (!rendered.has(message.id)) {
      const parent = threads.get(message.question_id)?.answers || $('messages');
      parent.append(renderAnswer(message)); rendered.add(message.id); added = true;
    }
  }
  if (added) { if (nearBottom) scrollBottom(); else $('jump-bottom').hidden = false; }
}

function renderHeader() {
  $('space-title').textContent = space?.title || '새 space';
  $('space-empty').hidden = Boolean(space?.messages.length);
  const linked = space?.linked || [];
  $('links-count').textContent = String(linked.filter(l => l.direct).length);
  $('space-banner').hidden = !space || space.codex_available;
  if (space && !space.codex_available) $('space-banner').textContent = '서버에서 codex CLI 를 찾지 못했습니다. 컨테이너에서 codex login --device-auth 를 확인해 주세요.';
}

function renderLinks() {
  const menu = $('links-menu'); menu.replaceChildren();
  const linked = space?.linked || [];
  menu.append(el('div', 'link-head', linked.length ? `연결된 자료 ${linked.length}` : '연결된 자료가 없습니다'));
  linked.forEach(item => {
    const row = el('div', 'link-row');
    row.append(button(item.path, 'open', () => { research.openFile(item.id); menu.classList.add('hidden'); }));
    if (item.direct) row.append(button('×', 'drop', () => relink(item.id, false)));
    menu.append(row);
  });
  if (doc && !linked.some(l => l.id === doc.id)) menu.append(button(`지금 문서 연결 · ${doc.path.split('/').pop()}`, 'link-action', () => relink(doc.id, true)));
}

function renderMenu(items) {
  const menu = $('space-menu'); menu.replaceChildren();
  menu.append(Object.assign(button('+ 새 space', 'space-row', () => { open(null); menu.classList.add('hidden'); }), { style: 'color:#0066cc;font-size:13px' }));
  items.forEach(item => {
    const row = button('', 'space-row', () => { open(item.id); menu.classList.add('hidden'); });
    row.setAttribute('aria-selected', String(item.id === space?.id));
    row.append(el('strong', '', item.title), el('span', '', `${(item.updated_at || '').slice(0, 10)} · 메시지 ${item.message_count}`));
    menu.append(row);
  });
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
function post(url, payload) { return json(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }

async function open(id) {
  clearTimeout(timer); threads.clear(); rendered.clear(); playgrounds.clear(); $('messages').replaceChildren();
  space = null;
  const url = new URL(location.href);
  if (id) url.searchParams.set('space', id); else url.searchParams.delete('space');
  history.replaceState(null, '', url);
  if (id) await refresh(id); else { renderHeader(); renderLinks(); }
}

async function refresh(id = space?.id) {
  try {
    space = await json(`/api/spaces/${encodeURIComponent(id)}`, { cache: 'no-store' });
    renderHeader(); renderLinks(); renderMessages(); annotations.paint();
  } catch (error) {
    $('space-banner').hidden = false; $('space-banner').textContent = `space 를 불러오지 못했습니다. ${error.message}`;
  }
  clearTimeout(timer);
  if (space?.messages.some(m => ['queued', 'running'].includes(m.status))) timer = setTimeout(() => refresh(), 1500);
}

async function relink(collectedId, linked) {
  try { const result = await post(`/api/spaces/${space.id}/links`, { collected_id: collectedId, linked }); space.linked = result.linked; renderHeader(); renderLinks(); }
  catch (error) { $('form-status').textContent = error.message; }
}

async function action(type, id) { try { await post(`/api/spaces/${space.id}/${type}`, { message_id: id }); await refresh(); } catch (error) { $('form-status').textContent = error.message; } }

async function send(event) {
  event?.preventDefault();
  const text = $('message-input').value.trim() || (annotations.items.length ? '첨부한 주석을 확인하고 설명해줘.' : '');
  if (!text || sending) return;
  const payload = retryPayload?.body === text ? retryPayload : {
    client_id: crypto.randomUUID(), body: text,
    kind: /^(\/next|next|go|다음)$/i.test(text) ? 'next' : /인출/.test(text) ? 'retrieval' : 'question',
    context: { ...(activeContext || {}), selected_text: quote?.text || '', source_path: quote?.path || '', annotations: annotations.items.map(a => ({ ...a })) },
  };
  retryPayload = payload; sending = true; $('send').disabled = true; persist(); $('form-status').textContent = '보내는 중…';
  try {
    if (!space) {
      const created = await post('/api/spaces', { collected_id: doc?.id || '' });
      await open(created.id);
    }
    await post(`/api/spaces/${space.id}/messages`, payload);
    $('message-input').value = ''; quote = null; annotations.clear(); retryPayload = null;
    renderQuote(); resizeInput(); persist(); $('form-status').textContent = ''; await refresh(); scrollBottom();
    research.spacesChanged();
  } catch (error) {
    $('form-status').textContent = `${error.message} 입력 내용은 유지됩니다.`; persist();
  } finally { sending = false; $('send').disabled = false; }
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
  event.stopPropagation(); const menu = $('space-menu');
  if (menu.classList.toggle('hidden')) return;
  renderMenu((await json('/api/spaces')).items || []);
});
$('btn-links').addEventListener('click', event => { event.stopPropagation(); renderLinks(); $('links-menu').classList.toggle('hidden'); });
document.addEventListener('click', event => {
  if (!$('space-dd').contains(event.target)) $('space-menu').classList.add('hidden');
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
  if (!doc || space || new URL(location.href).searchParams.get('space')) return;
  const found = (await json(`/api/spaces?collected_id=${encodeURIComponent(doc.id)}`)).items || [];
  if (found.length && !space) await open(found[0].id);
}
window.addEventListener('research:doc', event => follow(event.detail));
window.addEventListener('research:layout', event => {
  $('layout-seg').querySelectorAll('[data-layout]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.layout === event.detail)));
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && space) refresh(); });

renderQuote(); resizeInput();
const wanted = new URL(location.href).searchParams.get('space');
if (wanted) open(wanted); else { renderHeader(); follow(research.current()); }
window.dispatchEvent(new CustomEvent('research:layout', { detail: localStorage.getItem('layout') || 'split' }));
