import { cx } from "@/lib/cx";

export default function Chevron({ open }: { open: boolean }) {
  return (
    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-slate-400">
      <svg viewBox="0 0 16 16" className={cx("h-3 w-3 transition-transform duration-200 ease-spring", open && "rotate-90")} aria-hidden="true">
        <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
