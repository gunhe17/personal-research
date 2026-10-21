import { cx } from "@/lib/cx";
import { DOTS } from "@/lib/visual";
import Inline from "./Inline";

type Props = { names: string[]; counts?: number[]; focus: string | null; onFocus: (name: string | null) => void };

export default function Legend({ names, counts, focus, onFocus }: Props) {
  if (names.length < 2) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {names.map((name, index) => (
        <button
          key={name}
          type="button"
          onMouseEnter={() => onFocus(name)}
          onMouseLeave={() => onFocus(null)}
          onFocus={() => onFocus(name)}
          onBlur={() => onFocus(null)}
          className={cx("flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] ring-1 ring-slate-200 transition duration-150", focus && focus !== name ? "text-slate-400" : "text-slate-700")}
        >
          <span className={cx("h-2 w-2 rounded-full", DOTS[index % DOTS.length])} />
          {name ? <Inline text={name} /> : "—"}
          {counts && <span className="text-[11px] tabular-nums text-slate-400">{counts[index]}</span>}
        </button>
      ))}
    </div>
  );
}
