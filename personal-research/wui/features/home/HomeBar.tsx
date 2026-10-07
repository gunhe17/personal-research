"use client";

import { useEffect, useRef, useState } from "react";
import { load, save } from "@/lib/storage";
import InputBar from "@/ui/InputBar";
import { MenuItem } from "@/ui/Menu";
import MenuButton from "@/ui/MenuButton";
import SendButton from "@/ui/SendButton";

export type Mode = "ask" | "collect";

const MODES: { value: Mode; title: string; hint: string }[] = [
  { value: "ask", title: "ask", hint: "Answer from collected documents" },
  { value: "collect", title: "collect", hint: "Fetch a URL and translate it" },
];

export default function HomeBar({ busy, onSend }: { busy: boolean; onSend: (text: string, mode: Mode) => Promise<boolean> }) {
  const [mode, setMode] = useState<Mode>("ask");
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMode(load<Mode>("homeMode", "ask"));
    input.current?.focus();
  }, []);

  useEffect(() => {
    const box = input.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(240, Math.max(34, box.scrollHeight))}px`;
  }, [text]);

  const pick = (next: Mode) => {
    setMode(next);
    save("homeMode", next);
    setMenu(false);
    input.current?.focus();
  };

  const send = async () => {
    const value = text.trim();
    if (!value || busy) return;
    if (await onSend(value, mode)) setText("");
  };

  return (
    <InputBar className="mt-8">
      <textarea
        ref={input}
        rows={1}
        value={text}
        placeholder={mode === "ask" ? "Ask anything" : "Paste a URL…"}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            pick(mode === "ask" ? "collect" : "ask");
          } else if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            send();
          }
        }}
        className="max-h-60 min-w-0 flex-1 resize-none self-center overflow-y-auto bg-transparent px-1 py-1 text-[17px] leading-normal text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
      <MenuButton label={mode} name="Mode" open={menu} onToggle={() => setMenu(!menu)} onClose={() => setMenu(false)}>
        {MODES.map((m) => <MenuItem key={m.value} title={m.title} hint={m.hint} selected={m.value === mode} onPick={() => pick(m.value)} />)}
      </MenuButton>
      <SendButton disabled={busy} onClick={send} />
    </InputBar>
  );
}
