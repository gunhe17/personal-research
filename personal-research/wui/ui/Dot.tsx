import { cx } from "@/lib/cx";

export default function Dot({ on }: { on: boolean }) {
  return <span className={cx("inline-block h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-150", on ? "bg-ok" : "bg-slate-300")} />;
}
