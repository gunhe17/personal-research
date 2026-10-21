import { format } from "@/lib/number";
import { fitted } from "@/lib/visual";

type ChartProps = {
  width: number;
  clip: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zoom: boolean;
  secant: boolean;
  tangent: boolean;
  average: number;
  loss: (v: number) => number;
  grad: (v: number) => number;
};

export default function Chart({ width, clip, x, y, w, h, zoom, secant, tangent, average, loss, grad }: ChartProps) {
  const pad = { l: 52, r: width - 20, t: 20, b: 281 };
  const target = y / x;
  const span = Math.max(Math.abs(h), 0.12);
  const low = zoom ? Math.min(w, w + h) - span * 0.5 : Math.min(target - 2, w - 0.5, w + h - 0.25);
  const high = zoom ? Math.max(w, w + h) + span * 0.5 : Math.max(target + 2, w + 0.5, w + h + 0.25);
  const samples = Array.from({ length: 160 }, (_, i) => low + ((high - low) * i) / 159);
  const values = samples.map(loss);
  let bottom = zoom ? Math.min(...values) : 0;
  let top = Math.max(...values);
  const extra = Math.max((top - bottom) * 0.13, 0.04);
  bottom -= extra * 0.4;
  top += extra;
  const X = (v: number) => pad.l + ((v - low) / (high - low)) * (pad.r - pad.l);
  const Y = (v: number) => pad.b - ((v - bottom) / (top - bottom)) * (pad.b - pad.t);
  const line = (slope: number) => ({ x1: X(low), x2: X(high), y1: Y(loss(w) + slope * (low - w)), y2: Y(loss(w) + slope * (high - w)) });

  return (
    <svg className="chart" role="img" viewBox={`0 0 ${width} 330`}>
      <title>{`w=${format(w)}, 손실=${format(loss(w))}, 기울기=${format(grad(w))}`}</title>
      <defs>
        <clipPath id={clip}>
          <rect x={pad.l} y={pad.t} width={pad.r - pad.l} height={pad.b - pad.t} />
        </clipPath>
      </defs>
      {fitted(bottom, top, 4).marks.filter((v) => v >= bottom - 1e-9 && v <= top + 1e-9).map((v) => (
        <g key={`y${v}`}>
          <line x1={pad.l} x2={pad.r} y1={Y(v)} y2={Y(v)} stroke="var(--color-slate-100)" />
          <text x={pad.l - 9} y={Y(v) + 4} textAnchor="end">{format(v, 3)}</text>
        </g>
      ))}
      {fitted(low, high, width < 500 ? 4 : 6).marks.filter((v) => v >= low - 1e-9 && v <= high + 1e-9).map((v) => (
        <g key={`x${v}`}>
          <line x1={X(v)} x2={X(v)} y1={pad.t} y2={pad.b} stroke="var(--color-slate-50)" />
          <text x={X(v)} y={pad.b + 20} textAnchor="middle">{format(v, 3)}</text>
        </g>
      ))}
      <text x={pad.l} y={12} className="axis">손실 L(w)</text>
      <text x={(pad.l + pad.r) / 2} y={325} textAnchor="middle" className="axis">파라미터 w</text>
      <g clipPath={`url(#${clip})`}>
        <path d={samples.map((v, i) => `${i ? "L" : "M"}${X(v)},${Y(loss(v))}`).join(" ")} fill="none" stroke="var(--color-apple)" strokeWidth={3} />
        {tangent && <line {...line(grad(w))} stroke="var(--color-tangent)" strokeWidth={2.3} strokeDasharray="3 5" />}
        {secant && <line {...line(average)} stroke="var(--color-secant)" strokeWidth={2.3} strokeDasharray="7 5" />}
        {secant && <circle cx={X(w + h)} cy={Y(loss(w + h))} r={5} fill="var(--color-secant)" stroke="white" strokeWidth={2} />}
        <circle cx={X(w)} cy={Y(loss(w))} r={6} fill="var(--color-apple)" stroke="white" strokeWidth={2.5} />
        <text x={Math.min(pad.r - 105, X(w) + 10)} y={Math.max(pad.t + 15, Y(loss(w)) - 13)} className="point">{`w = ${format(w, 2)}`}</text>
      </g>
    </svg>
  );
}
