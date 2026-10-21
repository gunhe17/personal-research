"use client";

import { useId } from "react";
import type { Visual } from "@/lib/api";
import { cx } from "@/lib/cx";
import { plain } from "@/lib/math";
import { type Domain, fitted, FILLS, placeLabels, STROKES } from "@/lib/visual";
import Axes, { scales } from "./Axes";
import { useWidth } from "./useWidth";

export default function VectorsView({ visual }: { visual: Extract<Visual, { type: "vectors" }> }) {
  const { box, width } = useWidth();
  const marker = useId();
  const size = Math.min(width, 420);
  const xs = [0, ...visual.vectors.flatMap((v) => [v.from_x, v.from_x + v.x])];
  const ys = [0, ...visual.vectors.flatMap((v) => [v.from_y, v.from_y + v.y])];
  const reach = Math.max(1, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.2;
  const centered = (values: number[]) => {
    const middle = (Math.max(...values) + Math.min(...values)) / 2;
    return fitted(middle - reach / 2, middle + reach / 2, size < 360 ? 4 : 5);
  };
  const [rx, ry] = [centered(xs), centered(ys)];
  const span = Math.max(rx.high - rx.low, ry.high - ry.low);
  const square = (range: Domain) => ({ low: range.low, high: range.low + span, marks: fitted(range.low, range.low + span, size < 360 ? 4 : 5).marks.filter((mark) => mark <= range.low + span + 1e-9) });
  const [x, y] = [square(rx), square(ry)];
  const frame = { width: size, height: size, left: 36, right: 12, top: 12, bottom: 26 };
  const { sx, sy } = scales(frame, x, y);
  const tips = visual.vectors.map((v) => {
    const length = Math.hypot(v.x, v.y) || 1;
    return { x: sx(v.from_x + v.x) + (v.x / length) * 10, y: sy(v.from_y + v.y) - (v.y / length) * 10, text: plain(v.label) };
  });
  const placed = placeLabels(tips, size, size, 13);

  return (
    <div ref={box} className="min-w-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} role="img">
        <defs>
          {visual.vectors.map((_, index) => (
            <marker key={index} id={`${marker}${index}`} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className={FILLS[index % FILLS.length]} />
            </marker>
          ))}
        </defs>
        <Axes frame={frame} x={x} y={y} sx={sx} sy={sy} xLabel="" yLabel="" origin />
        {visual.vectors.map((v, index) => (
          <line key={index} x1={sx(v.from_x)} y1={sy(v.from_y)} x2={sx(v.from_x + v.x)} y2={sy(v.from_y + v.y)} strokeWidth={2.5} strokeLinecap="round" markerEnd={`url(#${marker}${index})`} className={STROKES[index % STROKES.length]} />
        ))}
        {visual.vectors.map((v, index) => placed[index] && (
          <text key={`l${index}`} x={placed[index].x} y={placed[index].y} textAnchor={placed[index].anchor} className={cx("text-[13px] font-semibold", FILLS[index % FILLS.length])}>{plain(v.label)}</text>
        ))}
      </svg>
    </div>
  );
}
