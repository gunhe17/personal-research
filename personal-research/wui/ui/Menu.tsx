"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import usePresence from "./usePresence";

export default function Menu({ open, children, className, label }: { open: boolean; children: ReactNode; className?: string; label: string }) {
  const presence = usePresence(open, children);
  if (!presence.mounted) return null;
  return (
    <div role="menu" aria-label={label} className={cx("z-30 flex flex-col gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200", presence.leaving ? "exit-pop" : "enter-pop", className)}>
      {presence.content}
    </div>
  );
}

export function MenuItem({ title, hint, icon, selected, onPick }: { title: string; hint?: string; icon?: ReactNode; selected?: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-selected={selected}
      onPointerDown={(event) => event.preventDefault()}
      onClick={onPick}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-50 aria-selected:bg-slate-50"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-slate-800">{title}</span>
        {hint && <span className="block truncate text-[11px] text-slate-400">{hint}</span>}
      </span>
    </button>
  );
}
