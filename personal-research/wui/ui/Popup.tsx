"use client";

import { useEffect, type ReactNode } from "react";

export default function Popup({ label, title, children, actions, onClose }: { label: string; title: string; children: ReactNode; actions: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/30 px-6" role="dialog" aria-label={label}>
      <div className="enter-rise w-full max-w-sm rounded-2xl bg-white p-6">
        <h4 className="text-[17px] font-semibold tracking-tight text-slate-900">{title}</h4>
        <div className="mt-1 text-[13px] text-slate-500">{children}</div>
        <div className="mt-5 flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}
