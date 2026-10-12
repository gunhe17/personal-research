import { cx } from "@/lib/cx";
import type { Step } from "@/lib/collect";
import StepMark from "./StepMark";

export default function Steps({ steps, className }: { steps: Step[]; className?: string }) {
  if (!steps.length) return null;
  return (
    <div className={className}>
      {steps.map((step, i) => (
        <div key={step.key} className={cx("enter-pop relative flex gap-2.5", i < steps.length - 1 && "pb-2.5")}>
          {i < steps.length - 1 && <span className="absolute top-[15px] bottom-0 left-[5px] w-px bg-slate-200" />}
          <span className="relative z-10 mt-[4px] flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-full bg-white">
            <StepMark state={step.state} />
          </span>
          <span className={cx("min-w-0 flex-1 text-[12px]", step.state === "skip" ? "text-slate-400" : step.state === "running" ? "sweep" : "text-slate-500")}>{step.text}</span>
          <span className="shrink-0 pt-px font-mono text-[11px] text-slate-300 tabular-nums">{step.took && step.took >= 1000 ? `${(step.took / 1000).toFixed(1)}s` : ""}</span>
        </div>
      ))}
    </div>
  );
}
