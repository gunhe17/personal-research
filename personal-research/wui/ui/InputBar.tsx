import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export default function InputBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="@container">
      <div className={cx("relative flex items-center gap-2.5 rounded-2xl bg-white p-2.5 ring-1 ring-slate-200 transition duration-150 @max-lg:flex-wrap focus-within:ring-2 focus-within:ring-apple/20", className)}>
        {children}
      </div>
    </div>
  );
}
