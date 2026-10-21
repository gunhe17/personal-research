import type { Visual } from "@/lib/api";
import { cx } from "@/lib/cx";

export default function TokensView({ visual }: { visual: Extract<Visual, { type: "tokens" }> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {visual.items.map((item, index) => (
        <div key={index} className={cx("flex flex-col items-center rounded-md px-2.5 py-1 ring-1", item.highlight ? "bg-ice ring-apple" : "bg-slate-50 ring-slate-200")}>
          <span className={cx("font-mono text-[14px] whitespace-pre", item.highlight ? "text-apple-link" : "text-slate-800")}>{item.text.replace(/ /g, "␣")}</span>
          {item.id !== null && <span className="text-[11px] tabular-nums text-slate-400">{item.id}</span>}
        </div>
      ))}
    </div>
  );
}
