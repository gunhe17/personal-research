const $ = (s) => document.querySelector(s);
const KEY = "workbench";
const LIMIT = 4;
const ICON = window.RESEARCH_ICON;
const itemKey = window.itemKey;
const root = $("#workbench");
const frames = new Map();
let state = load();
let last = { doc: null, chat: null, space: null };
let drag = null;

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved?.groups?.length) return saved;
  } catch (_) {}
  return { groups: [], focus: 0, direction: "row" };
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
}

// source
function source(item) {
  if (item.kind === "chat") {
    const params = new URLSearchParams({ space: item.space });
    if (item.conversation) params.set("conversation", item.conversation);
    if (item.conversation === "") params.set("new", "1");
    return `/viewer/pane-chat?${params}`;
  }
  if (item.kind === "agent") return `/viewer/pane-chat?agent=${encodeURIComponent(item.agent)}`;
  if (item.kind === "doc") return `/viewer/pane-doc?doc=${encodeURIComponent(item.id)}`;
  return `/viewer/pane-material?id=${encodeURIComponent(item.id)}`;
}

function kindIcon(item) {
  const name = item.kind === "doc" ? (item.path || "docs/").split("/")[0] : item.kind === "material" ? item.material || "lesson" : "chat";
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON[name] || ICON.docs}</svg>`;
}

function frameFor(group, item) {
  const id = `${group.id}|${itemKey(item)}`;
  let frame = frames.get(id);
  if (!frame) {
    frame = document.createElement("iframe");
    frame.className = "pane-frame";
    frame.src = source(item);
    frame.title = item.title || "";
    frames.set(id, frame);
  }
  frame.dataset.group = group.id;
  frame.dataset.key = itemKey(item);
  return frame;
}

// command
async function open(item, options = {}) {
  item = { ...item };
  if (item.kind === "doc" && !item.path) {
    const meta = await fetch(`/api/meta?id=${encodeURIComponent(item.id)}`).then((r) => r.json()).catch(() => ({}));
    item.path = meta.path || "";
    item.title = item.title || (meta.path || item.id).split("/").pop();
  }
  let index = options.group ?? state.focus;
  if (options.beside) {
    const from = state.groups.findIndex((g) => g.id === options.beside.dataset.group);
    if (state.groups.length > 1) index = from === state.groups.length - 1 ? from - 1 : from + 1;
    else return split(item, Math.max(from, 0), "right");
  }
  if (!state.groups.length) state.groups.push(group());
  index = Math.min(Math.max(index, 0), state.groups.length - 1);
  add(state.groups[index], item);
  state.focus = index;
  commit();
}

function group() {
  return { id: Math.random().toString(36).slice(2, 10), tabs: [], active: "" };
}

function add(target, item) {
  const key = itemKey(item);
  if (!target.tabs.some((t) => itemKey(t) === key)) target.tabs.push(item);
  target.active = key;
}

function split(item, index, side) {
  if (state.groups.length >= LIMIT) {
    add(state.groups[index], item);
    state.focus = index;
    return commit();
  }
  if (state.groups.length < 2) state.direction = side === "top" || side === "bottom" ? "column" : "row";
  const created = group();
  add(created, item);
  const at = side === "left" || side === "top" ? index : index + 1;
  state.groups.splice(at, 0, created);
  state.focus = at;
  commit();
}

function close(groupIndex, key) {
  const target = state.groups[groupIndex];
  const position = target.tabs.findIndex((t) => itemKey(t) === key);
  if (position < 0) return;
  target.tabs.splice(position, 1);
  frames.get(`${target.id}|${key}`)?.remove();
  frames.delete(`${target.id}|${key}`);
  if (target.active === key) target.active = target.tabs[Math.max(0, position - 1)] ? itemKey(target.tabs[Math.max(0, position - 1)]) : "";
  if (!target.tabs.length && state.groups.length > 1) {
    state.groups.splice(groupIndex, 1);
    state.focus = Math.min(state.focus, state.groups.length - 1);
  }
  commit();
}

function move(fromGroup, key, toGroup, side) {
  const from = state.groups.find((g) => g.id === fromGroup);
  const item = from?.tabs.find((t) => itemKey(t) === key);
  if (!item) return;
  const toIndex = state.groups.findIndex((g) => g.id === toGroup);
  const sameGroup = from.id === toGroup;
  if (side === "center" && sameGroup) return;
  if (side !== "center" && sameGroup && from.tabs.length === 1) return;
  close(state.groups.indexOf(from), key);
  const index = state.groups.findIndex((g) => g.id === toGroup);
  if (side === "center") return open(item, { group: index < 0 ? toIndex : index });
  split(item, index < 0 ? Math.min(toIndex, state.groups.length - 1) : index, side);
}

function commit() {
  save();
  render();
  window.research?.renderTree?.();
}

// render
function render() {
  root.dataset.count = String(state.groups.length);
  root.dataset.direction = state.direction;
  if (!state.groups.length || state.groups.every((g) => !g.tabs.length)) {
    root.innerHTML = `
      <div class="welcome">
        <p class="welcome-title">personal-research</p>
      </div>`;
    attachDrop(root.querySelector(".welcome"), null);
    return;
  }
  const kept = new Set();
  root.querySelector(".welcome")?.remove();
  state.groups.forEach((g, index) => {
    let element = root.querySelector(`[data-group-id="${g.id}"]`);
    if (!element) {
      element = document.createElement("section");
      element.className = "group";
      element.dataset.groupId = g.id;
      element.innerHTML = `<div class="tabs" role="tablist"></div><div class="body"><div class="shield"></div><div class="drop"></div></div>`;
      element.addEventListener("pointerdown", () => { if (state.focus !== index) { state.focus = state.groups.indexOf(g); save(); paintFocus(); window.research?.renderTree?.(); } }, true);
      attachDrop(element.querySelector(".body"), g.id);
    }
    if (root.children[index] !== element) root.insertBefore(element, root.children[index] || null);
    kept.add(g.id);
    element.classList.toggle("focused", index === state.focus);
    renderTabs(element.querySelector(".tabs"), g, index);
    const body = element.querySelector(".body");
    g.tabs.forEach((item) => {
      const frame = frameFor(g, item);
      if (frame.parentElement !== body) body.insertBefore(frame, body.querySelector(".shield"));
      frame.hidden = itemKey(item) !== g.active;
      if (!frame.hidden && item.kind === "chat") last.chat = frame;
      if (!frame.hidden && index === state.focus && item.space) last.space = item.space;
    });
  });
  root.querySelectorAll("[data-group-id]").forEach((element) => {
    if (!kept.has(element.dataset.groupId)) element.remove();
  });
}

function renderTabs(bar, g, index) {
  bar.replaceChildren(...g.tabs.map((item) => {
    const key = itemKey(item);
    const tab = document.createElement("div");
    tab.className = `tab ${key === g.active ? "active" : ""}`;
    tab.setAttribute("role", "tab");
    tab.draggable = true;
    tab.title = item.path || item.title || "";
    tab.innerHTML = `<span class="tab-icon">${kindIcon(item)}</span><span class="tab-title"></span><button type="button" class="tab-close" aria-label="닫기">×</button>`;
    tab.querySelector(".tab-title").textContent = item.title || "새 대화";
    tab.addEventListener("click", (e) => {
      if (e.target.closest(".tab-close")) return close(index, key);
      g.active = key;
      state.focus = index;
      commit();
    });
    tab.addEventListener("auxclick", (e) => { if (e.button === 1) close(index, key); });
    tab.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("application/x-research-tab", JSON.stringify({ group: g.id, key }));
      e.dataTransfer.effectAllowed = "move";
      startDrag();
    });
    return tab;
  }));
}

function paintFocus() {
  root.querySelectorAll("[data-group-id]").forEach((element) => {
    element.classList.toggle("focused", state.groups[state.focus]?.id === element.dataset.groupId);
  });
}

// drop
function startDrag() {
  drag = true;
  root.classList.add("dragging");
}

function endDrag() {
  drag = null;
  root.classList.remove("dragging");
  root.querySelectorAll(".drop").forEach((d) => (d.dataset.side = ""));
}

function zone(element, event) {
  const rect = element.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const full = state.groups.length >= LIMIT;
  if (!full && x < 0.25) return "left";
  if (!full && x > 0.75) return "right";
  if (!full && y < 0.25) return "top";
  if (!full && y > 0.75) return "bottom";
  return "center";
}

function attachDrop(element, groupId) {
  element.addEventListener("dragover", (e) => {
    if (![...e.dataTransfer.types].some((t) => t.startsWith("application/x-research"))) return;
    e.preventDefault();
    const overlay = element.querySelector(".drop");
    if (overlay) overlay.dataset.side = groupId ? zone(element, e) : "center";
  });
  element.addEventListener("dragleave", (e) => {
    if (!element.contains(e.relatedTarget)) { const overlay = element.querySelector(".drop"); if (overlay) overlay.dataset.side = ""; }
  });
  element.addEventListener("drop", (e) => {
    e.preventDefault();
    const side = groupId ? zone(element, e) : "center";
    const index = groupId ? state.groups.findIndex((g) => g.id === groupId) : 0;
    const tab = e.dataTransfer.getData("application/x-research-tab");
    const item = e.dataTransfer.getData("application/x-research");
    endDrag();
    if (tab) { const { group: from, key } = JSON.parse(tab); return move(from, key, groupId || from, side); }
    if (!item) return;
    if (side === "center") open(JSON.parse(item), { group: index });
    else split(JSON.parse(item), index, side);
  });
}

window.addEventListener("dragstart", (e) => { if (e.target.closest?.("#sidebar")) startDrag(); });
window.addEventListener("dragend", endDrag);
window.addEventListener("drop", () => setTimeout(endDrag));

// bridge
function locate(frame) {
  for (const [i, g] of state.groups.entries()) {
    const item = g.tabs.find((t) => itemKey(t) === frame?.dataset.key && g.id === frame?.dataset.group);
    if (item) return { group: g, index: i, item };
  }
  return null;
}

window.workbench = {
  open,
  lastDoc: () => last.doc,
  activeKey: () => state.groups[state.focus]?.active || "",
  activeSpace: () => last.space,
  titled(frame, info) {
    const found = locate(frame);
    if (!found) return;
    const { group: g, item } = found;
    const before = itemKey(item);
    Object.assign(item, Object.fromEntries(Object.entries(info).filter(([k, v]) => k === "title" || (v && item.kind !== "doc" && item.kind !== "material"))));
    if (item.kind === "chat" && info.kind === "agent") { item.kind = "agent"; item.agent = info.agent; }
    const after = itemKey(item);
    if (after !== before) {
      frames.set(`${g.id}|${after}`, frame);
      frames.delete(`${g.id}|${before}`);
      frame.dataset.key = after;
      if (g.active === before) g.active = after;
    }
    commit();
  },
  viewed(frame, detail) {
    last.doc = detail;
    root.querySelectorAll('iframe[src*="pane-chat"]').forEach((f) => f.contentWindow?.dispatchEvent(new CustomEvent("research:doc", { detail })));
  },
  quote(detail) {
    const target = last.chat && document.body.contains(last.chat) ? last.chat : [...root.querySelectorAll("iframe")].find((f) => f.src.includes("pane-chat"));
    if (!target) return window.research?.toast?.("인용을 받을 대화를 먼저 여세요");
    const found = locate(target);
    if (found) { found.group.active = found.item && itemKey(found.item); state.focus = found.index; commit(); }
    target.contentWindow.dispatchEvent(new CustomEvent("research:quote", { detail }));
  },
};

// start
function initial() {
  const params = new URLSearchParams(location.search);
  const items = [];
  if (params.get("open")) { try { items.push(JSON.parse(params.get("open"))); } catch (_) {} }
  if (params.get("agent")) items.push({ kind: "agent", agent: params.get("agent"), title: "Agent" });
  if (params.get("space")) items.push({ kind: "chat", space: params.get("space"), conversation: params.get("new") ? "" : params.get("conversation") || null, title: "대화" });
  if (params.get("material")) items.push({ kind: "material", id: params.get("material") });
  if (params.get("doc")) items.push({ kind: "doc", id: params.get("doc") });
  if (items.length) history.replaceState(null, "", location.pathname);
  return items;
}

render();
for (const [i, item] of initial().entries()) {
  if (i === 0) await open(item);
  else await open(item, { beside: [...root.querySelectorAll("iframe")].find((f) => f.dataset.key === state.groups[state.focus].active) });
}
