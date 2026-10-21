import { format } from "@/lib/number";
import { plain } from "@/lib/math";
import type { Domain } from "@/lib/visual";

export type Frame = { width: number; height: number; left: number; right: number; top: number; bottom: number };

type Props = { frame: Frame; x: Domain; y: Domain; sx: (v: number) => number; sy: (v: number) => number; xLabel: string; yLabel: string; origin?: boolean };

export default function Axes({ frame, x, y, sx, sy, xLabel, yLabel, origin }: Props) {
  const floor = frame.height - frame.bottom;
  const middle = (frame.top + floor) / 2;
  return (
    <g>
      {x.marks.map((mark) => (
        <g key={`x${mark}`}>
          <line x1={sx(mark)} x2={sx(mark)} y1={frame.top} y2={floor} className="stroke-slate-100" />
          <text x={sx(mark)} y={floor + 16} textAnchor="middle" className="fill-slate-400 text-[11px] tabular-nums">{format(mark, 3)}</text>
        </g>
      ))}
      {y.marks.map((mark) => (
        <g key={`y${mark}`}>
          <line x1={frame.left} x2={frame.width - frame.right} y1={sy(mark)} y2={sy(mark)} className="stroke-slate-100" />
          <text x={frame.left - 8} y={sy(mark) + 4} textAnchor="end" className="fill-slate-400 text-[11px] tabular-nums">{format(mark, 3)}</text>
        </g>
      ))}
      {origin && x.low < 0 && x.high > 0 && <line x1={sx(0)} x2={sx(0)} y1={frame.top} y2={floor} className="stroke-slate-300" />}
      {origin && y.low < 0 && y.high > 0 && <line x1={frame.left} x2={frame.width - frame.right} y1={sy(0)} y2={sy(0)} className="stroke-slate-300" />}
      <line x1={frame.left} x2={frame.width - frame.right} y1={floor} y2={floor} className="stroke-slate-200" />
      <line x1={frame.left} x2={frame.left} y1={frame.top} y2={floor} className="stroke-slate-200" />
      {xLabel && <text x={(frame.left + frame.width - frame.right) / 2} y={frame.height - 6} textAnchor="middle" className="fill-slate-500 text-[11px]">{plain(xLabel)}</text>}
      {yLabel && <text x={12} y={middle} transform={`rotate(-90 12 ${middle})`} textAnchor="middle" className="fill-slate-500 text-[11px]">{plain(yLabel)}</text>}
    </g>
  );
}

export function framed(width: number, height: number, xLabel: string, yLabel: string): Frame {
  return { width, height, left: yLabel ? 54 : 42, right: 16, top: 12, bottom: xLabel ? 42 : 26 };
}

export function scales(frame: Frame, x: Domain, y: Domain) {
  return {
    sx: (v: number) => frame.left + ((v - x.low) / (x.high - x.low)) * (frame.width - frame.left - frame.right),
    sy: (v: number) => frame.height - frame.bottom - ((v - y.low) / (y.high - y.low)) * (frame.height - frame.top - frame.bottom),
  };
}
