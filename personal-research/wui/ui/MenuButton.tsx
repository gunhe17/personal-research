"use client";

import { useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import Icon from "./Icon";
import Menu from "./Menu";
import useOutside from "./useOutside";

type Props = { label: string; name: string; open: boolean; onToggle: () => void; onClose: () => void; up?: boolean; children: ReactNode };

export default function MenuButton({ label, name, open, onToggle, onClose, up, children }: Props) {
  const box = useRef<HTMLDivElement>(null);

  useOutside(box, onClose, open);

  return (
    <div ref={box} className="relative shrink-0 self-center">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={name}
        onClick={onToggle}
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13px] whitespace-nowrap text-slate-500 transition duration-150 hover:bg-slate-50 hover:text-slate-800 aria-expanded:bg-slate-50 aria-expanded:text-slate-800"
      >
        {label}
        <Icon name="down" className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && <Menu label={name} className={cx("absolute right-0 w-56", up ? "bottom-full mb-2" : "top-full mt-2")}>{children}</Menu>}
    </div>
  );
}
