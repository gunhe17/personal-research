export function annotationUI({ initial = [], changed }) {
  let items = initial, activeId = null, originalComment = null;
  const panel = document.getElementById('annotation-editor');
  const input = document.getElementById('annotation-comment');
  const list = document.getElementById('annotation-list');
  const chip = document.getElementById('annotation-count');
  const markers = document.getElementById('annotation-markers');
  const source = id => [...document.querySelectorAll('[data-answer-id]')].find(n => n.dataset.answerId === id)?.querySelector('.article-content');
  function capture(selection) {
    if (!selection?.rangeCount || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0), node = range.startContainer;
    const article = (node.nodeType === 1 ? node : node.parentElement).closest('.assistant-message');
    const root = article?.querySelector('.article-content');
    if (!root || !root.contains(range.endContainer) || !root.contains(range.startContainer)) return null;
    const before = range.cloneRange(); before.selectNodeContents(root); before.setEnd(range.startContainer, range.startOffset);
    const text = range.toString();
    if (!text.trim() || text.length > 2000) return null;
    return { source_id: article.dataset.answerId, start: before.toString().length, end: before.toString().length + text.length, text, comment: '' };
  }
  function locate(item) {
    const root = source(item.source_id); if (!root) return null;
    if (root.textContent.slice(item.start, item.end) !== item.text) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), range = document.createRange();
    let pos = 0, start = false, n;
    while ((n = walker.nextNode())) {
      const end = pos + n.length;
      if (!start && item.start >= pos && item.start < end) { range.setStart(n, item.start - pos); start = true; }
      if (start && item.end <= end) { range.setEnd(n, item.end - pos); return range; }
      pos = end;
    }
    return null;
  }
  function placePanel(item) {
    const range = locate(item); if (!range) { panel.hidden = true; return; }
    const rect = range.getBoundingClientRect();
    panel.style.left = `${Math.max(10, Math.min(rect.left, innerWidth - Math.min(360, innerWidth - 20) - 10))}px`;
    panel.style.top = `${Math.max(55, Math.min(rect.top - 64, innerHeight - 270))}px`;
  }
  function edit(item, scroll = false, isNew = false) {
    originalComment = isNew ? null : item.comment;
    activeId = item.id; input.value = item.comment; panel.hidden = false;
    if (scroll) source(item.source_id)?.scrollIntoView({ block: 'center', behavior: 'instant' });
    placePanel(item); input.focus(); paint();
  }
  function paint() {
    markers.replaceChildren(); const ranges = [];
    items.forEach((item, i) => {
      const range = locate(item); if (!range) return; ranges.push(range);
      const rects = range.getClientRects(), rect = rects[rects.length - 1]; if (!rect) return;
      const badge = document.createElement('button'); badge.type = 'button'; badge.className = 'annotation-marker';
      badge.textContent = i + 1; badge.setAttribute('aria-label', `주석 ${i + 1} 수정`);
      badge.style.left = `${Math.max(4, Math.min(innerWidth - 32, rect.right - 10))}px`;
      badge.style.top = `${rect.top + scrollY - 22}px`;
      badge.addEventListener('click', () => edit(item)); markers.append(badge);
    });
    if (globalThis.Highlight && CSS.highlights) CSS.highlights.set('annotations', new Highlight(...ranges));
    if (activeId) { const item = items.find(a => a.id === activeId); if (item) placePanel(item); }
  }
  function render() {
    chip.hidden = !items.length; chip.textContent = `▤ ${items.length} annotation${items.length === 1 ? '' : 's'}`;
    if (!items.length) list.hidden = true;
    list.replaceChildren();
    items.forEach((item, i) => {
      const row = document.createElement('div'); row.className = 'annotation-row';
      const link = document.createElement('button'); link.type = 'button'; link.className = 'annotation-preview';
      link.textContent = `${i + 1}. ${item.text}`; link.addEventListener('click', () => edit(item, true));
      const comment = document.createElement('span'); comment.textContent = item.comment || '코멘트 없음';
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'quiet'; remove.textContent = '×'; remove.setAttribute('aria-label', `주석 ${i + 1} 삭제`);
      remove.addEventListener('click', () => { items = items.filter(a => a.id !== item.id); if (activeId === item.id) close(); render(); changed(); });
      row.append(link, comment, remove); list.append(row);
    }); paint();
  }
  function add(candidate) {
    if (!candidate) return;
    let item = items.find(a => a.source_id === candidate.source_id && a.start === candidate.start && a.end === candidate.end);
    const isNew = !item;
    if (!item) { if (items.length >= 10) return; item = { ...candidate, id: crypto.randomUUID() }; items.push(item); }
    window.getSelection()?.removeAllRanges(); render(); edit(item, false, isNew); changed();
  }
  function cancel() {
    if (!activeId) return;
    const item = items.find(a => a.id === activeId);
    if (originalComment === null) items = items.filter(a => a.id !== activeId);
    else if (item) item.comment = originalComment;
    close(); render(); changed();
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && activeId && !e.isComposing) { e.preventDefault(); cancel(); }
  });
  document.addEventListener('pointerdown', e => {
    if (activeId && !panel.contains(e.target) && !e.target.closest('.annotation-marker')) cancel();
  });
  function close() { activeId = null; panel.hidden = true; }
  input.addEventListener('input', () => { const item = items.find(a => a.id === activeId); if (item) { item.comment = input.value; render(); changed(); } });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); close(); document.getElementById('message-input').focus(); } });
  document.getElementById('annotation-done').addEventListener('click', close);
  chip.addEventListener('click', () => { list.hidden = !list.hidden; });
  document.addEventListener('pointerup', e => { if (e.target.closest('.assistant-message')) { const candidate = capture(window.getSelection()); if (candidate) add(candidate); } });
  window.addEventListener('resize', paint); window.addEventListener('scroll', () => { if (activeId) placePanel(items.find(a => a.id === activeId)); }, { passive: true });
  render();
  return { capture, add, paint, get items() { return items; }, clear() { items = []; close(); render(); } };
}
