"use client";

import { useState } from "react";
import Button from "@/ui/Button";
import SectionHeader from "@/ui/SectionHeader";
import { applyZoom, MAX, MIN, readZoom, type Zoom } from "./zoom";

export default function GeneralPane() {
  return (
    <div className="space-y-6">
      <h3 className="text-[21px] font-semibold tracking-tight text-slate-900">General</h3>
      <ZoomControl zoom="docZoom" title="Document text size" />
      <ZoomControl zoom="chatZoom" title="Chat text size" />
    </div>
  );
}

function ZoomControl({ zoom, title }: { zoom: Zoom; title: string }) {
  const [value, setValue] = useState(() => readZoom(zoom));
  const change = (next: number) => setValue(applyZoom(zoom, next));
  const step = "h-8 w-8 rounded-full border border-slate-200 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40";
  return (
    <section>
      <SectionHeader title={title} size="sm" className="mb-2" />
      <div className="flex items-center gap-2">
        <button type="button" className={step} disabled={value <= MIN} aria-label={`Smaller ${title}`} onClick={() => change(value - 0.1)}>A−</button>
        <span className="min-w-[3.25rem] text-center font-mono text-[13px] font-semibold tabular-nums text-slate-800">{Math.round(value * 100)}%</span>
        <button type="button" className={step} disabled={value >= MAX} aria-label={`Larger ${title}`} onClick={() => change(value + 0.1)}>A+</button>
        <Button tone="quiet" size="sm" className="ml-1 h-8" onClick={() => change(1)}>Default</Button>
      </div>
    </section>
  );
}
