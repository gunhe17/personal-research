import type { Visual } from "@/lib/api";
import { cx } from "@/lib/cx";
import { plain } from "@/lib/math";
import { format } from "@/lib/number";
import { textWidth } from "@/lib/visual";

export default function HeatmapView({ visual }: { visual: Extract<Visual, { type: "heatmap" }> }) {
  const cell = 44;
  const flat = visual.values.flat();
  const [low, high] = [Math.min(...flat), Math.max(...flat)];
  const share = (value: number) => (high === low ? 0.5 : (value - low) / (high - low));
  const left = Math.max(...visual.rows.map((label) => textWidth(plain(label), 11))) + 12;
  const tilted = visual.columns.some((label) => textWidth(plain(label), 11) > cell - 6);
  const top = tilted ? Math.min(Math.max(...visual.columns.map((label) => textWidth(plain(label), 11))) * 0.7 + 12, 90) : 22;
  const total = { x: left + visual.columns.length * cell + 2, y: top + visual.rows.length * cell + 2 };

  return (
    <svg width={total.x} height={total.y} viewBox={`0 0 ${total.x} ${total.y}`} style={{ width: total.x, height: total.y }} role="img">
      {visual.columns.map((label, j) => {
        const x = left + j * cell + cell / 2;
        return tilted
          ? <text key={j} x={x} y={top - 8} transform={`rotate(-40 ${x} ${top - 8})`} className="fill-slate-500 text-[11px]">{plain(label)}</text>
          : <text key={j} x={x} y={14} textAnchor="middle" className="fill-slate-500 text-[11px]">{plain(label)}</text>;
      })}
      {visual.rows.map((label, i) => (
        <g key={i}>
          <text x={left - 10} y={top + i * cell + cell / 2 + 4} textAnchor="end" className="fill-slate-500 text-[11px]">{plain(label)}</text>
          {visual.values[i].map((value, j) => (
            <g key={j}>
              <rect x={left + j * cell + 1} y={top + i * cell + 1} width={cell - 2} height={cell - 2} rx={4} className="fill-apple" style={{ fillOpacity: 0.06 + share(value) * 0.9 }} />
              <text x={left + j * cell + cell / 2} y={top + i * cell + cell / 2 + 4} textAnchor="middle" className={cx("text-[11px] tabular-nums", share(value) > 0.55 ? "fill-white" : "fill-slate-800")}>{format(value, 2)}</text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}
