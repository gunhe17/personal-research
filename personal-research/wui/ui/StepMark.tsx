import { cx } from "@/lib/cx";

const MARKS: Record<string, string> = {
  done: "M4 12.5l5 5L20 6.5",
  skip: "M5 12h14",
  error: "M6 6l12 12M18 6L6 18",
};

export default function StepMark({ state }: { state: string }) {
  const mark = MARKS[state];
  return (
    <span className="grid h-[11px] w-[11px] place-items-center *:col-start-1 *:row-start-1 *:transition-opacity *:duration-150">
      <span className={cx("h-[7px] w-[7px] rounded-full border border-slate-300", state !== "idle" && "opacity-0")} />
      <span className={cx(mark || state === "idle" ? "opacity-0" : "opacity-100")}>
        <span className="breathe block h-[7px] w-[7px] rounded-full bg-apple" />
      </span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cx("h-[11px] w-[11px]", !mark && "opacity-0", state === "error" ? "text-red-500" : state === "skip" ? "text-slate-300" : "text-slate-400")}>
        <path d={mark ?? MARKS.done} />
      </svg>
    </span>
  );
}
