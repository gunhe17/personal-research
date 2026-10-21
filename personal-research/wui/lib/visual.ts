export const FILLS = ["fill-apple", "fill-secant", "fill-ok", "fill-tangent", "fill-apple-signal", "fill-slate-500"];
export const STROKES = ["stroke-apple", "stroke-secant", "stroke-ok", "stroke-tangent", "stroke-apple-signal", "stroke-slate-500"];
export const DOTS = ["bg-apple", "bg-secant", "bg-ok", "bg-tangent", "bg-apple-signal", "bg-slate-500"];

export function textWidth(text: string, size = 12): number {
  return [...text].reduce((sum, char) => sum + (char.charCodeAt(0) > 0x2e80 ? size * 0.92 : size * 0.55), 0);
}

export type Domain = { low: number; high: number; marks: number[] };

export function domain(values: number[], count: number, pad = 0.12): Domain {
  const finite = values.filter(Number.isFinite);
  const [low, high] = finite.length ? [Math.min(...finite), Math.max(...finite)] : [0, 1];
  const margin = (high - low || Math.abs(high) || 1) * pad;
  return fitted(low - margin, high + margin, count);
}

export function fitted(low: number, high: number, count: number): Domain {
  const rough = (high - low) / count;
  const scale = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / scale;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * scale;
  const start = Math.floor(low / step) * step;
  const end = Math.ceil(high / step) * step;
  const marks: number[] = [];
  for (let v = start; v <= end + step / 100; v += step) marks.push(Math.abs(v) < step / 1e6 ? 0 : v);
  return { low: start, high: end, marks };
}

export type Spot = { x: number; y: number; text: string };
export type Placed = { x: number; y: number; anchor: "start" | "end" | "middle" } | null;

export function placeLabels(spots: Spot[], right: number, bottom: number, size = 12): Placed[] {
  const taken = spots.map((spot) => ({ x0: spot.x - 6, x1: spot.x + 6, y0: spot.y - 6, y1: spot.y + 6 }));
  return spots.map((spot) => {
    if (!spot.text) return null;
    const w = textWidth(spot.text, size);
    const options = [
      { x: spot.x + 9, y: spot.y + 4, anchor: "start" as const, x0: spot.x + 9, x1: spot.x + 9 + w },
      { x: spot.x - 9, y: spot.y + 4, anchor: "end" as const, x0: spot.x - 9 - w, x1: spot.x - 9 },
      { x: spot.x, y: spot.y - 10, anchor: "middle" as const, x0: spot.x - w / 2, x1: spot.x + w / 2 },
      { x: spot.x, y: spot.y + 18, anchor: "middle" as const, x0: spot.x - w / 2, x1: spot.x + w / 2 },
    ];
    const free = options.find((option) => {
      const area = { x0: option.x0, x1: option.x1, y0: option.y - size + 1, y1: option.y + 3 };
      return area.x0 >= 0 && area.x1 <= right && area.y0 >= 0 && area.y1 <= bottom && !taken.some((t) => area.x0 < t.x1 && area.x1 > t.x0 && area.y0 < t.y1 && area.y1 > t.y0);
    });
    if (!free) return null;
    taken.push({ x0: free.x0, x1: free.x1, y0: free.y - size + 1, y1: free.y + 3 });
    return { x: free.x, y: free.y, anchor: free.anchor };
  });
}
