"use client";

import { useState } from "react";
import type { Visual } from "@/lib/api";
import { cx } from "@/lib/cx";
import { plain } from "@/lib/math";
import { domain, FILLS, placeLabels } from "@/lib/visual";
import Axes, { framed, scales } from "./Axes";
import Legend from "./Legend";
import { useWidth } from "./useWidth";

export default function ScatterView({ visual }: { visual: Extract<Visual, { type: "scatter" }> }) {
  const { box, width } = useWidth();
  const [focus, setFocus] = useState<string | null>(null);
  const groups = [...new Set(visual.points.map((point) => point.group))];
  const color = (group: string) => FILLS[groups.indexOf(group) % FILLS.length];
  const height = Math.round(Math.min(380, Math.max(240, width * 0.6)));
  const frame = framed(width, height, visual.x_label, visual.y_label);
  const count = width < 420 ? 4 : 6;
  const x = domain(visual.points.map((point) => point.x), count);
  const y = domain(visual.points.map((point) => point.y), count);
  const { sx, sy } = scales(frame, x, y);
  const placed = placeLabels(visual.points.map((point) => ({ x: sx(point.x), y: sy(point.y), text: plain(point.label) })), width, height);

  return (
    <div ref={box} className="min-w-0">
      <Legend names={groups} counts={groups.map((group) => visual.points.filter((point) => point.group === group).length)} focus={focus} onFocus={setFocus} />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width, height }} role="img">
        <Axes frame={frame} x={x} y={y} sx={sx} sy={sy} xLabel={visual.x_label} yLabel={visual.y_label} />
        {groups.map((group) => {
          const members = visual.points.filter((point) => point.group === group);
          if (members.length < 2) return null;
          const cx0 = members.reduce((sum, point) => sum + sx(point.x), 0) / members.length;
          const cy0 = members.reduce((sum, point) => sum + sy(point.y), 0) / members.length;
          const rx = Math.max(...members.map((point) => Math.abs(sx(point.x) - cx0))) * Math.SQRT2 + 14;
          const ry = Math.max(...members.map((point) => Math.abs(sy(point.y) - cy0))) * Math.SQRT2 + 14;
          return <ellipse key={group} cx={cx0} cy={cy0} rx={rx} ry={ry} className={cx(color(group), "transition-opacity duration-150")} style={{ fillOpacity: focus && focus !== group ? 0.02 : 0.08 }} />;
        })}
        {visual.points.map((point, index) => (
          <g key={index} className="transition-opacity duration-150" style={{ opacity: focus !== null && focus !== point.group ? 0.25 : 1 }}>
            <circle cx={sx(point.x)} cy={sy(point.y)} r={5.5} strokeWidth={1.5} className={cx(color(point.group), "stroke-white")} />
            {placed[index] && <text x={placed[index].x} y={placed[index].y} textAnchor={placed[index].anchor} className="fill-slate-800 text-[12px]">{plain(point.label)}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}
