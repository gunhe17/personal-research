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
      spaces: [],
      details: {},
      expanded: (() => { try { return JSON.parse(localStorage.getItem("spaceExpanded") || "{}") || {}; } catch (_) { return {}; } })(),
      tree: [],
      currentPath: null,
      currentId: null,
      view: document.body.dataset.page,
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
      loadProviders();
      const m = $("#settings-modal");
      m.classList.remove("hidden", "leave-fade");
      m.classList.add("flex");
      markSettings(true);
    }

    const settings = { tab: "general", providers: [], status: {}, open: {}, replacing: new Set(), sheet: null, timer: null };
    const METHOD = { subscription: "Plan login", api_key: "API key" };

    async function loadProviders() {
      const data = await fetch("/api/settings").then((r) => r.json()).catch(() => null);
      if (!data) return;
      settings.providers = data.providers;
      $("#settings-provider-tabs").innerHTML = data.providers.map((p) => `
        <button type="button" data-settings-tab="${p.id}" class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 transition duration-150 hover:bg-slate-50 aria-selected:bg-apple aria-selected:font-medium aria-selected:text-white aria-selected:hover:bg-apple">
          <span class="min-w-0 flex-1 truncate">${p.label}</span><span data-dot="${p.id}" class="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"></span>
        </button>`).join("");
      $("#settings-provider-panes").innerHTML = data.providers.map((p) => `<div data-settings-pane="${p.id}" class="space-y-6" hidden></div>`).join("");
      data.providers.forEach((p) => {
        settings.open[p.id] ??= new Set([p.order[0]]);
        renderPane(p.id);
        refreshLogin(p.id);
      });
      document.querySelectorAll("[data-settings-tab]").forEach((b) => (b.onclick = () => showTab(b.dataset.settingsTab)));
      showTab(settings.tab);
    }

    function showTab(name) {
      settings.tab = document.querySelector(`[data-settings-pane="${name}"]`) ? name : "general";
      document.querySelectorAll("[data-settings-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.settingsTab === settings.tab)));
      document.querySelectorAll("[data-settings-pane]").forEach((p) => (p.hidden = p.dataset.settingsPane !== settings.tab));
    }

    function usable(p, method) {
      if (!p.enabled[method]) return false;
      return method === "api_key" ? !!p.key : !!settings.status[p.id]?.logged_in;
    }

    function renderPane(id) {
      const p = settings.providers.find((x) => x.id === id);
      const pane = document.querySelector(`[data-settings-pane="${id}"]`);
      if (!p || !pane) return;
      const status = settings.status[id];
      const ready = p.order.some((m) => usable(p, m));
      const first = p.order.find((m) => usable(p, m));
      const dot = (on) => `<span class="h-1.5 w-1.5 shrink-0 rounded-full ${on ? "bg-[#34c759]" : "bg-slate-300"}"></span>`;
      const row = (label, value) => `<div class="flex items-baseline gap-3 py-1.5"><span class="w-24 shrink-0 text-[12px] text-slate-500">${label}</span><span class="min-w-0 flex-1 truncate text-[13px] text-slate-800">${value}</span></div>`;
      const control = (label, value) => `<div class="flex items-center gap-3 py-1"><span class="w-24 shrink-0 text-[12px] text-slate-500">${label}</span><div class="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-slate-800">${value}</div></div>`;
      const used = (m) => {
        const u = p.usage[m];
        return u.last ? `${u.month} this month · last ${sinceLabel(u.last)}` : "Not used yet";
      };
      const subtitle = (m) => {
        if (!p.enabled[m]) return "Off";
        if (m === "api_key") return p.key ? `Key saved · ${p.key}` : "No key";
        if (!status) return "Checking…";
        return status.logged_in ? `Logged in · ${status.detail || p.cli}` : status.pending ? "Logging in…" : "Logged out";
      };
      const value = (text, buttons) => `<span class="min-w-0 flex-1 truncate">${text}</span>${buttons}`;
      const editing = !p.key || settings.replacing.has(id);
      const detail = (m) => m === "subscription" ? `
        ${control("Account", value(
          status?.logged_in ? status.detail || "Logged in" : `<span class="text-slate-400">${status?.pending ? "Logging in…" : "Logged out"}</span>`,
          `<button type="button" data-action="login" class="${status?.logged_in && !status?.pending ? "shrink-0 rounded-full border border-[#0066cc] px-3 py-1 text-[12px] text-[#0066cc] hover:bg-[#f4f8fb]" : "shrink-0 rounded-full bg-apple px-3 py-1 text-[12px] text-white hover:bg-apple-hover"}">${status?.pending ? "Continue" : status?.logged_in ? "Log in again" : "Log in"}</button>
          ${status?.logged_in ? `<button type="button" data-action="signout" class="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[12px] text-slate-700 hover:bg-slate-200">Log out</button>` : ""}`,
        ))}
        ${row("Logs in with", p.cli)}
        ${row("Usage", used(m))}` : `
        ${control("Key", editing ? `
          <input type="password" autocomplete="off" spellcheck="false" placeholder="${p.key ? "New key" : `${p.label} API key`}" class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-apple focus:bg-white focus:outline-none" />
          <button type="button" data-action="save-key" class="shrink-0 rounded-full bg-apple px-3 py-1 text-[12px] text-white hover:bg-apple-hover">Save</button>
          ${p.key ? `<button type="button" data-action="keep-key" class="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[12px] text-slate-700 hover:bg-slate-200">Cancel</button>` : ""}` : value(
          `${p.key} <span class="text-slate-400">· saved ${new Date(p.saved.api_key).toLocaleDateString()}</span>`,
          `<button type="button" data-action="replace-key" class="shrink-0 rounded-full border border-[#0066cc] px-3 py-1 text-[12px] text-[#0066cc] hover:bg-[#f4f8fb]">Replace</button>
          <button type="button" data-action="remove-key" class="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[12px] text-slate-700 hover:bg-slate-200">Remove</button>`,
        ))}
        ${row("Billing", "Per request on the provider account")}
        ${row("Usage", used(m))}`;
      pane.innerHTML = `
        <div>
          <h3 class="text-[21px] font-semibold tracking-tight text-slate-900">${p.label}</h3>
          <div class="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">${dot(ready)}<span>${!status && p.enabled.subscription ? "Checking…" : ready ? `Ready · ${METHOD[first]} first` : "Not ready"}</span></div>
          <p data-error class="mt-2 text-[12px] text-red-600" hidden></p>
        </div>
        <section>
          <h4 class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Try in this order</h4>
          <div class="space-y-0.5">
            ${p.order.map((m, i) => {
              const rank = p.order.filter((x) => p.enabled[x]).indexOf(m);
              const blocked = (to) => to < 0 || to >= p.order.length || p.enabled[p.order[to]] !== p.enabled[m];
              return `
            <div data-method="${m}">
              <div class="group flex items-center gap-1.5 rounded-lg py-1.5 pl-1 pr-1.5 text-sm transition duration-150 hover:bg-slate-50">
                <button type="button" data-action="toggle" data-toggle="method-${id}-${m}" aria-expanded="${settings.open[id].has(m)}" class="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                  ${chevronHtml(settings.open[id].has(m))}
                  <span class="${p.enabled[m] ? "text-slate-500" : "text-slate-300"}">${methodIcon(m)}</span>
                  <span class="w-4 shrink-0 text-center text-[11px] font-semibold ${m === first ? "text-apple" : "text-slate-400"}">${rank >= 0 ? rank + 1 : "–"}</span>
                  <span class="flex w-[6.25rem] shrink-0 items-center gap-2 ${p.enabled[m] ? "text-slate-800" : "text-slate-400"}">${dot(usable(p, m))}${METHOD[m]}</span>
                  <span class="min-w-0 flex-1 truncate text-[12px] text-slate-400">${subtitle(m)}</span>
                </button>
                <span class="flex shrink-0 items-center text-slate-400 opacity-60 transition group-hover:opacity-100">
                  <button type="button" data-action="up" ${blocked(i - 1) ? "disabled" : ""} class="flex h-6 w-5 items-center justify-center hover:text-slate-800 disabled:opacity-25" aria-label="Move up"><svg viewBox="0 0 16 16" class="h-3 w-3"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
                  <button type="button" data-action="down" ${blocked(i + 1) ? "disabled" : ""} class="flex h-6 w-5 items-center justify-center hover:text-slate-800 disabled:opacity-25" aria-label="Move down"><svg viewBox="0 0 16 16" class="h-3 w-3"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
                </span>
                <button type="button" data-action="switch" role="switch" aria-checked="${p.enabled[m]}" title="Use this method" class="relative ml-1 h-5 w-9 shrink-0 rounded-full transition ${p.enabled[m] ? "bg-[#34c759]" : "bg-slate-200"}"><span class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition ${p.enabled[m] ? "translate-x-4" : ""}"></span></button>
              </div>
              <div data-detail class="ml-3 border-l border-slate-100 pl-5" ${settings.open[id].has(m) ? "" : "hidden"}><div class="pb-2 pt-0.5">${detail(m)}</div></div>
            </div>`;
            }).join("")}
          </div>
          <p class="mt-2 text-[11px] text-slate-400">Methods that are on always come first. If one hits its limit, is logged out, or fails to run, the same request goes to the next one once.</p>
        </section>`;
      pane.querySelectorAll("[data-method]").forEach((li) => {
        const m = li.dataset.method;
        li.querySelectorAll("[data-action]").forEach((b) => b.addEventListener("click", () => methodAction(id, m, b.dataset.action, li)));
        li.querySelector("input[type=password]")?.addEventListener("keydown", (e) => { if (e.key === "Enter") methodAction(id, m, "save-key", li); });
      });
      document.querySelectorAll(`[data-dot="${id}"]`).forEach((d) => (d.className = `h-1.5 w-1.5 shrink-0 rounded-full ${ready ? "bg-[#34c759]" : "bg-slate-300"}`));
    }

    async function methodAction(id, method, action, li) {
      const p = settings.providers.find((x) => x.id === id);
      if (action === "toggle") return foldMethod(id, method, li);
      if (action === "login") return openSheet(id);
      if (action === "signout") {
        if (!confirm(`Log ${p.cli} out on this server?`)) return;
        await fetch(`/api/login?provider=${encodeURIComponent(id)}&signout=1`, { method: "DELETE" }).catch(() => null);
        return refreshLogin(id);
      }
      if (action === "up" || action === "down") {
        const order = [...p.order];
        const at = order.indexOf(method);
        const to = action === "up" ? at - 1 : at + 1;
        [order[at], order[to]] = [order[to], order[at]];
        return saveProvider(id, { order });
      }
      if (action === "switch") return saveProvider(id, { enabled: { [method]: !p.enabled[method] } });
      if (action === "replace-key" || action === "keep-key") {
        action === "replace-key" ? settings.replacing.add(id) : settings.replacing.delete(id);
        renderPane(id);
        return document.querySelector(`[data-settings-pane="${id}"] [data-method="api_key"] input[type=password]`)?.focus();
      }
      if (action === "remove-key") {
        if (!confirm(`Remove the saved ${p.label} API key?`)) return;
        return saveProvider(id, { key: null });
      }
      if (action === "save-key") {
        const key = li.querySelector("input[type=password]").value.trim();
        if (!key) return li.querySelector("input[type=password]").focus();
        settings.replacing.delete(id);
        if (await saveProvider(id, { key })) toast("API key saved");
      }
    }

    function methodIcon(method) {
      const path = method === "api_key"
        ? '<circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M14 9l2 2" />'
        : '<circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />';
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 shrink-0">${path}</svg>`;
    }

    function foldMethod(id, method, li) {
      const open = !settings.open[id].has(method);
      open ? settings.open[id].add(method) : settings.open[id].delete(method);
      const box = li.querySelector("[data-detail]");
      const chevron = li.querySelector("[data-toggle] svg");
      li.querySelector("[data-toggle]").setAttribute("aria-expanded", String(open));
      chevron.classList.toggle("rotate-90", open);
      if (STILL.matches) return void (box.hidden = !open);
      chevron.animate(
        [{ transform: `rotate(${open ? 0 : 90}deg)` }, { transform: `rotate(${open ? 90 : 0}deg)` }],
        { duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
      box.getAnimations().forEach((a) => a.cancel());
      box.hidden = false;
      box.style.overflow = "hidden";
      const height = box.scrollHeight;
      box.animate(
        open ? [{ height: "0px", opacity: 0 }, { height: `${height}px`, opacity: 1 }] : [{ height: `${height}px`, opacity: 1 }, { height: "0px", opacity: 0 }],
        { duration: open ? 240 : 180, easing: open ? "cubic-bezier(0.22, 1, 0.36, 1)" : "cubic-bezier(0.4, 0, 1, 1)" },
      ).onfinish = () => {
        box.style.overflow = "";
        box.hidden = !open;
      };
    }

    async function saveProvider(id, values) {
      const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providers: { [id]: values } }) }).catch(() => null);
      const body = response ? await response.json().catch(() => ({})) : { error: "Could not reach the server" };
      if (!response?.ok) {
        const error = document.querySelector(`[data-settings-pane="${id}"] [data-error]`);
        error.textContent = body.error || "Could not save";
        error.hidden = false;
        return false;
      }
      settings.providers = body.providers;
      renderPane(id);
      document.querySelectorAll("iframe").forEach((f) => f.contentWindow?.dispatchEvent(new Event("research:settings")));
      return true;
    }

    async function refreshLogin(id) {
      const data = await fetch(`/api/login?provider=${encodeURIComponent(id)}`).then((r) => r.json()).catch(() => null);
      if (!data) return null;
      settings.status[id] = data;
      if (settings.sheet !== id || !data.pending) {
        const fresh = await fetch("/api/settings").then((r) => r.json()).catch(() => null);
        if (fresh) settings.providers = fresh.providers;
      }
      renderPane(id);
      return data;
    }

    async function openSheet(id) {
      const provider = settings.providers.find((p) => p.id === id);
      settings.sheet = id;
      $("#login-title").textContent = `Log in to ${provider.label}`;
      $("#login-paste").value = "";
      paintSheet({ pending: null }, "Starting login…");
      $("#login-sheet").classList.remove("hidden");
      $("#login-sheet").classList.add("flex");
      let data = settings.status[id];
      if (!data?.pending) {
        const response = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: id }) }).catch(() => null);
        data = response ? await response.json().catch(() => ({})) : { error: "Could not reach the server" };
        if (!response?.ok) return paintSheet({ pending: null }, data.error || "Could not start login");
      }
      if (settings.sheet !== id) return;
      paintSheet(data);
      pollSheet(id);
    }

    function paintSheet(data, message) {
      const pending = data.pending;
      const done = data.logged_in && !pending && !message;
      document.querySelectorAll("[data-step]").forEach((s) => {
        const active = done || (pending && s.dataset.step !== "3");
        s.className = `flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] ${active ? "bg-apple text-white" : "border border-slate-200 text-slate-400"}`;
        s.textContent = done ? "✓" : s.dataset.step;
      });
      const url = $("#login-url");
      url.textContent = pending?.url ? `${pending.url.replace(/^https:\/\//, "").slice(0, 48)}${pending.url.length > 56 ? "…" : ""} ↗` : "";
      url.href = pending?.url || "#";
      $("#login-step-two").textContent = pending?.needs_code ? "Paste the code shown after login" : "Enter this code";
      $("#login-code").textContent = pending?.code || "";
      $("#login-code-row").classList.toggle("hidden", !pending?.code);
      $("#login-code-row").classList.toggle("flex", !!pending?.code);
      $("#login-paste-row").classList.toggle("hidden", !pending?.needs_code);
      $("#login-paste-row").classList.toggle("flex", !!pending?.needs_code);
      $("#login-wait").textContent = done ? "Logged in" : message || (pending?.needs_code ? "Waiting for the code…" : "Waiting for approval…");
      $("#login-wait").classList.toggle("text-slate-400", !done);
      $("#login-hint").textContent = pending?.error || (done ? data.detail || "" : pending && !pending.needs_code ? "This closes by itself when you approve." : "");
    }

    function pollSheet(id) {
      clearTimeout(settings.timer);
      settings.timer = setTimeout(async () => {
        if (settings.sheet !== id) return;
        const data = await refreshLogin(id);
        if (settings.sheet !== id || !data) return;
        paintSheet(data);
        if (data.pending) return pollSheet(id);
        if (data.logged_in) setTimeout(() => { if (settings.sheet === id) closeSheet(); }, 1200);
      }, 2000);
    }

    async function submitCode() {
      const id = settings.sheet;
      const code = $("#login-paste").value.trim();
      if (!id || !code) return $("#login-paste").focus();
      $("#login-submit").disabled = true;
      $("#login-wait").textContent = "Checking the code…";
      const response = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: id, code }) }).catch(() => null);
      const data = response ? await response.json().catch(() => ({})) : { error: "Could not reach the server" };
      $("#login-submit").disabled = false;
      if (!response?.ok) return paintSheet(settings.status[id] || { pending: null }, data.error || "Login failed");
      settings.status[id] = data;
      await refreshLogin(id);
      paintSheet(data);
      if (data.logged_in && !data.pending) setTimeout(() => { if (settings.sheet === id) closeSheet(); }, 1200);
    }

    function closeSheet({ cancel = false } = {}) {
      const id = settings.sheet;
      settings.sheet = null;
      clearTimeout(settings.timer);
      $("#login-sheet").classList.add("hidden");
      $("#login-sheet").classList.remove("flex");
      if (cancel && id) fetch(`/api/login?provider=${encodeURIComponent(id)}`, { method: "DELETE" }).then(() => refreshLogin(id));
      else if (id) refreshLogin(id);
    }

    function closeSettings() {
      if (settings.sheet) closeSheet({ cancel: true });
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

    const SPACE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>`;

    const HOME_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0">
      <path d="M3 11.5L12 3l9 8.5" /><path d="M5.5 10v10h13V10" /></svg>`;

    function renderTree() {
      const tree = $("#tree");
      const params = new URLSearchParams(location.search);
      tree.innerHTML = "";
      tree.appendChild(sidebarRow({
        label: "Home",
        active: state.view === "home",
        icon: HOME_ICON,
        onClick: () => openHome(),
      }));
      const spacesOpen = state.expanded.spaces !== false;
      tree.appendChild(folderRow({ key: "spaces", label: "Space", icon: SPACE_ICON, open: spacesOpen, depth: 0, bare: true, onToggle: () => expandSpace("spaces", !spacesOpen) }));
      if (!spacesOpen) return;
      const box = document.createElement("div");
      box.className = "ml-3 mt-1.5 border-l border-slate-100 pl-1";
      box.dataset.children = "spaces";
      tree.appendChild(box);
      if (!state.spaces.length) box.insertAdjacentHTML("beforeend", `<div class="px-2 py-1.5 text-xs text-slate-400">Nothing yet</div>`);
      const current = window.workbench?.activeSpace?.() || params.get("space") || params.get("id");
      for (const item of state.spaces.slice(0, 12)) {
        const open = state.expanded[item.id] ?? item.id === current;
        box.appendChild(folderRow({
          key: item.id,
          label: item.title,
          icon: `<span class="${current === item.id ? "text-apple-link" : "text-slate-500"}">${iconHtml("space", "h-4 w-4")}</span>`,
          open,
          depth: 0,
          strong: current === item.id,
          onToggle: () => expandSpace(item.id, !open),
        }));
        if (!open) continue;
        const detail = state.details[item.id];
        if (!detail) { loadSpaceDetail(item.id); continue; }
        box.appendChild(spaceFolders(item.id, detail));
      }
      unfold();
    }

    function chevronHtml(open) {
      return `<span class="inline-flex h-4 w-4 shrink-0 items-center justify-center text-slate-400"><svg viewBox="0 0 16 16" class="h-3 w-3 transition-transform duration-150 ${open ? "rotate-90" : ""}" style="transform-origin: 50% 50%"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg></span>`;
    }

    function folderRow({ key, label, icon, open, depth, strong, meta, count, bare, onToggle }) {
      const row = document.createElement("button");
      row.type = "button";
      row.dataset.toggle = key;
      row.setAttribute("aria-expanded", String(open));
      row.style.paddingLeft = `${(bare ? 8 : 4) + depth * 12}px`;
      row.className = `flex w-full items-center ${bare ? "gap-2" : "gap-1.5"} rounded-lg py-1.5 pr-2 text-left text-sm transition duration-150 hover:bg-slate-50 ${strong ? "font-semibold text-slate-900" : bare ? "text-slate-600" : "text-slate-700"}`;
      row.innerHTML = `${bare ? "" : chevronHtml(open)}${icon || ""}<span class="min-w-0 flex-1 truncate">${escapeHtml(label)}</span>${
        meta ? `<span class="shrink-0 text-[10px] font-normal text-slate-400">${escapeHtml(meta)}</span>` : ""
      }${count !== undefined ? `<span class="shrink-0 text-[10px] font-normal text-slate-400">${count}</span>` : ""}`;
      row.addEventListener("click", onToggle);
      return row;
    }

    const RESEARCH_ICON = {
      folder: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z" />',
      docs: '<path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" />',
      papers: '<path d="M4 7l8-4 8 4-8 4z" /><path d="M8 9v5c0 1.5 2 3 4 3s4-1.5 4-3V9" />',
      repos: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />',
      videos: '<rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9.5v5l4.5-2.5z" />',
      lesson: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5zM12 4h6.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H12" />',
      note: '<path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" />',
      log: '<circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" />',
      chat: '<path d="M21 11a8 8 0 0 1-8 8H6.5L3 21V11a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z" />',
      plus: '<path d="M12 5v14M5 12h14" />',
      space: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" />',
      conversations: '<path d="M16 10a6 6 0 0 1-6 6H6l-3 2.5V10a6 6 0 0 1 6-6h1a6 6 0 0 1 6 6z" /><path d="M18.5 8.5A5 5 0 0 1 21 13v6l-2.5-2H15a5 5 0 0 1-3.6-1.5" />',
      collected: '<rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9" /><path d="M10 13h4" />',
      materials: '<path d="M4 19.5V5.5A1.5 1.5 0 0 1 5.5 4H18v13H5.5A1.5 1.5 0 0 0 4 18.5 1.5 1.5 0 0 0 5.5 20H18" /><path d="M8 8h6M8 11h4" />',
    };
    window.RESEARCH_ICON = RESEARCH_ICON;

    function iconHtml(name, cls = "h-3.5 w-3.5") {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="${cls} shrink-0">${RESEARCH_ICON[name] || RESEARCH_ICON.docs}</svg>`;
    }

    function expandSpace(id, open) {
      const commit = () => {
        state.expanded[id] = open;
        localStorage.setItem("spaceExpanded", JSON.stringify(state.expanded));
        if (open) state.unfolding = id;
        renderTree();
      };
      const children = document.querySelector(`[data-children="${CSS.escape(id)}"]`);
      if (open || !children || STILL.matches) return commit();
      turn(id, 90, 0);
      children.style.overflow = "hidden";
      children.animate(
        [{ height: `${children.offsetHeight}px`, opacity: 1 }, { height: "0px", opacity: 0 }],
        { duration: 180, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
      ).onfinish = commit;
    }

    function turn(id, from, to) {
      document.querySelector(`[data-toggle="${CSS.escape(id)}"] svg`)?.animate(
        [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${to}deg)` }],
        { duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
      );
    }

    function unfold() {
      const id = state.unfolding;
      const children = id && document.querySelector(`[data-children="${CSS.escape(id)}"]`);
      if (!children) return;
      state.unfolding = null;
      if (STILL.matches) return;
      turn(id, 0, 90);
      Object.assign(children.style, { height: "0px", opacity: "0", overflow: "hidden" });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const height = children.scrollHeight;
        Object.assign(children.style, { height: "", opacity: "" });
        children.animate(
          [{ height: "0px", opacity: 0 }, { height: `${height}px`, opacity: 1 }],
          { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        ).onfinish = () => { children.style.overflow = ""; };
      }));
    }

    async function loadSpaceDetail(id) {
      if (state.details[id] === null) return;
      state.details[id] = null;
      try {
        state.details[id] = await (await fetch(`/api/spaces/${encodeURIComponent(id)}`)).json();
      } catch (_) {
        delete state.details[id];
        return;
      }
      renderTree();
    }

    function openItem(item) {
      if (window.workbench) return window.workbench.open(item);
      location.href = `${COLLECTED_URL}?open=${encodeURIComponent(JSON.stringify(item))}`;
    }

    function spaceFolders(spaceId, detail) {
      const box = document.createElement("div");
      box.className = "ml-3 border-l border-slate-100 pl-1 mb-1";
      box.dataset.children = spaceId;
      const active = window.workbench?.activeKey?.() || "";
      const folder = (key, name, rows, symbol) => {
        const id = `${spaceId}:${key}`;
        const open = state.expanded[id] !== false;
        const head = folderRow({ key: id, label: name, icon: `<span class="text-apple-link">${iconHtml(symbol)}</span>`, open, depth: 0, count: rows.length, onToggle: () => expandSpace(id, !open) });
        head.classList.replace("text-sm", "text-[12px]");
        head.classList.replace("py-1.5", "py-1");
        box.appendChild(head);
        if (!open) return;
        const children = document.createElement("div");
        children.dataset.children = id;
        if (!rows.length) children.insertAdjacentHTML("beforeend", `<div class="pl-9 pr-2 pb-1 text-[11px] text-slate-400">비어 있음</div>`);
        rows.forEach((row) => children.appendChild(row));
        box.appendChild(children);
      };
      const leaf = (item, kind, label, title) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = title || label;
        btn.draggable = true;
        const on = active === itemKey(item);
        btn.className = `flex w-full items-center gap-1.5 rounded-lg py-1 pl-9 pr-2 text-left text-[12px] transition duration-150 ${on ? "bg-ice text-apple-link" : "text-slate-600 hover:bg-slate-50"}`;
        btn.innerHTML = `${iconHtml(kind)}<span class="min-w-0 flex-1 truncate">${escapeHtml(label)}</span>`;
        btn.addEventListener("click", () => openItem(item));
        btn.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("application/x-research", JSON.stringify(item));
          e.dataTransfer.effectAllowed = "copyMove";
        });
        return btn;
      };
      const conversations = detail.conversations.map((c) => leaf({ kind: "chat", space: spaceId, conversation: c.id, title: c.title }, "chat", c.title));
      conversations.push(leaf({ kind: "chat", space: spaceId, conversation: "", title: "새 대화" }, "plus", "새 대화"));
      const collected = detail.collected.flatMap((root) => (root.documents?.length ? root.documents : [root]).map((d) =>
        leaf({ kind: "doc", id: d.id, title: d.path.split("/").pop(), path: d.path }, d.path.split("/")[0], d.path.split("/").slice(2).join("/") || d.path, d.path)));
      const materials = detail.materials.map((m) => leaf({ kind: "material", id: m.id, title: m.title, material: m.kind }, m.kind, m.title));
      folder("conversations", "Conversations", conversations, "conversations");
      folder("collected", "Collected", collected, "collected");
      folder("materials", "Materials", materials, "materials");
      return box;
    }

    function itemKey(item) {
      if (item.kind === "chat") return item.conversation ? `chat:${item.conversation}` : `chat:${item.conversation === "" ? "new" : "latest"}:${item.space}`;
      return item.kind === "agent" ? `agent:${item.agent}` : `${item.kind}:${item.id}`;
    }
    window.itemKey = itemKey;

    async function loadTree() {
      const res = await fetch("/api/tree");
      if (!res.ok) throw new Error("tree failed");
      const data = await res.json();
      state.tree = data.tree || [];
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
    const SPACE_URL = "/viewer/space";

    async function loadSpaces() {
      state.details = {};
      try {
        state.spaces = (await (await fetch("/api/spaces")).json()).items || [];
      } catch (_) {
        state.spaces = [];
      }
      renderTree();
    }
    const COLLECTED_URL = "/viewer/collected";

    async function renderSpacePage() {
      const box = $("#space-content");
      const id = new URLSearchParams(location.search).get("id");
      try {
        if (id) return renderSpaceDetail(box, await (await fetch(`/api/spaces/${encodeURIComponent(id)}`)).json());
        renderSpaceList(box, (await (await fetch("/api/spaces")).json()).items || []);
      } catch (e) {
        box.innerHTML = `<p class="text-sm text-slate-500">Could not load: ${escapeHtml(e.message)}</p>`;
      }
    }

    function renderSpaceList(box, items) {
      box.innerHTML = `
        <div class="mb-10 flex items-end justify-between gap-4">
          <div class="min-w-0">
            <h1 class="text-[40px] font-semibold tracking-tight text-slate-900" style="letter-spacing: 0.44px">Space</h1>
            <p class="mt-1 text-[17px] font-light text-slate-500">무엇을 배울지 목적 하나가 space 하나입니다.</p>
          </div>
          <button type="button" id="space-new" class="shrink-0 rounded-full border border-apple-link px-4 py-1.5 text-[15px] text-apple-link hover:bg-white transition">+ new</button>
        </div>
        <div class="overflow-hidden rounded-2xl bg-white">
          ${items.length ? items.map((item, i) => `
            <div data-space="${escapeHtml(item.id)}" class="group cursor-pointer pl-5 hover:bg-slate-50 transition">
              <div class="flex items-center gap-4 py-4 pr-5 ${i ? "border-t border-slate-100" : ""}">
                <div class="min-w-0 flex-1">
                  <div class="truncate text-[17px] font-semibold text-slate-900">${escapeHtml(item.title)}</div>
                  <div class="mt-0.5 truncate text-[14px] text-slate-500">${escapeHtml(item.purpose || "목적이 아직 없습니다")}</div>
                </div>
                <div class="w-20 shrink-0 text-right text-[14px] tabular-nums text-slate-600">${escapeHtml(sinceLabel(item.updated_at))}</div>
                <a href="${COLLECTED_URL}?space=${encodeURIComponent(item.id)}" data-research class="shrink-0 rounded-full bg-apple px-3.5 py-1.5 text-[13px] text-white hover:bg-apple-hover transition">research</a>
              </div>
            </div>`).join("") : `<p class="px-5 py-10 text-center text-[15px] text-slate-500">아직 space 가 없습니다.</p>`}
        </div>`;
      box.querySelectorAll("[data-space]").forEach((row) => row.addEventListener("click", (e) => {
        if (e.target.closest("[data-research]")) return;
        location.href = `${SPACE_URL}?id=${encodeURIComponent(row.dataset.space)}`;
      }));
      $("#space-new").addEventListener("click", openSpaceModal);
    }

    function openSpaceModal() {
      const modal = $("#space-modal");
      $("#space-modal-title").value = "";
      $("#space-modal-purpose").value = "";
      $("#space-modal-error").classList.add("hidden");
      modal.classList.remove("hidden", "leave-fade");
      modal.classList.add("flex");
      setTimeout(() => $("#space-modal-title").focus(), 50);
    }

    function closeSpaceModal() {
      const modal = $("#space-modal");
      if (!modal || modal.classList.contains("hidden")) return;
      leave(modal, "leave-fade", () => modal.classList.remove("flex"));
    }

    async function createSpace() {
      const title = $("#space-modal-title").value.trim();
      const error = $("#space-modal-error");
      if (!title) {
        error.textContent = "이름을 적어 주세요.";
        error.classList.remove("hidden");
        $("#space-modal-title").focus();
        return;
      }
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, purpose: $("#space-modal-purpose").value }),
      });
      if (!res.ok) {
        error.textContent = (await res.json()).error || "만들지 못했습니다.";
        error.classList.remove("hidden");
        return;
      }
      closeSpaceModal();
      loadSpaces();
      renderSpacePage();
    }

    on("#space-modal-close", "click", closeSpaceModal);
    on("#space-modal-cancel", "click", closeSpaceModal);
    on("#space-modal-create", "click", createSpace);
    on("#space-modal", "click", (e) => { if (e.target === $("#space-modal")) closeSpaceModal(); });
    on("#space-modal-title", "keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); createSpace(); } });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSpaceModal(); });

    function renderSpaceDetail(box, space) {
      const chat = (extra) => `${COLLECTED_URL}?space=${encodeURIComponent(space.id)}${extra}`;
      box.innerHTML = `
        <a href="${SPACE_URL}" class="text-[13px] text-apple-link hover:underline">← Space</a>
        <input id="space-name" value="${escapeHtml(space.title)}" aria-label="Space 이름"
          class="mt-3 w-full bg-transparent text-[40px] font-semibold tracking-tight text-slate-900 rounded-xl px-1 -mx-1 focus:outline-none focus:ring-2 focus:ring-apple/30" style="letter-spacing: 0.44px" />
        <section class="mt-8">
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-[13px] font-semibold uppercase tracking-wide text-slate-500">목적</h2>
            <span id="space-saved" class="text-[12px] text-slate-400"></span>
          </div>
          <textarea id="space-purpose" rows="5" placeholder="무엇을, 어떤 순서로, 어디까지 배울지 적어 두면 튜터가 매 질문마다 읽습니다."
            class="w-full resize-y rounded-xl bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-800 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-apple/30">${escapeHtml(space.purpose)}</textarea>
        </section>
        <section class="mt-10">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-[13px] font-semibold uppercase tracking-wide text-slate-500">자료 ${space.materials.length}</h2>
            <button type="button" id="material-new" class="rounded-full border border-apple-link px-3 py-1 text-[13px] text-apple-link hover:bg-white transition">새 노트</button>
          </div>
          <div id="material-form" class="hidden mb-3"></div>
          <div class="divide-y divide-slate-200 border-y border-slate-200">
            ${space.materials.length ? space.materials.map((m) => `
              <div>
                <button type="button" data-material="${escapeHtml(m.id)}" class="flex w-full items-baseline justify-between gap-4 px-2 py-3.5 text-left hover:bg-white transition">
                  <span class="min-w-0 truncate text-[15px] text-slate-900"><span class="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">${escapeHtml(MATERIAL_KIND[m.kind] || m.kind)}</span>${escapeHtml(m.title)}</span>
                  <span class="shrink-0 text-[12px] text-slate-400">${escapeHtml(sinceLabel(m.updated_at))}</span>
                </button>
                <div data-material-view="${escapeHtml(m.id)}" class="hidden px-2 pb-6"></div>
              </div>`).join("") : `<p class="px-2 py-6 text-[14px] text-slate-500">수업, 노트, 옛 기록이 여기에 모입니다.</p>`}
          </div>
        </section>
        <section class="mt-10">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-[13px] font-semibold uppercase tracking-wide text-slate-500">대화 ${space.conversations.length}</h2>
            <a href="${chat("&new=1")}" class="rounded-full border border-apple-link px-3 py-1 text-[13px] text-apple-link hover:bg-white transition">새 대화</a>
          </div>
          <div class="divide-y divide-slate-200 border-y border-slate-200">
            ${space.conversations.length ? space.conversations.map((c) => `
              <a href="${chat(`&conversation=${encodeURIComponent(c.id)}`)}" class="flex items-baseline justify-between gap-4 px-2 py-3.5 hover:bg-white transition">
                <span class="truncate text-[15px] text-slate-900">${escapeHtml(c.title)}</span>
                <span class="shrink-0 text-[12px] text-slate-400">메시지 ${c.message_count} · ${escapeHtml(sinceLabel(c.updated_at))}</span>
              </a>`).join("") : `<p class="px-2 py-6 text-[14px] text-slate-500">아직 대화가 없습니다.</p>`}
          </div>
        </section>
        <section class="mt-10">
          <h2 class="mb-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500">수집물 ${space.collected.length}</h2>
          <div class="divide-y divide-slate-200 border-y border-slate-200">
            ${space.collected.length ? space.collected.map((d) => `
              <a href="${chat(`&conversation=${encodeURIComponent(space.conversations.find((c) => c.collected_id === d.id)?.id || "")}&doc=${encodeURIComponent(d.id)}`)}" class="block px-2 py-3.5 hover:bg-white transition">
                <span class="block truncate font-mono text-[13px] text-slate-900">${escapeHtml(d.path)}</span>
                <span class="mt-0.5 block text-[12px] text-slate-400">대화 ${d.conversation_count}${d.document_count > 1 ? ` · 문서 ${d.document_count}` : ""}</span>
              </a>`).join("") : `<p class="px-2 py-6 text-[14px] text-slate-500">대화에서 문서를 자료로 두면 여기에 모입니다.</p>`}
          </div>
        </section>`;
      const save = async (data) => {
        const res = await fetch(`/api/spaces/${encodeURIComponent(space.id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        $("#space-saved").textContent = res.ok ? "저장됨" : "저장하지 못했습니다";
        if (res.ok && data.title) loadSpaces();
      };
      $("#space-name").addEventListener("change", (e) => e.target.value.trim() && save({ title: e.target.value.trim() }));
      $("#space-name").addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
      $("#space-purpose").addEventListener("change", (e) => save({ purpose: e.target.value }));
      box.querySelectorAll("[data-material]").forEach((row) => row.addEventListener("click", () => openMaterial(space, row.dataset.material)));
      $("#material-new").addEventListener("click", () => editMaterial(space, null));
    }

    const MATERIAL_KIND = { lesson: "수업", note: "노트", log: "기록" };

    async function openMaterial(space, id) {
      const view = document.querySelector(`[data-material-view="${CSS.escape(id)}"]`);
      if (view.classList.toggle("hidden")) return;
      view.innerHTML = `<p class="text-[13px] text-slate-400">Loading…</p>`;
      const material = await (await fetch(`/api/materials/${encodeURIComponent(id)}`)).json();
      view.innerHTML = "";
      const content = document.createElement("div");
      content.className = "article-content";
      if (material.kind === "lesson") {
        const { blocks } = await import("/viewer/blocks.js");
        blocks(content, material.content, { key: material.id, onContext: () => {} });
      } else {
        content.innerHTML = `<div class="md-chat">${renderChatMarkdown(material.content)}</div>`;
      }
      view.appendChild(content);
      if (material.kind !== "note") return;
      const actions = document.createElement("div");
      actions.className = "mt-4 flex gap-4 text-[13px]";
      actions.innerHTML = `<button type="button" data-edit class="text-apple-link hover:underline">고치기</button><button type="button" data-drop class="text-slate-500 hover:underline">삭제</button>`;
      actions.querySelector("[data-edit]").addEventListener("click", () => editMaterial(space, material));
      actions.querySelector("[data-drop]").addEventListener("click", async (e) => {
        if (e.target.dataset.armed !== "1") { e.target.dataset.armed = "1"; e.target.textContent = "한 번 더 누르면 삭제"; return; }
        await fetch(`/api/materials/${encodeURIComponent(material.id)}`, { method: "DELETE" });
        renderSpacePage();
      });
      view.appendChild(actions);
    }

    function editMaterial(space, material) {
      const form = $("#material-form");
      form.classList.remove("hidden");
      form.innerHTML = `
        <div class="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <input data-title placeholder="제목" value="${escapeHtml(material?.title || "")}" class="w-full bg-transparent text-[17px] font-semibold text-slate-900 focus:outline-none" />
          <textarea data-content rows="8" placeholder="마크다운으로 씁니다" class="mt-2 w-full resize-y bg-transparent text-[15px] leading-relaxed text-slate-800 focus:outline-none">${escapeHtml(material?.content || "")}</textarea>
          <div class="mt-2 flex justify-end gap-2">
            <button type="button" data-cancel class="rounded-full border border-slate-300 px-3 py-1 text-[13px] text-slate-600">취소</button>
            <button type="button" data-save class="rounded-full bg-apple px-3 py-1 text-[13px] text-white">저장</button>
          </div>
        </div>`;
      form.querySelector("[data-title]").focus();
      form.querySelector("[data-cancel]").addEventListener("click", () => form.classList.add("hidden"));
      form.querySelector("[data-save]").addEventListener("click", async () => {
        const payload = { kind: "note", title: form.querySelector("[data-title]").value.trim(), content: form.querySelector("[data-content]").value };
        const res = await fetch(material ? `/api/materials/${encodeURIComponent(material.id)}` : `/api/spaces/${encodeURIComponent(space.id)}/materials`, {
          method: material ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return toast((await res.json()).error || "Could not save");
        renderSpacePage();
      });
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
      renderTree();
      window.dispatchEvent(new CustomEvent("research:doc", { detail: { id, path: node.path } }));

      const url = new URL(location.href);
      url.searchParams.set("doc", id);
      history.replaceState(null, "", url);

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
      fetch("/api/opened", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => {});

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
      if (state.view === "workbench") return;
      if (state.view === "space") return renderSpacePage();
      if (state.view === "home") {
        applyHomeMode();
        autoResizeHome();
        setTimeout(() => $("#home-input")?.focus(), 60);
        return;
      }
      if (new URLSearchParams(location.search).get("material")) return;
      const doc = new URLSearchParams(location.search).get("doc") || localStorage.getItem("lastDoc");
      if (doc && state.nodeById.has(doc)) {
        if (await openFile(doc)) restoreDocScroll(doc);
        return;
      }
      $("#doc-content").innerHTML = `
        <div class="enter-fade py-24 text-center">
          <p class="text-[21px] font-semibold tracking-tight text-slate-800">자료</p>
          <p class="mt-2 text-[15px] font-light text-slate-500">위 목록에서 문서를 고르거나, 답변의 근거를 누르세요.</p>
        </div>`;
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
      toast("Quoted");
    }

    // Chat split layout
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
      document.querySelectorAll("#dl-langs [data-dl-lang]").forEach((b) => {
        const off = b.dataset.dlLang !== "orig" && !hasPair;
        b.disabled = off;
        b.classList.toggle("opacity-40", off);
        b.classList.toggle("cursor-not-allowed", off);
        b.title = off ? "This document has no translation" : "";
        b.setAttribute("aria-selected", b.dataset.dlLang === state.dlLang ? "true" : "false");
      });
      document.querySelectorAll("#dl-fmts [data-dl-fmt]").forEach((b) => {
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
      if (!btn) return;
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
        if (settings.sheet) {
          closeSheet({ cancel: true });
          return;
        }
        if (!$("#settings-modal")?.classList.contains("hidden")) {
          closeSettings();
          return;
        }
        if (isDownloadOpen()) {
          setDownloadOpen(false);
          return;
        }
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
    document.querySelectorAll("#dl-langs [data-dl-lang]").forEach((b) => {
      b.addEventListener("click", () => {
        state.dlLang = b.dataset.dlLang;
        renderDownloadChoices();
      });
    });
    document.querySelectorAll("#dl-fmts [data-dl-fmt]").forEach((b) => {
      b.addEventListener("click", () => {
        state.dlFmt = b.dataset.dlFmt;
        localStorage.setItem("dlFmt", state.dlFmt);
        renderDownloadChoices();
      });
    });
    on("#dl-go", "click", runDownload);
    on("#btn-settings", "click", openSettings);
    on("#btn-close-settings", "click", closeSettings);
    on("#settings-modal", "click", (e) => {
      if (e.target === $("#settings-modal")) closeSettings();
    });
    on("#login-cancel", "click", () => closeSheet({ cancel: true }));
    on("#login-submit", "click", submitCode);
    on("#login-paste", "keydown", (e) => { if (e.key === "Enter") submitCode(); });
    on("#login-copy", "click", () => navigator.clipboard?.writeText($("#login-code").textContent).then(() => toast("Code copied")));

    // init
    if (window.matchMedia("(max-width: 767px)").matches) {
      state.sidebarOpen = false;
    }
    applySidebar();
    updateDownload();
    applyDocZoom();
    applyChatZoom();
    initSidebarResizer();
    window.research = {
      openFile: (id) => openFile(id),
      current: () => (state.currentId ? { id: state.currentId, path: state.currentPath } : null),
      spacesChanged: loadSpaces,
      renderTree,
      toast,
    };
    loadSpaces();
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("booting")));
    loadTree().then(openDocFromUrl, (e) => {
      $("#tree").innerHTML = `<div class="p-3 text-xs text-slate-600">Could not load the document list. <code class="bg-slate-100 px-1 rounded">python3 server.py</code> Check that the server is running.<br/>${escapeHtml(e.message)}</div>`;
    });
