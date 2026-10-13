"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import Icon from "./Icon";
import Menu from "./Menu";
import useEscape from "./useEscape";
import useOutside from "./useOutside";

type Props = { label: string; name: string; open: boolean; onToggle: () => void; onClose: () => void; up?: boolean; children: ReactNode };

export default function MenuButton({ label, name, open, onToggle, onClose, up, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [flip, setFlip] = useState(false);

  useOutside(box, onClose, open);
  useEscape(onClose, { when: open });

  useLayoutEffect(() => {
    if (!open) return setFlip(false);
    const menu = box.current?.querySelector("[role=menu]");
    if (menu && menu.getBoundingClientRect().left < 8) setFlip(true);
  }, [open]);

  return (
    <div ref={box} className="relative min-w-0 self-center">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={name}
        onClick={onToggle}
        className="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-1 text-[13px] whitespace-nowrap text-slate-500 transition duration-150 hover:bg-slate-50 hover:text-slate-800 aria-expanded:bg-slate-50 aria-expanded:text-slate-800"
      >
        <span className="truncate">{label}</span>
        <Icon name="down" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>
      {open && <Menu label={name} className={cx("absolute w-56 max-w-[calc(100vw-32px)]", flip ? "left-0" : "right-0", up ? "bottom-full mb-2" : "top-full mt-2")}>{children}</Menu>}
    </div>
  );
}
