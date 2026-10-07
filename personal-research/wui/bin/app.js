    const $ = (s) => document.querySelector(s);
    const on = (s, type, fn, opts) => { const el = $(s); if (el) el.addEventListener(type, fn, opts); };
    const STILL = window.matchMedia("(prefers-reduced-motion: reduce)");

    // 퇴장 애니메이션을 끝까지 보여 준 뒤 감춘다
    function leave(el, name, after) {
      if (!el || el.classList.contains("hidden")) return;
      const done = () => {
        el.classList.remove(name);
        el.classList.add("hidden");
        if (after) after();
      };
      if (STILL.matches) return done();
      el.classList.add(name);
      el.addEventListener("animationend", done, { once: true });
      setTimeout(done, 400);
    }

    function reveal(el, name) {
      if (!el) return;
      el.classList.remove("hidden", `leave-${name}`);
      el.classList.remove(`enter-${name}`);
      void el.offsetWidth;
      el.classList.add(`enter-${name}`);
    }
    const state = {
      sidebarOpen: false,
      sidebarWidth: clampSidebar(parseFloat(localStorage.getItem("sidebarWidth") || "288") || 288),
      resizingSidebar: false,
      layout: localStorage.getItem("layout") || "split",
      spaces: [],
      spacesOpen: localStorage.getItem("spacesOpen") !== "0",
      chatWidthPct: clampChatWidth(parseFloat(localStorage.getItem("chatWidthPct") || "50") || 50),
      tree: [],
      currentPath: null,
      currentId: null,
      view: document.body.dataset.page,
      related: [],
      relatedLoading: false,
      relatedOpen: localStorage.getItem("relatedOpen") !== "0",
      listOpen: localStorage.getItem("listOpen") !== "0",
      homeMode: localStorage.getItem("homeMode") || "ask",
      currentTitle: null,
      currentText: "",
      conversation: null,
      messages: [],
      sending: false,
      lastSelection: "",
      pendingSel: null,
      docLang: localStorage.getItem("docLang") || "orig",
      dlLang: "orig",
      dlFmt: localStorage.getItem("dlFmt") || "md",
      docPair: null,
      pairTexts: null,
      nodeById: new Map(),
      docZoom: clampZoom(parseFloat(localStorage.getItem("docZoom") || "1") || 1),
      chatZoom: clampZoom(parseFloat(localStorage.getItem("chatZoom") || "1") || 1),
      resizingSplit: false,
      docSelRange: null,
    };

    function clampSidebar(px) {
      return Math.min(480, Math.max(200, Math.round(px)));
    }

    function clampChatWidth(pct) {
      return Math.min(70, Math.max(25, Math.round(pct * 10) / 10));
    }

    function clampZoom(z) {
      return Math.min(1.75, Math.max(0.8, Math.round(z * 100) / 100));
    }

    function wireZoomButtons(downId, upId, zoom) {
      const down = $(downId);
      const up = $(upId);
      if (down) {
        down.disabled = zoom <= 0.8;
        down.classList.toggle("opacity-40", zoom <= 0.8);
      }
      if (up) {
        up.disabled = zoom >= 1.75;
        up.classList.toggle("opacity-40", zoom >= 1.75);
      }
    }

    function applyDocZoom() {
      const el = $("#doc-content");
      if (el) el.style.setProperty("--doc-zoom", String(state.docZoom));
      const label = $("#doc-font-label");
      if (label) label.textContent = Math.round(state.docZoom * 100) + "%";
      localStorage.setItem("docZoom", String(state.docZoom));
      wireZoomButtons("#btn-doc-font-down", "#btn-doc-font-up", state.docZoom);
    }

    function applyChatZoom() {
      for (const id of ["#chat-panel", "#home-pane"]) {
        const el = $(id);
        if (el) el.style.setProperty("--chat-zoom", String(state.chatZoom));
      }
      const label = $("#chat-font-label");
      if (label) label.textContent = Math.round(state.chatZoom * 100) + "%";
      localStorage.setItem("chatZoom", String(state.chatZoom));
      wireZoomButtons("#btn-chat-font-down", "#btn-chat-font-up", state.chatZoom);
    }

    function markSettings(open) {
      const btn = $("#btn-settings");
      if (btn) btn.classList.toggle("text-apple", open);
    }

    function openSettings() {
      applyDocZoom();
      applyChatZoom();
      const m = $("#settings-modal");
      m.classList.remove("hidden", "leave-fade");
      m.classList.add("flex");
      markSettings(true);
    }

    function closeSettings() {
      const m = $("#settings-modal");
      leave(m, "leave-fade", () => m.classList.remove("flex"));
      markSettings(false);
    }

    function setDocZoom(z) {
      state.docZoom = clampZoom(z);
      applyDocZoom();
    }

    function setChatZoom(z) {
      state.chatZoom = clampZoom(z);
      applyChatZoom();
    }

    function toast(msg) {
      const el = $("#toast");
      el.textContent = msg;
      el.classList.remove("opacity-0", "translate-y-1");
      el.classList.add("opacity-100", "translate-y-0");
      setTimeout(() => {
        el.classList.add("opacity-0", "translate-y-1");
        el.classList.remove("opacity-100", "translate-y-0");
      }, 2000);
    }

    function uid() {
      return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
    }

    // Sidebar
    function applySidebar() {
      const sb = $("#sidebar");
      const rz = $("#sidebar-resizer");
      if (state.sidebarOpen) {
        sb.style.width = state.sidebarWidth + "px";
        sb.style.opacity = "1";
      } else {
        sb.style.width = "0px";
        sb.style.opacity = "0";
      }
      const navBtn = $("#btn-toggle-sidebar");
      if (navBtn) navBtn.classList.toggle("text-apple", state.sidebarOpen);
      if (rz) rz.style.display = state.sidebarOpen ? "" : "none";
      $("#sidebar-scrim")?.classList.toggle("hidden", !state.sidebarOpen);
      localStorage.setItem("sidebarWidth", String(state.sidebarWidth));
    }

    function renderTreeNodes(nodes, depth = 0) {
      const frag = document.createDocumentFragment();
      for (const n of nodes) {
        if (n.type === "dir") {
          const wrap = document.createElement("div");
          wrap.className = "mb-0.5";
          const row = document.createElement("button");
          row.type = "button";
          row.className = "w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-slate-700 hover:bg-slate-50 transition duration-150";
          row.style.paddingLeft = `${8 + depth * 12}px`;
          const open = n._open !== false;
          row.innerHTML = `
            <span class="inline-block w-3 text-slate-500 text-[13px] leading-none transition-transform ${open ? "rotate-90" : ""}">›</span>
            <span class="truncate font-medium text-slate-800">${escapeHtml(n.name)}</span>`;
          const kids = document.createElement("div");
          kids.className = open ? "" : "hidden";
          kids.appendChild(renderTreeNodes(n.children || [], depth + 1));
          row.addEventListener("click", () => {
            n._open = !(n._open !== false);
            renderTree();
          });
          wrap.appendChild(row);
          wrap.appendChild(kids);
          frag.appendChild(wrap);
        } else {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.style.paddingLeft = `${8 + depth * 12 + 14}px`;
          const active = state.currentId === n.id;
          btn.className = active
            ? "w-full rounded-lg px-2 py-1.5 text-left text-sm bg-apple text-white font-medium mb-0.5 transition duration-150"
            : "w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50 mb-0.5 transition duration-150";
          btn.innerHTML = `<span class="truncate block">${escapeHtml(n.name)}</span>`;
          btn.title = n.path;
          btn.addEventListener("click", () => {
            openFile(n.id);
            if (window.matchMedia("(max-width: 767px)").matches) {
              state.sidebarOpen = false;
              applySidebar();
            }
          });
          frag.appendChild(btn);
        }
      }
      return frag;
    }

    function sectionLabel(name, { open, onToggle, count, action } = {}) {
      const el = document.createElement("div");
      el.className = "flex items-center gap-1 px-2 pt-3 pb-1";
      const head = document.createElement("button");
      head.type = "button";
      head.className = "flex min-w-0 flex-1 items-center gap-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600 transition duration-150";
      head.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             class="h-2.5 w-2.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}"><path d="M6 9l6 6 6-6" /></svg>
        <span class="truncate">${escapeHtml(name)}</span>
        ${count ? `<span class="font-mono text-[10px] tabular-nums text-slate-300">${count}</span>` : ""}`;
      if (onToggle) head.addEventListener("click", onToggle);
      el.appendChild(head);
      if (action) el.appendChild(action);
      return el;
    }

    function toggleSection(key) {
      const flag = { related: "relatedOpen", spaces: "spacesOpen" }[key] || "listOpen";
      state[flag] = !state[flag];
      localStorage.setItem(flag, state[flag] ? "1" : "0");
      renderTree();
    }

    function collapseButton() {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = "Collapse all";
      btn.className = "h-5 w-5 inline-flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition duration-150";
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
        <path d="M7 20l5-5 5 5" /><path d="M7 4l5 5 5-5" /></svg>`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        collapseAllDirs(state.tree);
        renderTree();
      });
      return btn;
    }

    function sinceLabel(iso) {
      if (!iso) return "";
      const then = new Date(iso);
      if (isNaN(then)) return "";
      const minutes = Math.floor((Date.now() - then.getTime()) / 60000);
      if (minutes < 1) return "just now";
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }

    function sidebarRow({ label, active, icon, onClick, indent = 8, title, meta }) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.paddingLeft = `${indent}px`;
      btn.className = active
        ? "w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm bg-apple text-white font-medium mb-0.5 transition duration-150"
        : "w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50 mb-0.5 transition duration-150";
      btn.innerHTML = `${icon || ""}<span class="truncate block flex-1 min-w-0">${escapeHtml(label)}</span>${
        meta ? `<span class="shrink-0 text-[10px] ${active ? "text-white/70" : "text-slate-400"}">${escapeHtml(meta)}</span>` : ""
      }`;
      if (title) btn.title = title;
      btn.addEventListener("click", onClick);
      return btn;
    }

    const HOME_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0">
      <path d="M3 11.5L12 3l9 8.5" /><path d="M5.5 10v10h13V10" /></svg>`;

    const COLLECTED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0">
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z" /></svg>`;

    const SKELETON_WIDTHS = ["72%", "58%", "81%", "64%", "49%"];

    function relatedSkeleton() {
      const box = document.createElement("div");
      box.className = "animate-pulse";
      box.innerHTML = SKELETON_WIDTHS.map((width) => `
        <div class="flex items-center gap-2 px-2 py-[7px]">
          <span class="h-2 rounded-full bg-slate-100" style="width: ${width}"></span>
        </div>`).join("");
      return box;
    }

    function renderTree() {
      const tree = $("#tree");
      tree.innerHTML = "";
      tree.appendChild(sidebarRow({
        label: "Home",
        active: state.view === "home",
        icon: HOME_ICON,
        onClick: () => openHome(),
      }));
      tree.appendChild(sidebarRow({
        label: "Collected",
        active: state.view === "collected",
        icon: COLLECTED_ICON,
        onClick: () => openCollected(),
      }));
      const spaces = document.createElement("div");
      spaces.className = "ml-3 border-l border-slate-100 pl-1";
      tree.appendChild(spaces);
      spaces.appendChild(sectionLabel("Spaces", {
        open: state.spacesOpen,
        count: state.spaces.length,
        onToggle: () => toggleSection("spaces"),
      }));
      if (state.spacesOpen) {
        for (const item of state.spaces.slice(0, 12)) {
          spaces.appendChild(sidebarRow({
            label: item.title,
            active: new URLSearchParams(location.search).get("space") === item.id,
            title: item.title,
            meta: sinceLabel(item.updated_at),
            onClick: () => { location.href = `${COLLECTED_URL}?space=${encodeURIComponent(item.id)}`; },
          }));
        }
      }

      const under = document.createElement("div");
      under.className = "ml-3 border-l border-slate-100 pl-1";
      tree.appendChild(under);

      if (state.relatedLoading || state.related.length) {
        under.appendChild(sectionLabel("Related", {
          open: state.relatedOpen,
          count: state.relatedLoading ? "" : state.related.length,
          onToggle: () => toggleSection("related"),
        }));
      }
      if (state.relatedLoading && state.relatedOpen) {
        under.appendChild(relatedSkeleton());
      } else if (state.related.length && state.relatedOpen) {
        for (const item of state.related.slice(0, 5)) {
          under.appendChild(sidebarRow({
            label: item.path.split("/").pop(),
            active: state.currentId === item.id,
            title: item.path,
            meta: sinceLabel(item.opened_at),
            onClick: () => openFile(item.id),
          }));
        }
      }

      under.appendChild(sectionLabel("List", {
        open: state.listOpen,
        onToggle: () => toggleSection("list"),
        action: state.listOpen ? collapseButton() : null,
      }));
      if (!state.listOpen) return;
      if (!state.tree.length) {
        under.insertAdjacentHTML("beforeend", `<div class="px-2 py-2 text-xs text-slate-500">Nothing collected, or the server is unreachable</div>`);
        return;
      }
      under.appendChild(renderTreeNodes(state.tree));
    }

    let relatedFor;
    let relatedSeq = 0;

    async function loadRelated(id) {
      if (relatedFor === id) return;
      const seq = ++relatedSeq;
      state.relatedLoading = true;
      renderTree();
      try {
        const res = await fetch("/api/related" + (id ? "?id=" + encodeURIComponent(id) : ""));
        if (!res.ok) return;
        const items = (await res.json()).items || [];
        if (seq !== relatedSeq) return;
        state.related = items;
      } catch {
        if (seq !== relatedSeq) return;
        state.related = [];
      }
      if (seq !== relatedSeq) return;
      relatedFor = id;
      state.relatedLoading = false;
      renderTree();
    }

    function collapseAllDirs(nodes) {
      for (const n of nodes) {
        if (n.type !== "dir") continue;
        n._open = false;
        collapseAllDirs(n.children || []);
      }
    }

    async function loadTree() {
      const res = await fetch("/api/tree");
      if (!res.ok) throw new Error("tree failed");
      const data = await res.json();
      state.tree = data.tree || [];
      collapseAllDirs(state.tree);
      state.nodeById = new Map();
      (function collect(nodes) {
        for (const n of nodes) {
          if (n.type === "dir") collect(n.children || []);
          else {
            state.nodeById.set(n.id, n);
          }
        }
      })(state.tree);
      renderTree();
    }

    // i18n
    function translationOf(id) {
      const node = state.nodeById.get(id);
      if (!node || !/\.(md|markdown|mdx)$/i.test(node.path)) return null;
      return node.languages.includes("kor") ? { orig: "eng", trans: "kor" } : null;
    }

    async function fetchMeta(id) {
      try {
        const res = await fetch("/api/meta?id=" + encodeURIComponent(id));
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    }

    function sourceLine() {
      const src = state.currentMeta && state.currentMeta.url;
      if (!src) return "";
      return `<p class="enter-fade mb-4 text-[12px] text-slate-500 break-all">Source <a href="${escapeHtml(src)}" target="_blank" rel="noopener" class="text-apple-link hover:underline">${escapeHtml(src)}</a></p>`;
    }

    async function fetchFile(id, language) {
      const res = await fetch("/api/file?id=" + encodeURIComponent(id) + "&language=" + language);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }

    function rawUrl(id, language) {
      return "/api/raw?id=" + encodeURIComponent(id) + "&language=" + language;
    }

    function splitSentences(text) {
      return (text || "").match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];
    }

    function interleaveMd(orig, trans) {
      const strip = (tokens) => tokens.filter((t) => t.type !== "space");
      const a = strip(marked.lexer(orig || ""));
      const b = strip(marked.lexer(trans || ""));
      let html = "";
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const pa = a[i], pb = b[i];
        const differs = pa && pb && pb.raw.trim() !== pa.raw.trim();
        if (differs && pa.type === "paragraph" && pb.type === "paragraph") {
          const sa = splitSentences(pa.raw.trim());
          const sb = splitSentences(pb.raw.trim());
          if (sa.length === sb.length) {
            html += `<div class="il-pair">` + sa.map((s, k) =>
              `<p class="il-s-orig">${marked.parseInline(s.trim())}</p>` +
              `<p class="il-s-trans">${marked.parseInline(sb[k].trim())}</p>`
            ).join("") + `</div>`;
            continue;
          }
        }
        if (pa) html += `<div class="il-orig">${marked.parser([pa])}</div>`;
        if (pb && (!pa || differs)) {
          html += `<div class="il-trans">${marked.parser([pb])}</div>`;
        }
      }
      return html;
    }

    function setDocLang(lang) {
      state.docLang = lang;
      localStorage.setItem("docLang", lang);
      return renderDoc({ preserveScroll: true });
    }

    function updateLangbar() {
      const bar = $("#doc-langbar");
      const show = state.view === "collected" && !!state.docPair;
      bar.classList.toggle("hidden", !show);
      if (!show) return;
      bar.querySelectorAll(".seg-btn").forEach((b) => {
        b.setAttribute("aria-selected", b.dataset.lang === state.docLang ? "true" : "false");
      });
    }

    // #
    // home


    const HOME_URL = "/viewer/";

    async function loadSpaces() {
      try {
        state.spaces = (await (await fetch("/api/spaces")).json()).items || [];
      } catch (_) {
        state.spaces = [];
      }
      renderTree();
    }
    const COLLECTED_URL = "/viewer/collected";

    function openCollected() {
      const last = state.currentId || localStorage.getItem("lastDoc");
      location.href = last ? `${COLLECTED_URL}?doc=${encodeURIComponent(last)}` : COLLECTED_URL;
    }

    function openHome() {
      location.href = HOME_URL;
    }

    function applyHomeMode() {
      if (!$("#home-input")) return;
      const ask = state.homeMode === "ask";
      $("#home-mode-label").textContent = state.homeMode;
      $("#home-mode-menu")?.querySelectorAll("[data-home-mode]").forEach((b) => {
        b.setAttribute("aria-selected", String(b.dataset.homeMode === state.homeMode));
      });
      $("#home-input").placeholder = ask ? "Ask anything" : "Paste a URL…";
      localStorage.setItem("homeMode", state.homeMode);
    }

    function setHomeModeOpen(open) {
      if (!$("#home-mode-menu")) return;
      const menu = $("#home-mode-menu");
      if (open) reveal(menu, "pop");
      else leave(menu, "leave-pop");
      $("#home-mode-btn")?.setAttribute("aria-expanded", String(open));
    }

    function setHomeMode(mode) {
      state.homeMode = mode;
      applyHomeMode();
      setHomeModeOpen(false);
      $("#home-input")?.focus();
    }

    function autoResizeHome() {
      const ta = $("#home-input");
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = Math.min(240, Math.max(34, ta.scrollHeight)) + "px";
    }

    async function runHome() {
      if (!$("#home-input")) return;
      const box = $("#home-input");
      const value = box.value.trim();
      if (!value || state.sending) return;
      const collecting = state.homeMode === "collect";
      if (collecting && !/^https?:\/\//i.test(value) && !/^\d{4}\.\d{4,5}/.test(value)) {
        toast("Give a URL or an arXiv id");
        return;
      }
      if (!collecting) {
        try {
          const res = await fetch("/api/agent/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: value, client_id: uid() }),
          });
          const created = await res.json();
          if (!res.ok) throw new Error(created.error);
          localStorage.setItem("layout", "chat");
          location.href = `${COLLECTED_URL}?agent=${encodeURIComponent(created.id)}`;
        } catch (e) {
          toast(`Could not start the chat: ${e.message || e}`);
        }
        return;
      }
      box.value = "";
      autoResizeHome();

      state.messages.push({ role: "user", content: value, mode: state.homeMode });
      const assistant = { role: "assistant", content: "", streaming: true };
      state.messages.push(assistant);
      renderMessages();
      setSending(true);

      try {
        const res = await fetch("/api/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: value }),
        });
        if (!res.ok || !res.body) throw new Error(await res.text());
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let answered = false;
        for (;;) {
          const { value: chunk, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(chunk, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (raw === "[DONE]") continue;
            let ev;
            try { ev = JSON.parse(raw); } catch { continue; }
            if (ev.type === "step") {
              assistant.steps = assistant.steps || [];
              const now = performance.now();
              const at = assistant.steps.findIndex((s) => s.key === ev.key);
              if (at >= 0) {
                const was = assistant.steps[at];
                assistant.steps[at] = { ...was, text: ev.text, state: ev.state || "running", took: now - was.at };
              } else {
                assistant.steps.push({ key: ev.key, text: ev.text, state: ev.state || "running", at: now, took: null });
              }
            } else if (ev.type === "terms") {
              assistant.note = `Keywords ${ev.terms.join(", ")}`;
            } else if (ev.type === "hits") {
              assistant.sources = ev.hits;
              state.related = ev.hits;
              state.relatedLoading = false;
              relatedFor = "ask";
              relatedSeq += 1;
              renderTree();
            } else if (ev.type === "collected") {
              assistant.sources = [{ id: ev.id, path: ev.path }];
            } else if (ev.type === "delta") {
              if (!answered) { answered = true; assistant.content = ""; }
              assistant.content += ev.text;
            } else if (ev.type === "done") {
              if (ev.text) assistant.content = ev.text;
              if (ev.id && !assistant.sources) assistant.sources = [{ id: ev.id, path: state.nodeById.get(ev.id)?.path || ev.id }];
            } else if (ev.type === "error") {
              assistant.content = (assistant.content ? assistant.content + "\n\n" : "") + `Error: ${ev.error}`;
            }
            renderMessages();
          }
        }
      } catch (e) {
        assistant.content = `Error: ${e.message || e}`;
      }
      assistant.streaming = false;
      setSending(false);
      renderMessages();
      loadTree();
    }

    async function renderDoc(opts = {}) {
      if (state.view !== "collected" || !$("#doc-content")) return;
      const { preserveScroll = false } = opts;
      const pair = state.docPair;
      const lang = pair ? state.docLang : "orig";
      if (pair && lang !== "orig" && state.pairTexts.trans == null) {
        try {
          state.pairTexts.trans = (await fetchFile(state.currentId, "kor")).content;
        } catch (e) {
          toast("Could not load the translation");
          state.docLang = "orig";
          return renderDoc(opts);
        }
      }
      marked.setOptions({ gfm: true, breaks: false });
      const isMd = /\.(md|markdown|mdx)$/i.test(state.currentPath);
      clearActiveDocSelection();
      let inner;
      if (/\.html?$/i.test(state.currentPath)) {
        const hasKor = !!state.docPair;
        inner = `
          <div class="enter-fade text-center py-24">
            <p class="text-[21px] font-semibold tracking-tight text-slate-800 break-all px-6">${escapeHtml(state.currentTitle || "")}</p>
            <p class="mt-2 text-[14px] font-light text-slate-500">An HTML document with its original typesetting. Opens as is in a new tab.</p>
            <div class="mt-6 flex items-center justify-center gap-2">
              <a href="${rawUrl(state.currentId, "eng")}" target="_blank" rel="noopener"
                 class="rounded-full bg-apple px-4 py-1.5 text-sm text-white hover:bg-apple-hover transition duration-150">Open original</a>
              ${hasKor ? `<a href="${rawUrl(state.currentId, "kor")}" target="_blank" rel="noopener"
                 class="rounded-full border border-apple-link px-4 py-1.5 text-sm text-apple-link hover:bg-apple-link/5 transition duration-150">Open Korean</a>` : ""}
            </div>
          </div>`;
      } else if (!isMd) {
        inner = `<pre class="raw-doc enter-fade whitespace-pre-wrap font-mono text-slate-800 bg-white rounded-xl p-4">${escapeHtml(state.pairTexts.orig)}</pre>`;
      } else if (lang === "trans") {
        inner = `<div class="prose-doc enter-fade">${marked.parse(state.pairTexts.trans)}</div>`;
      } else if (lang === "both") {
        inner = `<div class="prose-doc enter-fade">${interleaveMd(state.pairTexts.orig, state.pairTexts.trans)}</div>`;
      } else {
        inner = `<div class="prose-doc enter-fade">${marked.parse(state.pairTexts.orig)}</div>`;
      }
      state.currentText = lang === "trans" ? state.pairTexts.trans : state.pairTexts.orig;
      $("#doc-content").innerHTML = sourceLine() + inner;
      updateLangbar();
      updateDownload();
      if (!preserveScroll) $("#doc-scroll").scrollTop = 0;
    }

    async function openFile(id, opts = {}) {
      if (state.view !== "collected") {
        location.href = `${COLLECTED_URL}?doc=${encodeURIComponent(id)}`;
        return true;
      }
      const { skipIfSame = false, preserveScroll = false } = opts;
      const node = state.nodeById.get(id);
      if (!node) return false;
      if (skipIfSame && state.currentId === id && state.currentText) return true;

      state.currentId = id;
      state.currentPath = node.path;
      state.currentTitle = node.name;
      state.docPair = translationOf(id);
      state.docLang = state.docPair ? state.docLang : "orig";
      state.pairTexts = { orig: null, trans: null };
      localStorage.setItem("lastDoc", id);
      if (state.layout === "chat") setLayout("split");
      window.dispatchEvent(new CustomEvent("research:doc", { detail: { id, path: node.path } }));

      const url = new URL(location.href);
      url.searchParams.set("doc", id);
      history.replaceState(null, "", url);

      state.relatedLoading = true;
      renderTree();
      try {
        const [data, meta] = await Promise.all([fetchFile(id, "eng"), fetchMeta(id)]);
        state.pairTexts.orig = data.content;
        state.currentMeta = meta;
      } catch (e) {
        toast("Could not load the document");
        return false;
      }
      await renderDoc({ preserveScroll });
      updateDownload();
      const seq = ++relatedSeq;
      fetch("/api/opened", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data || seq !== relatedSeq) return;
          state.related = data.related || [];
          relatedFor = id;
        })
        .catch(() => {})
        .finally(() => {
          if (seq !== relatedSeq) return;
          state.relatedLoading = false;
          renderTree();
        });

      return true;
    }

    let scrollSaveTimer = null;

    function saveDocScroll() {
      clearTimeout(scrollSaveTimer);
      scrollSaveTimer = setTimeout(() => {
        if (!state.currentPath) return;
        try {
          sessionStorage.setItem("docScroll:" + state.currentPath, String(Math.round($("#doc-scroll")?.scrollTop)));
        } catch (_) {}
      }, 150);
    }

    function restoreDocScroll(path) {
      let y = 0;
      try {
        y = parseFloat(sessionStorage.getItem("docScroll:" + path) || "0") || 0;
      } catch (_) {}
      if (!y) return;
      const el = $("#doc-scroll");
      let userMoved = false;
      el.addEventListener("wheel", () => (userMoved = true), { once: true, passive: true });
      el.addEventListener("touchstart", () => (userMoved = true), { once: true, passive: true });
      const apply = () => {
        if (!userMoved) el.scrollTop = y;
      };
      requestAnimationFrame(apply);
      $("#doc-content")?.querySelectorAll("img").forEach((img) => {
        if (!img.complete) img.addEventListener("load", apply, { once: true });
      });
    }

    async function openDocFromUrl() {
      if (state.view === "home") {
        applyHomeMode();
        autoResizeHome();
        if (!state.related.length) loadRelated(null);
        setTimeout(() => $("#home-input")?.focus(), 60);
        return;
      }
      const doc = new URLSearchParams(location.search).get("doc") || localStorage.getItem("lastDoc");
      if (doc && state.nodeById.has(doc)) {
        if (await openFile(doc)) restoreDocScroll(doc);
        return;
      }
      $("#doc-content").innerHTML = `
        <div class="enter-fade py-24 text-center">
          <p class="text-[21px] font-semibold tracking-tight text-slate-800">Collected</p>
          <p class="mt-2 text-[15px] font-light text-slate-500">Pick a document from Related or List.</p>
        </div>`;
      loadRelated(null);
    }

    function findTextRangeInDoc(needle) {
      const root = $("#doc-content");
      if (!root || !needle) return null;
      const target = String(needle).replace(/\s+/g, " ").trim();
      if (!target) return null;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      const parts = [];
      let full = "";
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const value = node.nodeValue || "";
        if (!value) continue;
        parts.push({ node, start: full.length, raw: value });
        full += value;
      }
      let norm = "";
      const normToOrig = [];
      let prevSpace = false;
      for (let i = 0; i < full.length; i++) {
        const ch = full[i];
        const isSpace = /\s/.test(ch);
        if (isSpace) {
          if (!prevSpace && norm.length > 0) {
            norm += " ";
            normToOrig.push(i);
          }
          prevSpace = true;
        } else {
          norm += ch;
          normToOrig.push(i);
          prevSpace = false;
        }
      }
      norm = norm.trim();
      let normFull = "";
      const map2 = [];
      prevSpace = true;
      for (let i = 0; i < full.length; i++) {
        const ch = full[i];
        const isSpace = /\s/.test(ch);
        if (isSpace) {
          if (!prevSpace) {
            normFull += " ";
            map2.push(i);
          }
          prevSpace = true;
        } else {
          normFull += ch;
          map2.push(i);
          prevSpace = false;
        }
      }
      const nq = target;
      let idx = normFull.indexOf(nq);
      if (idx < 0 && nq.length > 80) {
        idx = normFull.indexOf(nq.slice(0, 80));
      }
      if (idx < 0) return null;
      const origStart = map2[idx];
      const origEnd = map2[Math.min(idx + nq.length - 1, map2.length - 1)] + 1;
      if (origStart == null || origEnd == null) return null;

      function pointAt(offset) {
        for (const p of parts) {
          const end = p.start + p.raw.length;
          if (offset <= end) {
            return { node: p.node, offset: Math.max(0, offset - p.start) };
          }
        }
        const last = parts[parts.length - 1];
        return last ? { node: last.node, offset: last.raw.length } : null;
      }
      const a = pointAt(origStart);
      const b = pointAt(origEnd);
      if (!a || !b) return null;
      try {
        const range = document.createRange();
        range.setStart(a.node, Math.min(a.offset, a.node.nodeValue.length));
        range.setEnd(b.node, Math.min(b.offset, b.node.nodeValue.length));
        return range;
      } catch (_) {
        return null;
      }
    }

    function scrollRangeIntoDocView(range) {
      if (!range) return;
      try {
        const rect = range.getBoundingClientRect();
        const scroller = $("#doc-scroll");
        if (!scroller) return;
        const sRect = scroller.getBoundingClientRect();
        const delta = rect.top - sRect.top - sRect.height * 0.25;
        scroller.scrollBy({ top: delta, behavior: "smooth" });
      } catch (_) {}
    }

    async function openCitation(path, text) {
      if (!path && !text) return;
      if (path) {
        const ok = await openFile(path, { skipIfSame: true, preserveScroll: true });
        if (!ok) {
          toast("Documents could not be opened");
          return;
        }
      }
      requestAnimationFrame(() => {
        const range = text ? findTextRangeInDoc(text) : null;
        if (range) {
          setActiveDocSelection(range);
          scrollRangeIntoDocView(range);
          toast("Jumped to the quote");
        } else if (path) {
          clearActiveDocSelection();
          toast("Documents opened, but the passage was not found");
        } else {
          toast("The quote has no document");
        }
      });
    }

    function decodeCiteAttr(v) {
      if (!v) return "";
      try {
        return decodeURIComponent(v);
      } catch (_) {
        return v;
      }
    }

    // Selection / Citations
    const supportsCssHighlight =
      typeof CSS !== "undefined" && CSS.highlights && typeof Highlight !== "undefined";

    function unwrapDocSelMarks(root) {
      const scope = root || document;
      scope.querySelectorAll("mark.doc-active-sel").forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent) return;
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
        parent.normalize && parent.normalize();
      });
    }

    function clearActiveDocSelection() {
      state.docSelRange = null;
      hideSelBar();
      if (supportsCssHighlight) {
        try {
          CSS.highlights.delete("doc-active-sel");
        } catch (_) {}
      }
      unwrapDocSelMarks($("#doc-content") || document);
    }

    function wrapRangeWithMarks(range) {
      const docRoot = $("#doc-content");
      if (!docRoot || !range || range.collapsed) return;
      try {
        if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
          const mark = document.createElement("mark");
          mark.className = "doc-active-sel";
          range.surroundContents(mark);
          return;
        }
      } catch (_) {
      }
      const walker = document.createTreeWalker(docRoot, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          try {
            return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          } catch (_) {
            return NodeFilter.FILTER_REJECT;
          }
        },
      });
      const texts = [];
      while (walker.nextNode()) texts.push(walker.currentNode);
      for (const textNode of texts) {
        let start = 0;
        let end = textNode.nodeValue.length;
        if (textNode === range.startContainer) start = range.startOffset;
        if (textNode === range.endContainer) end = range.endOffset;
        if (start >= end) continue;
        const sub = document.createRange();
        sub.setStart(textNode, start);
        sub.setEnd(textNode, end);
        try {
          const mark = document.createElement("mark");
          mark.className = "doc-active-sel";
          sub.surroundContents(mark);
        } catch (_) {
        }
      }
    }

    function setActiveDocSelection(range) {
      clearActiveDocSelection();
      if (!range || range.collapsed) return;
      const docRoot = $("#doc-content");
      if (!docRoot) return;
      const common = range.commonAncestorContainer;
      if (!docRoot.contains(common.nodeType === Node.ELEMENT_NODE ? common : common.parentNode)) return;

      state.docSelRange = range.cloneRange();
      if (supportsCssHighlight) {
        try {
          CSS.highlights.set("doc-active-sel", new Highlight(state.docSelRange));
          return;
        } catch (_) {
        }
      }
      wrapRangeWithMarks(state.docSelRange.cloneRange());
    }

    function onDocMouseUp(e) {
      const sel = window.getSelection();
      const text = (sel && sel.toString() || "").trim();
      if (!state.currentPath) return;

      if (!text || !sel || !sel.rangeCount) return;
      const anchor = sel.anchorNode;
      if (!anchor || !$("#doc-content")?.contains(anchor)) return;
      if (text.length < 2) return;

      const range = sel.getRangeAt(0).cloneRange();
      state.lastSelection = text;
      state.pendingSel = { text, range, multi: !!e.shiftKey };
      showSelBar(range);
    }

    function showSelBar(range) {
      const bar = $("#sel-bar");
      bar.classList.remove("hidden");
      bar.classList.add("flex");
      const r = range.getClientRects()[0] || range.getBoundingClientRect();
      const w = bar.offsetWidth;
      const h = bar.offsetHeight;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
      const top = Math.max(8, r.top - h - 4);
      bar.style.left = left + "px";
      bar.style.top = top + "px";
    }

    function hideSelBar() {
      const bar = $("#sel-bar");
      leave(bar, "leave-pop");
      bar.classList.remove("flex");
      state.pendingSel = null;
    }

    function citePendingSel() {
      const p = state.pendingSel;
      if (!p) return;
      setActiveDocSelection(p.range);
      try {
        window.getSelection().removeAllRanges();
      } catch (_) {}
      hideSelBar();
      addCitation(p.text, p.multi);
    }

    async function copyPendingSel() {
      const p = state.pendingSel;
      if (!p) return;
      try {
        await navigator.clipboard.writeText(p.text);
      } catch (_) {
        document.execCommand("copy");
      }
      hideSelBar();
      toast("Copied");
    }

    function addCitation(text) {
      window.dispatchEvent(new CustomEvent("research:quote", { detail: { text, path: state.currentPath || "", id: state.currentId } }));
      if (state.layout === "doc") setLayout("split");
      toast("Quoted");
    }

    // Chat split layout
    function applyChatSplit() {
      const panel = $("#chat-panel");
      const resizer = $("#split-resizer");
      const navBtn = $("#btn-toggle-chat");
      if (!panel || !resizer) {
        if (navBtn) {
          navBtn.classList.add("text-apple");
          navBtn.disabled = true;
          navBtn.title = "Home is the chat";
        }
        return;
      }
      const chat = state.layout === "chat";
      const open = state.layout !== "doc";
      $("#doc-pane").style.display = chat ? "none" : "";
      if (open) {
        panel.classList.remove("hidden", "leave-panel");
        panel.style.display = "flex";
        panel.style.width = chat ? "100%" : state.chatWidthPct + "%";
        panel.style.flex = chat ? "1 1 auto" : "";
        resizer.style.display = chat ? "none" : "";
      } else if (panel.style.display !== "none") {
        closePanel(panel, resizer);
      }
      if (navBtn) navBtn.classList.toggle("text-apple", open);
      localStorage.setItem("layout", state.layout);
      localStorage.setItem("chatWidthPct", String(state.chatWidthPct));
      window.dispatchEvent(new CustomEvent("research:layout", { detail: state.layout }));
    }

    function setLayout(layout) {
      state.layout = layout;
      applyChatSplit();
    }

    function closePanel(panel, resizer) {
      const done = () => {
        panel.classList.remove("leave-panel");
        panel.style.display = "none";
        resizer.style.display = "none";
      };
      if (STILL.matches) return done();
      panel.classList.add("leave-panel");
      panel.addEventListener("animationend", done, { once: true });
      setTimeout(done, 400);
    }

    function openChat(open) {
      if (!$("#chat-panel")) return;
      const want = open !== undefined ? open : state.layout === "doc";
      if (want === (state.layout !== "doc")) return;
      setLayout(want ? "split" : "doc");
      if (want) setTimeout(() => $("#message-input")?.focus(), 100);
    }

    function initSidebarResizer() {
      const rz = $("#sidebar-resizer");
      const onMove = (e) => {
        if (!state.resizingSidebar) return;
        state.sidebarWidth = clampSidebar(e.clientX - $("#sidebar").getBoundingClientRect().left);
        applySidebar();
      };
      const onUp = () => {
        if (!state.resizingSidebar) return;
        state.resizingSidebar = false;
        $("#sidebar").style.transition = "";
        document.body.classList.remove("cursor-col-resize");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      rz.addEventListener("mousedown", (e) => {
        e.preventDefault();
        state.resizingSidebar = true;
        $("#sidebar").style.transition = "none";
        document.body.classList.add("cursor-col-resize");
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
      rz.addEventListener("dblclick", () => {
        state.sidebarWidth = 288;
        applySidebar();
      });
    }

    function initSplitResizer() {
      const resizer = $("#split-resizer");
      if (!resizer) return;
      const workspace = $("#workspace");
      let startX = 0;
      let startPct = 50;

      const onMove = (e) => {
        if (!state.resizingSplit) return;
        const rect = workspace.getBoundingClientRect();
        if (rect.width <= 0) return;
        const dx = e.clientX - startX;
        const deltaPct = (dx / rect.width) * 100;
        state.chatWidthPct = clampChatWidth(startPct - deltaPct);
        applyChatSplit();
      };
      const onUp = () => {
        if (!state.resizingSplit) return;
        state.resizingSplit = false;
        document.body.classList.remove("cursor-col-resize");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      resizer.addEventListener("mousedown", (e) => {
        if (state.layout !== "split") return;
        e.preventDefault();
        state.resizingSplit = true;
        startX = e.clientX;
        startPct = state.chatWidthPct;
        document.body.classList.add("cursor-col-resize");
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });

      resizer.addEventListener("dblclick", () => {
        state.chatWidthPct = 50;
        applyChatSplit();
      });
    }

    const STEP_MARK = {
      running: `<span class="breathe block h-[7px] w-[7px] rounded-full bg-apple"></span>`,
      done: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="h-[11px] w-[11px] text-slate-400"><path d="M4 12.5l5 5L20 6.5" /></svg>`,
      skip: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" class="h-[11px] w-[11px] text-slate-300"><path d="M5 12h14" /></svg>`,
      error: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" class="h-[11px] w-[11px] text-red-500"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>`,
    };

    function stepDuration(took) {
      if (took == null || took < 1000) return "";
      return `${(took / 1000).toFixed(1)}s`;
    }

    function stepsHtml(steps) {
      return `<div class="mb-2">${steps.map((s, i) => {
        const last = i === steps.length - 1;
        const tone = s.state === "skip" ? "text-slate-400" : s.state === "running" ? "" : "text-slate-500";
        return `
        <div class="enter-pop relative flex gap-2.5 ${last ? "" : "pb-2.5"}">
          ${last ? "" : `<span class="absolute left-[5px] top-[15px] bottom-0 w-px bg-slate-200"></span>`}
          <span class="relative z-10 mt-[4px] flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-full bg-white">${STEP_MARK[s.state] || STEP_MARK.running}</span>
          <span class="min-w-0 flex-1 text-[12px] ${tone} ${s.state === "running" ? "sweep" : ""}">${escapeHtml(s.text)}</span>
          <span class="shrink-0 pt-px font-mono text-[10px] tabular-nums text-slate-300">${stepDuration(s.took)}</span>
        </div>`;
      }).join("")}</div>`;
    }

    function renderChatMarkdown(src) {
      marked.setOptions({ gfm: true, breaks: true });
      let html = "";
      try {
        html = marked.parse(src || "");
      } catch (_) {
        html = `<p>${escapeHtml(src || "")}</p>`;
      }
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      wrap.querySelectorAll("table").forEach((table) => {
        if (table.parentElement && table.parentElement.classList.contains("md-table-wrap")) return;
        const scroller = document.createElement("div");
        scroller.className = "md-table-wrap";
        table.parentNode.insertBefore(scroller, table);
        scroller.appendChild(table);
      });
      wrap.querySelectorAll("p").forEach((p) => {
        if (!p.textContent.trim() && !p.querySelector("img,br")) p.remove();
      });
      return wrap.innerHTML;
    }

    function bindCiteButtons(root) {
      root.querySelectorAll(".cite-open").forEach((btn) => {
        btn.addEventListener("click", () => {
          openCitation(decodeCiteAttr(btn.dataset.citePath), decodeCiteAttr(btn.dataset.citeText));
        });
      });
    }

    function citeChipsHtml(cites, variant) {
      if (!cites || !cites.length) return "";
      if (variant === "user") {
        return `<div class="mb-2 space-y-1">${cites
          .map(
            (c) =>
              `<button type="button" class="cite-open block w-full rounded-lg bg-slate-800/90 px-2 py-1.5 text-[10px] text-slate-100 border border-slate-600/80 hover:bg-slate-700" title="Open the original document" data-cite-path="${encodeURIComponent(c.path || "")}" data-cite-text="${encodeURIComponent(c.text || "")}"><span class="font-mono text-slate-400">${escapeHtml(c.path || "")}</span><div class="line-clamp-2 text-slate-50 text-left mt-0.5">${escapeHtml(c.text)}</div></button>`
          )
          .join("")}</div>`;
      }
      return `<div class="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
        <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Quoted source</div>
        ${cites
          .map(
            (c, i) =>
              `<button type="button" class="cite-open flex w-full items-start gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-left text-[11px] hover:bg-slate-100" title="Open the original document" data-cite-path="${encodeURIComponent(c.path || "")}" data-cite-text="${encodeURIComponent(c.text || "")}">
                <span class="shrink-0 font-mono font-semibold text-slate-500">#${i + 1}</span>
                <span class="min-w-0 flex-1">
                  <span class="block font-mono text-[10px] text-slate-400 truncate">${escapeHtml(c.path || "")}</span>
                  <span class="line-clamp-2 text-slate-700">${escapeHtml(c.text || "")}</span>
                </span>
              </button>`
          )
          .join("")}
      </div>`;
    }

    function messageBox() {
      return state.view === "home" ? $("#home-messages") : $("#messages");
    }

    function renderMessages() {
      const home = state.view === "home";
      const box = messageBox();
      if (home) {
        const any = state.messages.length > 0;
        $("#home-messages")?.classList.toggle("hidden", !any);
        $("#home-title")?.classList.toggle("hidden", any);
        $("#home-inner")?.classList.toggle("justify-center", !any);
        box.innerHTML = "";
        if (!any) return;
      }
      if (!home && !state.messages.length) {
        box.innerHTML = `
          <div class="h-full min-h-[12rem] flex flex-col items-center justify-center text-center px-4 py-10">
            <p class="text-[17px] font-semibold tracking-tight text-slate-800">Agent</p>
            <p class="mt-1 text-[13px] font-light text-slate-500">Ask a question, or drag text in a document to quote it.</p>
            <p class="mt-0.5 text-[12px] font-light text-slate-400">Enter to send · ⇧Enter for a new line</p>
          </div>`;
        return;
      }
      const stickBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      box.innerHTML = "";
      let lastUserCites = [];
      for (const m of state.messages) {
        const el = document.createElement("div");
        if (m.role === "user") {
          lastUserCites = Array.isArray(m.citations) ? m.citations : [];
          el.className = "msg-row msg-row--user";
          el.innerHTML = `
            <div class="msg-col">
              <div class="msg-bubble msg-bubble--user">
                ${citeChipsHtml(lastUserCites, "user")}
                <div class="whitespace-pre-wrap break-words leading-relaxed">${escapeHtml(m.content)}</div>
              </div>
            </div>`;
        } else if (m.role === "system") {
          el.className = "mr-2 min-w-0 max-w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap";
          el.textContent = m.content;
        } else {
          const streaming = !!m.streaming;
          const empty = !(m.content && String(m.content).trim());
          // Agent
          el.className = "mr-2 min-w-0 max-w-full rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-slate-900 overflow-hidden";
          const note = m.note
            ? `<div class="mb-1.5 text-[11px] text-slate-500">${escapeHtml(m.note)}</div>`
            : "";
          const steps = (m.steps || []).length ? stepsHtml(m.steps) : "";
          const sources = (m.sources || []).length
            ? `<div class="mt-2.5 border-t border-slate-100 pt-2">
                 <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sources</div>
                 ${m.sources.map((s) => `<button type="button" data-open-id="${escapeHtml(s.id)}"
                    class="block w-full truncate rounded px-1 py-0.5 text-left text-[11px] text-apple-link hover:bg-slate-50 transition duration-150">${escapeHtml(s.path)}</button>`).join("")}
               </div>`
            : "";
          let body = "";
          if (streaming && empty) {
            body = `
              <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Agent</div>
              ${note}${steps}
              <div class="flex items-center gap-2 py-0.5" aria-live="polite" aria-label="Generating">
                <div class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></div>
              </div>`;
          } else if (streaming) {
            body = `
              <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Agent</div>
              ${note}${steps}
              <div class="md-chat min-w-0">${renderChatMarkdown(m.content || "")}<span class="stream-cursor" aria-hidden="true"></span></div>
              ${citeChipsHtml(lastUserCites, "agent")}${sources}`;
          } else {
            body = `
              <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Agent</div>
              ${note}${steps}
              <div class="md-chat min-w-0">${renderChatMarkdown(m.content || "")}</div>
              ${citeChipsHtml(lastUserCites, "agent")}${sources}`;
          }
          el.innerHTML = body;
          el.querySelectorAll("[data-open-id]").forEach((b) => {
            b.addEventListener("click", () => openFile(b.dataset.openId));
          });
        }
        bindCiteButtons(el);
        box.appendChild(el);
      }
      if (stickBottom) box.scrollTop = box.scrollHeight;
    }

    function setSending(on) {
      if (!$("#btn-send")) return;
      state.sending = !!on;
      const btn = $("#btn-send");
      const input = $("#input");
      if (btn) btn.disabled = state.sending;
      if (input) input.disabled = state.sending;
    }

    // Download
    function isDownloadOpen() {
      const menu = $("#download-menu");
      return !!menu && !menu.classList.contains("hidden");
    }

    function setDownloadOpen(open) {
      const btn = $("#btn-download");
      const menu = $("#download-menu");
      if (open) reveal(menu, "pop");
      else leave(menu, "leave-pop");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.classList.toggle("bg-slate-100", open);
      if (open) {
        state.dlLang = state.docPair ? state.docLang : "orig";
        renderDownloadChoices();
      }
    }

    function renderDownloadChoices() {
      const hasPair = !!state.docPair;
      const isHtml = /\.html?$/i.test(state.currentPath || "");
      if (!hasPair && state.dlLang !== "orig") state.dlLang = "orig";
      if (isHtml && state.dlFmt === "pdf") state.dlFmt = "md";
      $("#dl-langs").querySelectorAll("[data-dl-lang]").forEach((b) => {
        const off = b.dataset.dlLang !== "orig" && !hasPair;
        b.disabled = off;
        b.classList.toggle("opacity-40", off);
        b.classList.toggle("cursor-not-allowed", off);
        b.title = off ? "This document has no translation" : "";
        b.setAttribute("aria-selected", b.dataset.dlLang === state.dlLang ? "true" : "false");
      });
      $("#dl-fmts").querySelectorAll("[data-dl-fmt]").forEach((b) => {
        const off = b.dataset.dlFmt === "pdf" && isHtml;
        b.disabled = off;
        b.classList.toggle("opacity-40", off);
        b.classList.toggle("cursor-not-allowed", off);
        b.title = off ? "Open originalPrint from the new tab" : "";
        if (b.dataset.dlFmt === "md") b.textContent = isHtml ? "HTML" : "Markdown";
        b.setAttribute("aria-selected", b.dataset.dlFmt === state.dlFmt ? "true" : "false");
      });
    }

    function updateDownload() {
      const has = state.view === "collected" && !!state.currentPath;
      const btn = $("#btn-download");
      btn.disabled = !has;
      btn.classList.toggle("opacity-40", !has);
      if (!has) return setDownloadOpen(false);
      renderDownloadChoices();
    }

    function saveBlob(text, name) {
      const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
      triggerSave(url, name);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    function triggerSave(href, name) {
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function buildBilingualMd(orig, trans) {
      const strip = (t) => marked.lexer(t || "").filter((x) => x.type !== "space");
      const a = strip(orig), b = strip(trans);
      const out = [];
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const pa = a[i], pb = b[i];
        const same = pa && pb && pa.raw.trim() === pb.raw.trim();
        if (pa && pb && !same && pa.type === "paragraph" && pb.type === "paragraph") {
          const sa = splitSentences(pa.raw.trim()), sb = splitSentences(pb.raw.trim());
          if (sa.length === sb.length) {
            out.push(sa.map((x, k) => x.trim() + "\n" + sb[k].trim()).join("\n\n"));
            continue;
          }
        }
        if (pa) out.push(pa.raw.trim());
        if (pb && !same) out.push(pb.raw.trim());
      }
      return out.join("\n\n") + "\n";
    }

    function printDoc(win) {
      const name = (state.currentPath || "document").split("/").pop().replace(/\.[^.]+$/, "");
      const css = [...document.querySelectorAll("style")]
        .filter((el) => el.type !== "text/tailwindcss")
        .map((el) => el.textContent)
        .join("\n");
      const zoom = getComputedStyle($("#doc-content")).getPropertyValue("--doc-zoom").trim() || "1";
      const body = $("#doc-content")?.innerHTML.replace(/\benter-fade\b/g, "");
      win.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(name)}</title>
<style>${css}</style>
<style>
  html, body { height: auto; overflow: visible; background: #fff; margin: 0; }
  .doc-print { font-size: calc(15px * ${zoom}); letter-spacing: -0.016em; padding: 14mm 0; }
  @page { margin: 0 18mm; }
  @media print {
    .prose-doc a { color: #0066cc !important; text-decoration: none !important; }
    .prose-doc h1, .prose-doc h2, .prose-doc h3 { break-after: avoid; }
    .prose-doc pre, .prose-doc table, .prose-doc img, .prose-doc blockquote, .il-pair { break-inside: avoid; }
    .prose-doc pre { white-space: pre-wrap; word-break: break-word; overflow: visible; }
  }
</style></head><body class="font-sans antialiased bg-white text-slate-900"><article class="doc-print">${body}</article></body></html>`);
      win.document.close();
      toast("In the print dialog, set the destination to 'PDFSave as'");
      const go = () => {
        win.focus();
        win.print();
      };
      if (win.document.readyState === "complete") setTimeout(go, 120);
      else win.addEventListener("load", go);
    }

    async function runDownload() {
      const { dlLang: lang, dlFmt: fmt, docPair: pair } = state;
      if (!state.currentPath) return;
      setDownloadOpen(false);

      if (fmt === "pdf") {
        const win = window.open("", "_blank");
        if (!win) return toast("Could not open the print window. Allow pop-ups.");
        if (pair && state.docLang !== lang) await setDocLang(lang);
        return printDoc(win);
      }
      if (lang === "both" && pair) {
        try {
          if (state.pairTexts.trans == null) {
            state.pairTexts.trans = (await fetchFile(state.currentId, "kor")).content;
          }
        } catch (e) {
          return toast("Could not load the translation");
        }
        const base = state.currentPath.split("/").pop().replace(/\.[^.]+$/, "");
        saveBlob(buildBilingualMd(state.pairTexts.orig, state.pairTexts.trans), base + "-bilingual.md");
        return toast(base + "-bilingual.md downloaded");
      }
      const name = state.currentPath.split("/").pop();
      triggerSave(rawUrl(state.currentId, lang === "trans" && pair ? "kor" : "eng"), name);
      toast(name + " downloaded");
    }

    // Events
    on("#btn-toggle-sidebar", "click", () => {
      state.sidebarOpen = !state.sidebarOpen;
      applySidebar();
    });
    on("#sidebar-scrim", "click", () => {
      state.sidebarOpen = false;
      applySidebar();
    });
    on("#btn-toggle-chat", "click", () => openChat());
    document.addEventListener("click", (e) => {
      const dd = $("#download-dd");
      if (dd && !dd.contains(e.target) && isDownloadOpen()) {
        setDownloadOpen(false);
      }
    });
    on("#doc-scroll", "mouseup", onDocMouseUp);
    on("#doc-scroll", "scroll", hideSelBar, { passive: true });
    on("#doc-scroll", "scroll", saveDocScroll, { passive: true });
    on("#sel-bar", "mousedown", (e) => e.preventDefault());
    on("#sel-chat", "click", citePendingSel);
    on("#sel-copy", "click", copyPendingSel);
    document.addEventListener("mousedown", (e) => {
      if (!$("#sel-bar")?.contains(e.target)) hideSelBar();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideSelBar();
    });
    $("#doc-langbar")?.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => setDocLang(btn.dataset.lang));
    });
    on("#home-send", "click", runHome);
    on("#home-input", "input", autoResizeHome);
    on("#home-input", "keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setHomeMode(state.homeMode === "ask" ? "collect" : "ask");
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        runHome();
      }
    });
    on("#home-mode-btn", "click", (e) => {
      e.stopPropagation();
      setHomeModeOpen($("#home-mode-menu")?.classList.contains("hidden"));
    });
    $("#home-mode-menu")?.querySelectorAll("[data-home-mode]").forEach((b) => {
      b.addEventListener("click", () => setHomeMode(b.dataset.homeMode));
    });
    document.addEventListener("click", (e) => {
      if (!$("#home-mode")?.contains(e.target)) setHomeModeOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        openChat();
      }
      // Font size
      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+" || e.key === "Equal")) {
        e.preventDefault();
        setDocZoom(state.docZoom + 0.1);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "-" || e.key === "Minus")) {
        e.preventDefault();
        setDocZoom(state.docZoom - 0.1);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        setDocZoom(1);
      }
      if (e.key === "Escape") {
        if (!$("#settings-modal")?.classList.contains("hidden")) {
          closeSettings();
          return;
        }
        if (isDownloadOpen()) {
          setDownloadOpen(false);
          return;
        }
        if (state.layout === "split") openChat(false);
      }
    });
    on("#btn-doc-font-down", "click", () => setDocZoom(state.docZoom - 0.1));
    on("#btn-doc-font-up", "click", () => setDocZoom(state.docZoom + 0.1));
    on("#btn-doc-font-reset", "click", () => setDocZoom(1));
    on("#btn-chat-font-down", "click", () => setChatZoom(state.chatZoom - 0.1));
    on("#btn-chat-font-up", "click", () => setChatZoom(state.chatZoom + 0.1));
    on("#btn-chat-font-reset", "click", () => setChatZoom(1));
    on("#btn-download", "click", (e) => {
      e.stopPropagation();
      setDownloadOpen(!isDownloadOpen());
    });
    $("#dl-langs").querySelectorAll("[data-dl-lang]").forEach((b) => {
      b.addEventListener("click", () => {
        state.dlLang = b.dataset.dlLang;
        renderDownloadChoices();
      });
    });
    $("#dl-fmts").querySelectorAll("[data-dl-fmt]").forEach((b) => {
      b.addEventListener("click", () => {
        state.dlFmt = b.dataset.dlFmt;
        localStorage.setItem("dlFmt", state.dlFmt);
        renderDownloadChoices();
      });
    });
    on("#dl-go", "click", runDownload);
    on("#btn-settings", "click", openSettings);
    on("#btn-close-settings", "click", closeSettings);
    on("#btn-cancel-settings", "click", closeSettings);
    on("#settings-modal", "click", (e) => {
      if (e.target === $("#settings-modal")) closeSettings();
    });
    on("#btn-save-settings", "click", () => {
      closeSettings();
      toast("Settings saved");
    });

    // init
    const opened = new URLSearchParams(location.search);
    if ((opened.get("space") || opened.get("conversation") || opened.get("agent")) && !opened.get("doc")) state.layout = "chat";
    if (window.matchMedia("(max-width: 767px)").matches) {
      state.sidebarOpen = false;
      if (state.layout === "split") state.layout = "doc";
    }
    applySidebar();
    updateDownload();
    applyDocZoom();
    applyChatZoom();
    applyChatSplit();
    initSidebarResizer();
    initSplitResizer();
    window.research = {
      openFile: (id) => openFile(id),
      setLayout,
      current: () => (state.currentId ? { id: state.currentId, path: state.currentPath } : null),
      spacesChanged: loadSpaces,
    };
    loadSpaces();
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("booting")));
    loadTree().then(openDocFromUrl, (e) => {
      $("#tree").innerHTML = `<div class="p-3 text-xs text-slate-600">Could not load the document list. <code class="bg-slate-100 px-1 rounded">python3 server.py</code> Check that the server is running.<br/>${escapeHtml(e.message)}</div>`;
    });
