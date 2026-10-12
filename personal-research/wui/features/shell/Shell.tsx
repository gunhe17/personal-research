"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { api, type Account } from "@/lib/api";
import { listen } from "@/lib/events";
import { load, save } from "@/lib/storage";
import SettingsModal from "@/features/settings/SettingsModal";
import { applyZoom, readZoom } from "@/lib/zoom";
import Header from "./Header";
import LoginScreen from "./LoginScreen";
import Sidebar from "./Sidebar";

const clampWidth = (px: number) => Math.min(480, Math.max(200, Math.round(px)));

export default function Shell({ children }: { children: ReactNode }) {
  const [sidebar, setSidebar] = useState(false);
  const [width, setWidth] = useState(288);
  const [resizing, setResizing] = useState(false);
  const [settings, setSettings] = useState(false);
  const pane = useRef<HTMLDivElement>(null);
  const [account, setAccount] = useState<Account | null | undefined>(undefined);

  useEffect(() => {
    api.me().then(setAccount, () => setAccount(null));
    return listen("auth", () => setAccount(null));
  }, []);

  const showSidebar = (next: boolean) => {
    setSidebar(next);
    save("sidebarOpen", next);
  };
  const showSettings = (next: boolean) => {
    setSettings(next);
    save("settingsOpen", next, true);
  };

  useEffect(() => {
    setWidth(clampWidth(Number(load("sidebarWidth", 288)) || 288));
    setSidebar(load("sidebarOpen", false));
    setSettings(load("settingsOpen", false, true));
    applyZoom("docZoom", readZoom("docZoom"));
    applyZoom("chatZoom", readZoom("chatZoom"));
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("booting")));
    const keys = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const step = { "=": 0.1, "+": 0.1, "-": -0.1 }[event.key];
      if (step) {
        event.preventDefault();
        applyZoom("docZoom", readZoom("docZoom") + step);
      } else if (event.key === "0") {
        event.preventDefault();
        applyZoom("docZoom", 1);
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, []);

  useEffect(() => {
    const box = pane.current;
    const target = Number(load("sidebarScroll", 0, true)) || 0;
    if (!box?.firstElementChild || !target) return;
    const observer = new ResizeObserver(() => {
      if (box.scrollHeight - box.clientHeight < target) return;
      box.scrollTop = target;
      observer.disconnect();
    });
    observer.observe(box.firstElementChild);
    const timer = setTimeout(() => observer.disconnect(), 5000);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!resizing) return;
    const move = (event: MouseEvent) => setWidth(clampWidth(event.clientX));
    const stop = () => setResizing(false);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      save("sidebarWidth", width);
    };
  }, [resizing, width]);

  if (account === null) return <LoginScreen />;
  if (account === undefined) return null;
  return (
    <div className={cx("flex h-full flex-col", resizing && "cursor-col-resize select-none")}>
      <Header sidebar={sidebar} settings={settings} onSidebar={() => showSidebar(!sidebar)} onSettings={() => showSettings(true)} />
      <div className="relative flex min-h-0 flex-1">
        {sidebar && <div className="absolute inset-0 z-20 bg-slate-900/20 md:hidden" onClick={() => showSidebar(false)} />}
        <aside
          inert={!sidebar}
          className={cx("flex h-full shrink-0 flex-col overflow-hidden bg-white max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30", !resizing && "transition-all duration-300 ease-spring")}
          style={{ width: sidebar ? width : 0, opacity: sidebar ? 1 : 0 }}
        >
          <div ref={pane} onScroll={(event) => save("sidebarScroll", Math.round(event.currentTarget.scrollTop), true)} className="min-h-0 flex-1 overflow-y-auto text-sm" style={{ width }}>
            <Sidebar />
          </div>
        </aside>
        {sidebar && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            title="Drag to resize"
            onMouseDown={(event) => {
              event.preventDefault();
              setResizing(true);
            }}
            onDoubleClick={() => {
              setWidth(288);
              save("sidebarWidth", 288);
            }}
            className="relative z-20 w-px shrink-0 cursor-col-resize bg-slate-100 transition-colors hover:bg-slate-300 active:bg-apple max-md:hidden"
          >
            <div className="absolute inset-y-0 -right-2.5 -left-2.5" />
          </div>
        )}
        <div className="relative flex min-h-0 min-w-0 flex-1">{children}</div>
      </div>
      <SettingsModal open={settings} onClose={() => showSettings(false)} />
    </div>
  );
}
