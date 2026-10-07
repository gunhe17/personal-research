import { annotationUI } from './annotations.js';
import { el, fmt, playground } from './playground.js';

const $ = id => document.getElementById(id);
const KEY = 'asked-draft';
let cache = {};
try { cache = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
let asked = null, sending = false, timer = null;
let quote = cache.quote || '', activeContext = cache.context || null, retryPayload = cache.retryPayload || null;
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

function renderAnswer(answer) {
  const article = el('article', 'assistant-message'); article.dataset.answerId = answer.id; article.append(author());
  const content = el('div', 'article-content');
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
  article.append(content);
  const actions = el('div', 'message-actions');
  actions.append(button('이 답변에 질문하기', 'quiet', () => {
    quote = answer.rich.title; activeContext = { ...(activeContext || {}), source_answer_id: answer.id };
    renderQuote(); persist(); $('message-input').focus();
  }), button('복사', 'quiet', async () => {
    try { await navigator.clipboard.writeText(answer.body); $('form-status').textContent = '답변을 복사했습니다.'; }
    catch (_) { $('form-status').textContent = '답변을 드래그해 복사해 주세요.'; }
  }));
  article.append(actions);
  return article;
}

function renderQuestion(question) {
  const root = el('section', 'exchange'); root.dataset.questionId = question.id;
  const user = el('div', 'user-message'); user.append(el('div', 'user-label', '나'));
  const c = question.context || {};
  if (c.selected_text) user.append(el('blockquote', '', c.selected_text));
  (c.annotations || []).forEach((a, i) => {
    const tag = el('details', 'sent-annotation'); tag.append(el('summary', '', `${i + 1}. ${a.text.slice(0, 80)}`));
    tag.append(el('blockquote', '', a.text)); if (a.comment) tag.append(el('p', '', a.comment)); user.append(tag);
  });
  user.append(el('div', 'user-body', question.body));
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
  const hash = JSON.stringify([question.status, question.error, asked.codex_available]);
  if (entry.hash === hash) return;
  entry.hash = hash; entry.status.replaceChildren(); entry.status.className = 'job-status';
  if (question.status === 'completed') return;
  if (['queued', 'running'].includes(question.status)) {
    entry.status.append(el('span', 'thinking-dot'), el('span', '', question.status === 'queued' ? '차례를 기다리고 있습니다.' : '설명을 작성하고 있습니다.'), button('중지', 'quiet', () => action('cancel', question.id)));
    return;
  }
  entry.status.classList.add('error');
  entry.status.append(el('span', '', question.error || (question.status === 'cancelled' ? '답변 생성을 중지했습니다.' : '답변을 받지 못했습니다.')));
  if (asked.codex_available) entry.status.append(button('다시 시도', 'quiet', () => action('retry', question.id)));
}

function renderMessages() {
  const nearBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 400;
  let added = false;
  for (const message of asked.messages) {
    if (message.role === 'user') {
      const entry = threads.get(message.id) || (added = true, renderQuestion(message));
      renderStatus(message, entry);
    } else if (!rendered.has(message.id)) {
      const parent = threads.get(message.question_id)?.answers || $('messages');
      parent.append(renderAnswer(message)); rendered.add(message.id); added = true;
    }
  }
  if (added && rendered.size > 1) { if (nearBottom) scrollBottom(); else $('jump-bottom').hidden = false; }
}

function restoreScene(c) {
  const candidates = [...playgrounds.entries()].filter(([key]) => !c.source_answer_id || key.startsWith(c.source_answer_id));
  const found = candidates.find(([, pg]) => pg.dataset.mode === c.mode) || candidates[0];
  if (found) { found[1].restore(c); found[1].scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  activeContext = { ...c }; persist();
}
function renderQuote() { $('quote-box').hidden = !quote; $('quote-text').textContent = quote; }
function scrollBottom() { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); $('jump-bottom').hidden = true; }
function base() { return `/api/asked/${encodeURIComponent(asked.id)}`; }

async function refresh() {
  try {
    const response = await fetch(base(), { cache: 'no-store' });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    asked = data; $('error-banner').hidden = data.codex_available;
    if (!data.codex_available) $('error-banner').textContent = '서버에서 codex CLI 를 찾지 못했습니다. 컨테이너에서 codex login --device-auth 를 확인해 주세요.';
    renderMessages(); annotations.paint();
  } catch (_) {
    $('error-banner').hidden = false; $('error-banner').textContent = '서버와 연결되지 않았습니다. 입력 중인 내용은 유지됩니다.';
  }
  clearTimeout(timer);
  if (asked?.messages.some(m => ['queued', 'running'].includes(m.status))) timer = setTimeout(refresh, 1500);
}

async function post(route, payload) {
  const response = await fetch(`${base()}/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || '요청을 처리하지 못했습니다.');
  return result;
}
async function action(type, id) { try { await post(type, { message_id: id }); await refresh(); } catch (error) { $('form-status').textContent = error.message; } }

async function send(event) {
  event?.preventDefault();
  const text = $('message-input').value.trim() || (annotations.items.length ? '첨부한 주석을 확인하고 설명해줘.' : '');
  if (!text || !asked || sending) return;
  const payload = retryPayload?.body === text ? retryPayload : {
    client_id: crypto.randomUUID(), body: text,
    kind: /^(\/next|next|go|다음)$/i.test(text) ? 'next' : /인출/.test(text) ? 'retrieval' : 'question',
    context: { ...(activeContext || {}), selected_text: quote, annotations: annotations.items.map(a => ({ ...a })) },
  };
  retryPayload = payload; sending = true; $('send').disabled = true; persist(); $('form-status').textContent = '보내는 중…';
  try {
    await post('messages', payload);
    $('message-input').value = ''; quote = ''; annotations.clear(); retryPayload = null;
    renderQuote(); resizeInput(); persist(); $('form-status').textContent = ''; await refresh(); scrollBottom();
  } catch (error) {
    $('form-status').textContent = `${error.message} 입력 내용은 유지됩니다.`; persist();
  } finally { sending = false; $('send').disabled = false; }
}
function resizeInput() { const input = $('message-input'); input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 180)}px`; }

async function start() {
  const wanted = new URLSearchParams(location.search).get('id');
  const list = (await (await fetch('/api/asked')).json()).items || [];
  const id = wanted || list[0]?.id;
  if (!id) { $('error-banner').hidden = false; $('error-banner').textContent = '아직 학습이 없습니다.'; return; }
  asked = { id };
  const first = await (await fetch(base())).json();
  document.title = `${first.title} · Research`; $('asked-title').textContent = first.title;
  await refresh();
}

$('message-input').value = cache.draft || '';
$('message-input').addEventListener('input', () => { resizeInput(); persist(); });
$('message-input').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); send(); } });
$('composer').addEventListener('submit', send);
$('jump-bottom').addEventListener('click', scrollBottom);
$('clear-quote').addEventListener('click', () => { quote = ''; renderQuote(); persist(); });
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection(), text = selection?.toString().trim(), anchor = selection?.anchorNode?.parentElement;
  if (text && anchor && $('messages').contains(anchor)) {
    selectionText = text.slice(0, 2000); selectionAnswer = anchor.closest('[data-answer-id]')?.dataset.answerId || null; $('quote-selection').hidden = false;
  } else if (!text) $('quote-selection').hidden = true;
});
$('quote-selection').addEventListener('pointerdown', event => event.preventDefault());
$('quote-selection').addEventListener('click', () => {
  const candidate = annotations.capture(window.getSelection()); if (candidate) annotations.add(candidate);
  quote = selectionText; if (selectionAnswer) activeContext = { ...(activeContext || {}), source_answer_id: selectionAnswer };
  renderQuote(); persist(); $('quote-selection').hidden = true; $('message-input').focus();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && asked) refresh(); });
window.addEventListener('scroll', () => { if (innerHeight + scrollY >= document.documentElement.scrollHeight - 350) $('jump-bottom').hidden = true; }, { passive: true });
renderQuote(); resizeInput(); start();
