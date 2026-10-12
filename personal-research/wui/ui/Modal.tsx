"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import useEscape from "./useEscape";

export default function Modal({ open, onClose, label, children, className }: { open: boolean; onClose: () => void; label: string; children: ReactNode; className?: string }) {
  useEscape(onClose, { when: open });

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      className="enter-fade fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm max-sm:p-0"
    >
      <div className={cx("enter-rise relative w-full overflow-hidden rounded-2xl bg-white max-sm:h-full max-sm:max-w-none max-sm:rounded-none", className)}>{children}</div>
    </div>
  );
}
