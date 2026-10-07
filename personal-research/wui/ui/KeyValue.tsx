import type { ReactNode } from "react";

export default function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center gap-3 py-1">
      <span className="w-24 shrink-0 text-[12px] text-slate-500">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-slate-800">{children}</div>
    </div>
  );
}
