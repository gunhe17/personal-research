import { cx } from "@/lib/cx";
import type { Step } from "@/lib/collect";

const MARKS: Record<string, string> = {
  done: "M4 12.5l5 5L20 6.5",
  skip: "M5 12h14",
  error: "M6 6l12 12M18 6L6 18",
};

export default function Steps({ steps, className }: { steps: Step[]; className?: string }) {
  if (!steps.length) return null;
  return (
    <div className={className}>
      {steps.map((step, i) => (
        <div key={step.key} className={cx("enter-pop relative flex gap-2.5", i < steps.length - 1 && "pb-2.5")}>
          {i < steps.length - 1 && <span className="absolute top-[15px] bottom-0 left-[5px] w-px bg-slate-200" />}
          <span className="relative z-10 mt-[4px] flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-full bg-white">
            {MARKS[step.state] ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cx("h-[11px] w-[11px]", step.state === "error" ? "text-red-500" : step.state === "skip" ? "text-slate-300" : "text-slate-400")}>
                <path d={MARKS[step.state]} />
              </svg>
            ) : (
              <span className="breathe block h-[7px] w-[7px] rounded-full bg-apple" />
            )}
          </span>
          <span className={cx("min-w-0 flex-1 text-[12px]", step.state === "skip" ? "text-slate-400" : step.state === "running" ? "sweep" : "text-slate-500")}>{step.text}</span>
          <span className="shrink-0 pt-px font-mono text-[10px] text-slate-300 tabular-nums">{step.took && step.took >= 1000 ? `${(step.took / 1000).toFixed(1)}s` : ""}</span>
        </div>
      ))}
    </div>
  );
}
