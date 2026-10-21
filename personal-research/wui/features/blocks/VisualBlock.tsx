"use client";

import type { Visual } from "@/lib/api";
import BarView from "./BarView";
import GraphView from "./GraphView";
import HeatmapView from "./HeatmapView";
import PlotView from "./PlotView";
import ScatterView from "./ScatterView";
import TableView from "./TableView";
import TokensView from "./TokensView";
import Inline from "./Inline";
import VectorsView from "./VectorsView";

export default function VisualBlock({ visual, caption }: { visual: Visual; caption: string }) {
  return (
    <figure className="visual" aria-label={caption || visual.type}>
      <p className="m-0 mb-3 text-[11px] font-semibold tracking-[0.08em] text-slate-800">{visual.type.toUpperCase()}</p>
      {visual.type === "heatmap" && <HeatmapView visual={visual} />}
      {visual.type === "scatter" && <ScatterView visual={visual} />}
      {visual.type === "tokens" && <TokensView visual={visual} />}
      {visual.type === "plot" && <PlotView visual={visual} />}
      {visual.type === "bar" && <BarView visual={visual} />}
      {visual.type === "vectors" && <VectorsView visual={visual} />}
      {visual.type === "table" && <TableView visual={visual} />}
      {visual.type === "graph" && <GraphView visual={visual} />}
      {caption && <figcaption className="mt-3 text-[12px] text-slate-500"><Inline text={caption} /></figcaption>}
    </figure>
  );
}
