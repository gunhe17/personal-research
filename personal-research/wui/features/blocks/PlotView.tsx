"use client";

import { useId, useState } from "react";
import type { Visual } from "@/lib/api";
import { cx } from "@/lib/cx";
import { compile } from "@/lib/expression";
import { plain } from "@/lib/math";
import { domain, fitted, placeLabels, STROKES } from "@/lib/visual";
import Axes, { framed, scales } from "./Axes";
import Legend from "./Legend";
import { useWidth } from "./useWidth";

type Line = { label: string; points: { x: number; y: number }[] };

export default function PlotView({ visual }: { visual: Extract<Visual, { type: "plot" }> }) {
  const { box, width } = useWidth();
  const clip = useId();
  const [focus, setFocus] = useState<string | null>(null);
  const height = Math.round(Math.min(400, Math.max(240, width * 0.6)));
  const frame = framed(width, height, visual.x_label, visual.y_label);
  const count = width < 420 ? 4 : 6;
  const x = fitted(visual.x_range.min, visual.x_range.max, count);
  const samples = Math.min(600, Math.max(160, width));
  const broken: string[] = [];
  const lines: Line[] = [
    ...visual.functions.map((fn) => {
      const compiled = compile(fn.expression);
      if (!compiled) {
        broken.push(fn.expression);
        return null;
      }
      return {
        label: fn.label || fn.expression,
        points: Array.from({ length: samples + 1 }, (_, i) => {
          const at = x.low + ((x.high - x.low) * i) / samples;
          return { x: at, y: compiled(at) };
        }),
      };
    }).filter((line): line is Line => line !== null),
    ...visual.series,
  ];
  const ys = [...lines.flatMap((line) => line.points.map((point) => point.y)), ...visual.points.map((point) => point.y)].filter(Number.isFinite).sort((a, b) => a - b);
  const robust = ys.length > 20 ? [ys[Math.floor(ys.length * 0.02)], ys[Math.ceil(ys.length * 0.98) - 1]] : ys;
  const y = visual.y_range ? fitted(visual.y_range.min, visual.y_range.max, count) : domain(robust, count, 0.08);
  const { sx, sy } = scales(frame, x, y);
  const span = y.high - y.low;
  const path = (points: { x: number; y: number }[]) =>
    points
      .map((point, i) => {
        const valid = Number.isFinite(point.y) && point.y > y.low - span * 4 && point.y < y.high + span * 4;
        const previous = points[i - 1];
        const joined = previous && Number.isFinite(previous.y) && Math.abs(point.y - previous.y) < span * 2;
        return valid ? `${joined ? "L" : "M"}${sx(point.x).toFixed(1)},${sy(point.y).toFixed(1)}` : "";
      })
      .join("");
  const placed = placeLabels(visual.points.map((point) => ({ x: sx(point.x), y: sy(point.y), text: plain(point.label) })), width, height);

  return (
    <div ref={box} className="min-w-0">
      <Legend names={lines.map((line) => line.label)} focus={focus} onFocus={setFocus} />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width, height }} role="img">
        <defs>
          <clipPath id={clip}>
            <rect x={frame.left} y={frame.top} width={width - frame.left - frame.right} height={height - frame.top - frame.bottom} />
          </clipPath>
        </defs>
        <Axes frame={frame} x={x} y={y} sx={sx} sy={sy} xLabel={visual.x_label} yLabel={visual.y_label} origin />
        <g clipPath={`url(#${clip})`}>
          {visual.marks.map((mark, index) => (
            <line key={`m${index}`} x1={sx(mark.x)} x2={sx(mark.x)} y1={frame.top} y2={height - frame.bottom} strokeDasharray="4 4" className="stroke-slate-400" />
          ))}
          {lines.map((line, index) => (
            <path key={index} d={path(line.points)} fill="none" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" className={cx(STROKES[index % STROKES.length], "transition-opacity duration-150")} style={{ opacity: focus && focus !== line.label ? 0.15 : 1 }} />
          ))}
          {visual.points.map((point, index) => (
            <circle key={`p${index}`} cx={sx(point.x)} cy={sy(point.y)} r={5} strokeWidth={1.5} className="fill-slate-800 stroke-white" />
          ))}
        </g>
        {visual.marks.map((mark, index) => mark.label && <text key={`ml${index}`} x={sx(mark.x) + 4} y={frame.top + 12} className="fill-slate-500 text-[11px]">{plain(mark.label)}</text>)}
        {visual.points.map((point, index) => placed[index] && <text key={`pl${index}`} x={placed[index].x} y={placed[index].y} textAnchor={placed[index].anchor} className="fill-slate-800 text-[12px]">{plain(point.label)}</text>)}
      </svg>
      {broken.length > 0 && <p className="m-0 mt-2 text-[12px] text-slate-500">그리지 못한 식: {broken.join(", ")}</p>}
    </div>
  );
}
