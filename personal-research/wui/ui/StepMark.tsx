import { cx } from "@/lib/cx";

const MARKS: Record<string, string> = {
  done: "M4 12.5l5 5L20 6.5",
  skip: "M5 12h14",
  error: "M6 6l12 12M18 6L6 18",
};

export default function StepMark({ state }: { state: string }) {
  if (MARKS[state]) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cx("h-[11px] w-[11px]", state === "error" ? "text-red-500" : state === "skip" ? "text-slate-300" : "text-slate-400")}>
        <path d={MARKS[state]} />
      </svg>
    );
  }
  if (state === "idle") return <span className="block h-[7px] w-[7px] rounded-full border border-slate-300" />;
  return <span className="breathe block h-[7px] w-[7px] rounded-full bg-apple" />;
}
