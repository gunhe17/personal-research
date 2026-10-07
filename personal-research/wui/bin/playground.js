export function el(tag, cls = '', text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function fmt(n, digits = 4) {
  if (Math.abs(n) < 1e-10) n = 0;
  return Number(n.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits }).replace('-', '−');
}
const NS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => n.setAttribute(key, value));
  if (text !== undefined) n.textContent = text;
  return n;
}
function button(text, fn) { const n = el('button', '', text); n.type = 'button'; n.addEventListener('click', fn); return n; }
let counter = 0;

export function playground(config, onContext, key) {
  const mode = config.mode || 'derivative';
  const x = config.x ?? 2, y = config.y ?? 6;
  let w = config.w ?? 2, h = config.h ?? .1, lr = config.learning_rate ?? .05;
  let zoom = mode === 'rate' || mode === 'derivative';
  try {
    const cached = JSON.parse(localStorage.getItem(`pg:${key}`) || 'null');
    if (cached && Number.isFinite(cached.w) && Math.abs(cached.w) <= 10 && Number.isFinite(cached.h) && Math.abs(cached.h) >= .001 && Math.abs(cached.h) <= 1) {
      w = cached.w; h = cached.h; zoom = Boolean(cached.zoom);
      if (Number.isFinite(cached.lr) && cached.lr >= .001 && cached.lr <= .3) lr = cached.lr;
    }
  } catch (_) {}
  const hasSecant = mode === 'rate' || mode === 'derivative';
  const hasTangent = mode === 'derivative' || mode === 'descent';
  const loss = (v) => (x * v - y) ** 2;
  const grad = (v) => 2 * x * (x * v - y);
  const average = () => grad(w) + x * x * h;
  const root = el('section', 'playground');
  root.dataset.mode = mode;
  root.setAttribute('aria-label', `${{ loss: '손실', rate: '변화율', derivative: '미분', descent: '학습률' }[mode]} 그래프 실험`);
  const header = el('div', 'playground-header');
  const label = el('p'); label.append(el('span', 'playground-label', 'PLAYGROUND'), document.createTextNode(`x=${fmt(x)}, y=${fmt(y)} · L(w) = (xw − y)²`));
  const tools = el('div', 'pg-tools');
  const toggle = button('', () => { zoom = !zoom; update(true); });
  tools.append(toggle, button('초기화 ↺', () => { w = config.w ?? 2; h = config.h ?? .1; update(true); }));
  header.append(label, tools); root.append(header);
  const metrics = el('div', 'pg-metrics');
  const outputs = {};
  for (const [name, title] of [['prediction', '예측'], ['loss', '손실'], ['slope', '미분값']]) {
    if (name === 'slope' && !hasTangent) continue;
    const box = el('div', `pg-metric ${name}`), output = el('strong');
    output.dataset.metric = name;
    box.append(el('span', '', title), output); metrics.append(box); outputs[name] = output;
  }
  root.append(metrics);
  const chart = svg('svg', { class: 'pg-chart', role: 'img', viewBox: '0 0 720 330' });
  root.append(chart);
  const legend = el('div', 'pg-legend');
  for (const [cls, title, show] of [['', '손실 곡선', true], ['secant', '두 점의 할선', hasSecant], ['tangent', '한 점의 접선', hasTangent]]) {
    if (show) { const item = el('span'); item.append(el('i', cls), document.createTextNode(title)); legend.append(item); }
  }
  root.append(legend);
  const controls = el('div', 'pg-controls');
  const wc = el('div', 'pg-control'), wl = el('label', '', '파라미터 w');
  const wn = el('input'); wn.type = 'number'; wn.min = '-10'; wn.max = '10'; wn.step = '.01'; wn.setAttribute('aria-label', '파라미터 w 직접 입력');
  wl.append(wn);
  const ws = el('input'); ws.type = 'range'; ws.min = '-10'; ws.max = '10'; ws.step = '.01'; ws.setAttribute('aria-label', '파라미터 w');
  const wr = el('div', 'pg-range-labels'); wr.append(el('span', '', '−10'), el('span', '', '학습으로 바꾸는 값'), el('span', '', '10'));
  wc.append(wl, ws, wr); controls.append(wc);
  const hc = el('div', 'pg-control'), hl = el('label', '', '두 점의 간격 |h|'), ho = el('output'); hl.append(ho);
  const hs = el('input'); hs.type = 'range'; hs.min = '-3'; hs.max = '0'; hs.step = '.01'; hs.setAttribute('aria-label', '변화 폭');
  const hr = el('div', 'pg-range-labels'); hr.append(el('span', '', '0.001 · 가까이'), el('span', '', '1 · 멀리'));
  const presets = el('div', 'pg-presets');
  for (const v of [.5, .1, .01, .001]) { const b = button(String(v), () => { h = v * (h < 0 ? -1 : 1); update(true); }); b.dataset.h = String(v); presets.append(b); }
  const nl = el('label'), negative = el('input'); negative.type = 'checkbox'; nl.append(negative, document.createTextNode('왼쪽 접근')); presets.append(nl);
  hc.append(hl, hs, hr, presets); hc.hidden = !hasSecant; controls.append(hc); root.append(controls);
  const result = el('div', 'pg-result'); root.append(result);
  const descent = el('div', 'pg-descent');
  const lri = el('input'); lri.type = 'number'; lri.min = '.001'; lri.max = '.3'; lri.step = '.001'; lri.value = String(lr); lri.setAttribute('aria-label', '학습률');
  if (mode === 'descent') {
    descent.append(el('span', '', '학습률'), lri, button('한 번 학습하기 →', () => {
      const next = w - lr * grad(w);
      if (Math.abs(next) > 10) { caption.textContent = '다음 값이 그래프의 조절 범위를 벗어납니다. 학습률을 줄여 보세요.'; return; }
      w = next; update(true);
    })); root.append(descent);
  }
  const caption = el('p', 'pg-caption'); root.append(caption);
  const ask = button('이 장면으로 질문하기 ↗', () => { emit(); document.getElementById('message-input').focus(); }); ask.className = 'quiet'; root.append(ask);
  function emit() {
    onContext({ w, h, x, y, mode, learning_rate: lr, view: zoom ? 'zoom' : 'full', show_secant: hasSecant, show_tangent: hasTangent, key });
  }
  function update(notify = false) {
    if (document.activeElement !== wn) wn.value = String(Number(w.toFixed(6)));
    ws.value = String(w); hs.value = String(Math.log10(Math.abs(h))); ho.textContent = fmt(Math.abs(h)); negative.checked = h < 0;
    outputs.prediction.textContent = fmt(x * w); outputs.loss.textContent = fmt(loss(w));
    if (outputs.slope) outputs.slope.textContent = fmt(grad(w));
    toggle.textContent = zoom ? '전체 곡선 ↗' : '현재 위치 확대 ↗';
    presets.querySelectorAll('[data-h]').forEach(b => b.classList.toggle('active', Math.abs(Number(b.dataset.h) - Math.abs(h)) < 1e-8));
    result.replaceChildren();
    if (hasSecant) {
      result.append(document.createTextNode(`가로 변화 ${fmt(h)} · 세로 변화 ${fmt(average() * h, 6)}\n평균 변화율 = `), el('strong', '', fmt(average(), 5)));
      result.dataset.rate = String(average());
    } else if (mode === 'descent') {
      result.append(document.createTextNode(`다음 w = ${fmt(w)} − ${fmt(lr)} × (${fmt(grad(w))}) = `), el('strong', '', fmt(w - lr * grad(w))));
    } else result.append(document.createTextNode(`예측 ${fmt(x * w)} − 정답 ${fmt(y)} = 오차 ${fmt(x * w - y)}. 이 오차를 제곱하면 손실 `), el('strong', '', fmt(loss(w))));
    caption.textContent = hasTangent ? '접선은 현재 점 근처의 변화 방향을 보여줍니다. 기울기는 이동할 거리 자체가 아니에요.' : hasSecant ? 'h를 0에 가깝게 줄이며 두 점을 잇는 직선의 기울기를 관찰해 보세요.' : '곡선의 높이가 손실입니다. 파라미터를 바꿔 더 낮은 곳을 찾아보세요.';
    try { localStorage.setItem(`pg:${key}`, JSON.stringify({ w, h, zoom, lr })); } catch (_) {}
    draw(); if (notify) emit();
  }
  function ticks(lo, hi, count) {
    const rough = (hi - lo) / count, scale = 10 ** Math.floor(Math.log10(rough)), fraction = rough / scale;
    const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * scale;
    const a = []; for (let v = Math.ceil(lo / step) * step; v <= hi + step / 100; v += step) a.push(v); return a;
  }
  const clipID = `clip-${++counter}`;
  function draw() {
    const compact = chart.getBoundingClientRect().width < 500, width = compact ? 460 : 720;
    chart.setAttribute('viewBox', `0 0 ${width} 330`);
    chart.replaceChildren(svg('title', {}, `w=${fmt(w)}, 손실=${fmt(loss(w))}, 기울기=${fmt(grad(w))}`));
    const pad = { l: 52, r: width - 20, t: 20, b: 281 }, target = y / x;
    const span = Math.max(Math.abs(h), .12);
    const low = zoom ? Math.min(w, w + h) - span * .5 : Math.min(target - 2, w - .5, w + h - .25);
    const high = zoom ? Math.max(w, w + h) + span * .5 : Math.max(target + 2, w + .5, w + h + .25);
    const samples = Array.from({ length: 160 }, (_, i) => low + (high - low) * i / 159);
    const values = samples.map(loss);
    let bottom = zoom ? Math.min(...values) : 0, top = Math.max(...values);
    const extra = Math.max((top - bottom) * .13, .04); bottom -= extra * .4; top += extra;
    const X = v => pad.l + (v - low) / (high - low) * (pad.r - pad.l);
    const Y = v => pad.b - (v - bottom) / (top - bottom) * (pad.b - pad.t);
    const defs = svg('defs'), clip = svg('clipPath', { id: clipID }); clip.append(svg('rect', { x: pad.l, y: pad.t, width: pad.r - pad.l, height: pad.b - pad.t })); defs.append(clip); chart.append(defs);
    for (const v of ticks(bottom, top, 4)) { chart.append(svg('line', { x1: pad.l, x2: pad.r, y1: Y(v), y2: Y(v), stroke: '#e8e8ed' }), svg('text', { x: pad.l - 9, y: Y(v) + 4, 'text-anchor': 'end' }, fmt(v, 3))); }
    for (const v of ticks(low, high, compact ? 4 : 6)) { chart.append(svg('line', { x1: X(v), x2: X(v), y1: pad.t, y2: pad.b, stroke: '#f0f0f3' }), svg('text', { x: X(v), y: pad.b + 20, 'text-anchor': 'middle' }, fmt(v, 3))); }
    chart.append(svg('text', { x: pad.l, y: 12, class: 'axis-label' }, '손실 L(w)'), svg('text', { x: (pad.l + pad.r) / 2, y: 325, 'text-anchor': 'middle', class: 'axis-label' }, '파라미터 w'));
    const group = svg('g', { 'clip-path': `url(#${clipID})` });
    group.append(svg('path', { d: samples.map((v, i) => `${i ? 'L' : 'M'}${X(v)},${Y(loss(v))}`).join(' '), fill: 'none', stroke: '#0071e3', 'stroke-width': 3 }));
    for (const [show, slope, color, dash] of [[hasTangent, grad(w), '#8e5bd0', '3 5'], [hasSecant, average(), '#d9822b', '7 5']]) if (show) group.append(svg('line', { x1: X(low), x2: X(high), y1: Y(loss(w) + slope * (low - w)), y2: Y(loss(w) + slope * (high - w)), stroke: color, 'stroke-width': 2.3, 'stroke-dasharray': dash }));
    if (hasSecant) group.append(svg('circle', { cx: X(w + h), cy: Y(loss(w + h)), r: 5, fill: '#d9822b', stroke: '#ffffff', 'stroke-width': 2 }));
    group.append(svg('circle', { cx: X(w), cy: Y(loss(w)), r: 6, fill: '#0071e3', stroke: '#ffffff', 'stroke-width': 2.5 }), svg('text', { x: Math.min(pad.r - 105, X(w) + 10), y: Math.max(pad.t + 15, Y(loss(w)) - 13), class: 'point-label' }, `w = ${fmt(w, 2)}`));
    chart.append(group);
  }
  ws.addEventListener('input', () => { w = Number(ws.value); update(true); });
  wn.addEventListener('change', () => { if (Number.isFinite(wn.valueAsNumber)) w = Math.max(-10, Math.min(10, wn.valueAsNumber)); wn.value = String(w); update(true); });
  hs.addEventListener('input', () => { h = (h < 0 ? -1 : 1) * 10 ** Number(hs.value); update(true); });
  negative.addEventListener('change', () => { h = Math.abs(h) * (negative.checked ? -1 : 1); update(true); });
  lri.addEventListener('change', () => { if (Number.isFinite(lri.valueAsNumber)) lr = Math.max(.001, Math.min(.3, lri.valueAsNumber)); lri.value = String(lr); update(true); });
  const observer = new ResizeObserver(draw); observer.observe(root);
  root.dispose = () => observer.disconnect();
  root.restore = (context) => { w = context.w; h = context.h; lr = context.learning_rate ?? lr; lri.value = String(lr); zoom = context.view === 'zoom'; update(true); };
  root.getContext = () => ({ w, h, x, y, mode, learning_rate: lr, view: zoom ? 'zoom' : 'full', show_secant: hasSecant, show_tangent: hasTangent, key });
  update(); return root;
}
