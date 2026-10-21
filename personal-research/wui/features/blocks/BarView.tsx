"use client";

import type { Visual } from "@/lib/api";
import { cx } from "@/lib/cx";
import { plain } from "@/lib/math";
import { format } from "@/lib/number";
import { fitted, textWidth } from "@/lib/visual";
import { useWidth } from "./useWidth";

export default function BarView({ visual }: { visual: Extract<Visual, { type: "bar" }> }) {
  const { box, width } = useWidth();
  const values = visual.bars.map((bar) => bar.value);
  const scale = fitted(Math.min(0, ...values), Math.max(0, ...values), 4);
  const any = visual.bars.some((bar) => bar.highlight);
  const tone = (highlight: boolean) => cx("fill-apple", !highlight && any && "opacity-35");
  const sideways = visual.bars.length > 8 || visual.bars.some((bar) => textWidth(plain(bar.label)) > Math.max(48, (width - 60) / visual.bars.length - 8));

  if (sideways) {
    const left = Math.min(Math.max(...visual.bars.map((bar) => textWidth(plain(bar.label)))) + 14, width * 0.4);
    const right = 52;
    const row = 26;
    const height = visual.bars.length * row + 8;
    const sx = (v: number) => left + ((v - scale.low) / (scale.high - scale.low)) * (width - left - right);
    return (
      <div ref={box} className="min-w-0">
        {visual.y_label && <p className="m-0 mb-1 text-[11px] text-slate-500">{plain(visual.y_label)}</p>}
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width, height }} role="img">
          {visual.bars.map((bar, i) => {
            const [a, b] = [sx(Math.min(0, bar.value)), sx(Math.max(0, bar.value))];
            return (
              <g key={i}>
                <text x={left - 8} y={i * row + 18} textAnchor="end" className={cx("text-[12px]", bar.highlight ? "fill-apple-link font-semibold" : "fill-slate-700")}>{plain(bar.label)}</text>
                <rect x={a} y={i * row + 5} width={Math.max(1, b - a)} height={row - 10} rx={3} className={tone(bar.highlight)} />
                <text x={b + 6} y={i * row + 18} className="fill-slate-500 text-[11px] tabular-nums">{format(bar.value, 3)}</text>
              </g>
            );
          })}
          {scale.low < 0 && <line x1={sx(0)} x2={sx(0)} y1={0} y2={height} className="stroke-slate-300" />}
        </svg>
      </div>
    );
  }

  const height = 240;
  const frame = { left: 42, right: 8, top: 18, bottom: visual.x_label ? 46 : 30 };
  const slot = (width - frame.left - frame.right) / visual.bars.length;
  const sy = (v: number) => height - frame.bottom - ((v - scale.low) / (scale.high - scale.low)) * (height - frame.top - frame.bottom);
  return (
    <div ref={box} className="min-w-0">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width, height }} role="img">
        {scale.marks.map((mark) => (
          <g key={mark}>
            <line x1={frame.left} x2={width - frame.right} y1={sy(mark)} y2={sy(mark)} className={mark === 0 ? "stroke-slate-300" : "stroke-slate-100"} />
            <text x={frame.left - 8} y={sy(mark) + 4} textAnchor="end" className="fill-slate-400 text-[11px] tabular-nums">{format(mark, 3)}</text>
          </g>
        ))}
        {visual.bars.map((bar, i) => {
          const [top, bottom] = [sy(Math.max(0, bar.value)), sy(Math.min(0, bar.value))];
          const center = frame.left + slot * i + slot / 2;
          const w = Math.min(56, slot * 0.62);
          return (
            <g key={i}>
              <rect x={center - w / 2} y={top} width={w} height={Math.max(1, bottom - top)} rx={3} className={tone(bar.highlight)} />
              <text x={center} y={top - 5} textAnchor="middle" className="fill-slate-500 text-[11px] tabular-nums">{format(bar.value, 3)}</text>
              <text x={center} y={height - frame.bottom + 16} textAnchor="middle" className={cx("text-[12px]", bar.highlight ? "fill-apple-link font-semibold" : "fill-slate-700")}>{plain(bar.label)}</text>
            </g>
          );
        })}
        {visual.x_label && <text x={(frame.left + width - frame.right) / 2} y={height - 6} textAnchor="middle" className="fill-slate-500 text-[11px]">{plain(visual.x_label)}</text>}
        {visual.y_label && <text x={frame.left} y={10} className="fill-slate-500 text-[11px]">{plain(visual.y_label)}</text>}
      </svg>
    </div>
  );
}
