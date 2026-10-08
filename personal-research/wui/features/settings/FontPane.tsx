"use client";

import { useEffect, useState } from "react";
import { listen } from "@/lib/events";
import Button from "@/ui/Button";
import KeyValue from "@/ui/KeyValue";
import SectionHeader from "@/ui/SectionHeader";
import { applyZoom, MAX, MIN, readZoom, type Zoom } from "./zoom";

export default function FontPane() {
  return (
    <div className="space-y-6">
      <h3 className="text-[21px] font-semibold tracking-tight text-slate-900">Font</h3>
      <section>
        <SectionHeader title="Text size" className="mb-2" />
        <ZoomControl zoom="docZoom" label="Document" />
        <ZoomControl zoom="chatZoom" label="Chat" />
      </section>
    </div>
  );
}

function ZoomControl({ zoom, label }: { zoom: Zoom; label: string }) {
  const [value, setValue] = useState(() => readZoom(zoom));
  const change = (next: number) => setValue(applyZoom(zoom, next));
  useEffect(() => listen("zoom", () => setValue(readZoom(zoom))), [zoom]);
  return (
    <KeyValue label={label}>
      <Button size="sm" disabled={value <= MIN} aria-label={`Smaller ${label.toLowerCase()} text`} onClick={() => change(value - 0.1)}>A−</Button>
      <span className="w-11 text-center tabular-nums">{Math.round(value * 100)}%</span>
      <Button size="sm" disabled={value >= MAX} aria-label={`Larger ${label.toLowerCase()} text`} onClick={() => change(value + 0.1)}>A+</Button>
      <Button tone="quiet" size="sm" onClick={() => change(1)}>Default</Button>
    </KeyValue>
  );
}
