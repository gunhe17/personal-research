"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import useEscape from "./useEscape";
import usePresence from "./usePresence";

type Props = { open: boolean; label: string; title: string; children: ReactNode; actions: ReactNode; onClose: () => void };

export default function Popup({ open, label, title, children, actions, onClose }: Props) {
  useEscape(onClose, { capture: true, when: open });
  const presence = usePresence(open, { title, children, actions });

  if (!presence.mounted || !presence.content) return null;
  return (
    <div className={cx("fixed inset-0 z-[60] grid place-items-center bg-slate-900/30 px-6", presence.leaving ? "exit-veil" : "enter-fade")} role="dialog" aria-label={label}>
      <div className={cx("w-full max-w-sm rounded-2xl bg-white p-6", presence.leaving ? "exit-rise" : "enter-rise")}>
        <h4 className="text-[17px] font-semibold tracking-tight text-slate-900">{presence.content.title}</h4>
        <div className="mt-1 text-[13px] text-slate-500">{presence.content.children}</div>
        <div className="mt-5 flex justify-end gap-2">{presence.content.actions}</div>
      </div>
    </div>
  );
}
