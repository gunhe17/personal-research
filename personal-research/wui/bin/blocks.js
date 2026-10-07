import { el, playground } from './playground.js';

export function inline(node, text) {
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).forEach(piece => {
    if (piece.startsWith('**') && piece.endsWith('**')) node.append(el('strong', '', piece.slice(2, -2)));
    else if (piece.startsWith('`') && piece.endsWith('`')) node.append(el('code', '', piece.slice(1, -1)));
    else node.append(document.createTextNode(piece));
  });
}

export function paragraph(parent, text, cls = '') {
  const pieces = text.split(/`{2,3}[a-z]*\s*([\s\S]*?)`{2,3}/);
  let last = null;
  pieces.forEach((piece, index) => {
    if (index % 2) { parent.append(el('pre', 'code-block', piece.trim())); return; }
    if (!piece.trim()) return;
    last = el('p', cls); inline(last, piece.trim()); parent.append(last);
  });
  return last || parent;
}

export function blocks(content, rich, { key, onContext, playgrounds }) {
  content.append(el('h2', '', rich.title));
  rich.blocks.forEach((block, index) => {
    if (block.kind === 'playground' && block.playground) {
      const id = `${key}:${index}`;
      const pg = playground(block.playground, onContext, id);
      playgrounds?.set(id, pg); content.append(pg); if (block.text) paragraph(pg, block.text, 'pg-task');
    } else if (block.kind === 'heading') content.append(el('h3', '', block.text));
    else if (block.kind === 'formula') content.append(el('div', 'formula', block.text));
    else if (block.kind === 'code') content.append(el('pre', 'code-block', block.text));
    else if (block.kind === 'bullet') { const list = el('ul'), item = el('li'); inline(item, block.text); list.append(item); content.append(list); }
    else paragraph(content, block.text);
  });
  if (rich.follow_up) paragraph(content, rich.follow_up, 'article-followup');
}
