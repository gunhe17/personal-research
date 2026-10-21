"use client";

import { useId } from "react";
import type { Visual } from "@/lib/api";
import { cx } from "@/lib/cx";
import { layered } from "@/lib/graph";
import { plain } from "@/lib/math";
import { DOTS, FILLS, STROKES, textWidth } from "@/lib/visual";

const HEIGHT = 34;
const GAP = { layer: 64, node: 18 };

export default function GraphView({ visual }: { visual: Extract<Visual, { type: "graph" }> }) {
  const marker = useId();
  const right = visual.direction === "right";
  const ids = visual.nodes.map((node) => node.id);
  const known = new Set(ids);
  const edges = visual.edges.filter((edge) => known.has(edge.from) && known.has(edge.to) && edge.from !== edge.to);
  const { layer, order } = layered(ids, edges);
  const skips = edges.filter((edge) => Math.abs(layer.get(edge.to)! - layer.get(edge.from)!) > 1);
  const side = skips.length ? 44 + skips.length * 14 : 0;
  const node = new Map(visual.nodes.map((n) => [n.id, n]));
  const groups = [...new Set(visual.nodes.map((n) => n.group).filter(Boolean))];
  const size = (id: string) => Math.max(56, textWidth(plain(node.get(id)!.label), 13) + 28);
  const across = order.map((ids) => (right ? Math.max(...ids.map(size)) : HEIGHT));
  const along = order.map((ids) => ids.reduce((sum, id) => sum + (right ? HEIGHT : size(id)), 0) + GAP.node * (ids.length - 1));
  const span = Math.max(...along);
  const box = new Map<string, { x: number; y: number; w: number; h: number }>();
  let offset = 8;
  order.forEach((ids, depth) => {
    let cursor = (span - along[depth]) / 2 + 8;
    for (const id of ids) {
      const w = size(id);
      box.set(id, right ? { x: offset + (across[depth] - w) / 2, y: cursor, w, h: HEIGHT } : { x: cursor, y: offset, w, h: HEIGHT });
      cursor += (right ? HEIGHT : w) + GAP.node;
    }
    offset += across[depth] + GAP.layer;
  });
  const total = right ? { x: offset - GAP.layer + 8, y: span + 16 + side } : { x: span + 16 + side, y: offset - GAP.layer + 8 };

  const route = (from: string, to: string) => {
    const a = box.get(from)!;
    const b = box.get(to)!;
    const skip = skips.findIndex((edge) => edge.from === from && edge.to === to);
    if (skip >= 0) {
      const reach = 30 + skip * 14;
      if (right) {
        const [x1, y1, x2, y2] = [a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, b.y + b.h + 2];
        const low = Math.max(y1, y2) + reach;
        return { d: `M${x1},${y1} C${x1},${low} ${x2},${low} ${x2},${y2}`, mid: { x: (x1 + x2) / 2, y: low - reach * 0.25 } };
      }
      const [x1, y1, x2, y2] = [a.x + a.w, a.y + a.h / 2, b.x + b.w + 2, b.y + b.h / 2];
      const far = Math.max(x1, x2) + reach;
      return { d: `M${x1},${y1} C${far},${y1} ${far},${y2} ${x2},${y2}`, mid: { x: far - reach * 0.25, y: (y1 + y2) / 2 } };
    }
    const forward = right ? b.x > a.x : b.y > a.y;
    if (right) {
      const [x1, y1, x2, y2] = forward ? [a.x + a.w, a.y + a.h / 2, b.x - 2, b.y + b.h / 2] : [a.x + a.w / 2, a.y, b.x + b.w / 2, b.y - 2];
      const bend = forward ? (x2 - x1) / 2 : -40;
      return { d: forward ? `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}` : `M${x1},${y1} C${x1},${y1 + bend} ${x2},${y2 + bend} ${x2},${y2}`, mid: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 + (forward ? 0 : bend * 0.75) } };
    }
    const [x1, y1, x2, y2] = forward ? [a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, b.y - 2] : [a.x, a.y + a.h / 2, b.x - 2, b.y + b.h / 2];
    const bend = forward ? (y2 - y1) / 2 : -40;
    return { d: forward ? `M${x1},${y1} C${x1},${y1 + bend} ${x2},${y2 - bend} ${x2},${y2}` : `M${x1},${y1} C${x1 + bend},${y1} ${x2 + bend},${y2} ${x2},${y2}`, mid: { x: (x1 + x2) / 2 + (forward ? 0 : bend * 0.75), y: (y1 + y2) / 2 } };
  };

  return (
    <div className="overflow-x-auto">
      <svg width={total.x} height={total.y} viewBox={`0 0 ${total.x} ${total.y}`} style={{ width: total.x, height: total.y }} role="img">
        <defs>
          <marker id={marker} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="fill-slate-400" />
          </marker>
        </defs>
        {edges.map((edge, index) => (
          <path key={index} d={route(edge.from, edge.to).d} fill="none" strokeWidth={1.5} markerEnd={`url(#${marker})`} className="stroke-slate-400" />
        ))}
        {visual.nodes.map((n) => {
          const b = box.get(n.id)!;
          const index = groups.indexOf(n.group);
          return (
            <g key={n.id}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} className="fill-white" />
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} strokeWidth={1.25} className={index < 0 ? "fill-ice stroke-slate-300" : cx(FILLS[index % FILLS.length], STROKES[index % STROKES.length])} style={index < 0 ? undefined : { fillOpacity: 0.1 }} />
              <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 4.5} textAnchor="middle" className="fill-slate-800 text-[13px]">{plain(n.label)}</text>
            </g>
          );
        })}
        {edges.map((edge, index) => {
          if (!edge.label) return null;
          const { mid } = route(edge.from, edge.to);
          const w = textWidth(plain(edge.label), 11) + 10;
          return (
            <g key={`l${index}`}>
              <rect x={mid.x - w / 2} y={mid.y - 9} width={w} height={18} rx={9} className="fill-white stroke-slate-200" />
              <text x={mid.x} y={mid.y + 4} textAnchor="middle" className="fill-slate-500 text-[11px]">{plain(edge.label)}</text>
            </g>
          );
        })}
      </svg>
      {groups.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-slate-500">
          {groups.map((group, index) => (
            <span key={group} className="flex items-center gap-1.5">
              <span className={cx("h-2.5 w-2.5 rounded-sm", DOTS[index % DOTS.length])} />
              {group}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
