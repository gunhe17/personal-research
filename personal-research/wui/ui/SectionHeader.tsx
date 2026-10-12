import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export default function SectionHeader({ title, count, children, size = "md", className }: { title: string; count?: number; children?: ReactNode; size?: "sm" | "md"; className?: string }) {
  return (
    <div className={cx("flex items-center gap-1.5 max-sm:flex-wrap", className)}>
      <h2 className={cx("flex-1 font-semibold uppercase tracking-wide text-slate-500", size === "md" ? "text-[13px]" : "text-[11px]")}>
        {title}
        {count !== undefined && <span className="ml-1.5 font-normal text-slate-400">{count}</span>}
      </h2>
      {children}
    </div>
  );
}
