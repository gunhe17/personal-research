"use client";

import { useEffect, useState, type RefObject } from "react";
import type { ModelCatalog } from "@/lib/api";
import InputBar from "@/ui/InputBar";
import Menu, { MenuItem } from "@/ui/Menu";
import SendButton from "@/ui/SendButton";
import ModelPicker, { type Choice } from "./ModelPicker";

export const COMMANDS = [
  { name: "/next", hint: "다음 학습 단계로 넘어갑니다", kind: "next" },
  { name: "/retrieval", hint: "배운 내용을 내 말로 설명하고 점검받습니다", kind: "retrieval" },
];

export function commanded(text: string) {
  return COMMANDS.find((c) => text === c.name || text.startsWith(`${c.name} `));
}

type Props = {
  value: string;
  sending: boolean;
  catalog: ModelCatalog | null;
  choice: Choice | null;
  input: RefObject<HTMLTextAreaElement | null>;
  onPick: (choice: Choice) => void;
  onChange: (value: string) => void;
  onSend: () => void;
};

export default function Composer({ value, sending, catalog, choice, input, onPick, onChange, onSend }: Props) {
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  const matches = /^\/\S*$/.test(value) ? COMMANDS.filter((c) => c.name.startsWith(value.toLowerCase())) : [];
  const shown = !hidden && matches.length > 0;

  useEffect(() => {
    const box = input.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(box.scrollHeight, 180)}px`;
  }, [value, input]);

  const choose = (name: string) => {
    onChange(`${name} `);
    setHidden(true);
    input.current?.focus();
  };

  return (
    <InputBar>
      {shown && (
        <Menu label="명령어" className="absolute right-0 bottom-full left-0 mb-2">
          {matches.map((command, i) => <MenuItem key={command.name} title={command.name} hint={command.hint} selected={i === Math.min(index, matches.length - 1)} onPick={() => choose(command.name)} />)}
        </Menu>
      )}
      <textarea
        ref={input}
        rows={1}
        maxLength={10000}
        value={value}
        aria-label="메시지"
        placeholder="질문 · / 로 명령어"
        onChange={(event) => {
          setIndex(0);
          setHidden(false);
          onChange(event.target.value);
        }}
        onBlur={() => setHidden(true)}
        onFocus={() => setHidden(false)}
        onKeyDown={(event) => {
          const composing = event.nativeEvent.isComposing;
          if (shown && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setIndex((i) => (i + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length);
          } else if (shown && (event.key === "Enter" || event.key === "Tab") && !composing) {
            event.preventDefault();
            choose(matches[Math.min(index, matches.length - 1)].name);
          } else if (shown && event.key === "Escape") {
            setHidden(true);
          } else if (event.key === "Enter" && !event.shiftKey && !composing) {
            event.preventDefault();
            onSend();
          }
        }}
        className="max-h-[180px] min-w-0 flex-1 resize-none self-center bg-transparent px-1 py-1 text-[17px] leading-normal text-slate-900 placeholder:text-slate-400 focus:outline-none"
        style={{ fontSize: "calc(17px * var(--chat-zoom))" }}
      />
      {catalog && choice && <ModelPicker catalog={catalog} choice={choice} onPick={onPick} />}
      <SendButton disabled={sending} onClick={onSend} />
    </InputBar>
  );
}
