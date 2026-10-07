"use client";

import { useEffect, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export default function Modal({ open, onClose, label, children, className }: { open: boolean; onClose: () => void; label: string; children: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      className="enter-fade fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div className={cx("enter-rise relative w-full overflow-hidden rounded-2xl bg-white", className)}>{children}</div>
    </div>
  );
}
