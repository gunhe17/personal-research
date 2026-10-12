"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import ChatPane from "@/features/chat/ChatPane";
import DocPane from "@/features/doc/DocPane";
import MaterialPane from "@/features/material/MaterialPane";
import { fromQuery, itemKey, LIMIT, type Group, type Item, type Side } from "@/lib/items";
import { useWorkbench } from "./WorkbenchProvider";

const SIDES: Record<Side, string> = { left: "inset-y-0 left-0 right-1/2", right: "inset-y-0 left-1/2 right-0", center: "inset-0" };

export default function Workbench() {
  const router = useRouter();
  const params = useSearchParams();
  const workbench = useWorkbench();
  const opened = useRef(false);

  useEffect(() => {
    if (!workbench.ready || opened.current) return;
    opened.current = true;
    const items = fromQuery(params);
    if (!items.length) return;
    workbench.open(items[0]);
    items.slice(1).forEach((item) => workbench.split(item, LIMIT, "right"));
    router.replace("/collected");
  }, [workbench, params, router]);

  const count = workbench.groups.length;
  if (!count) {
    return (
      <Drop className="flex flex-1 items-center justify-center bg-slate-50" onDrop={(item) => item && workbench.open(item)} full>
        <span />
      </Drop>
    );
  }
  return (
    <div className="grid min-h-0 min-w-0 flex-1 gap-px bg-slate-100 max-md:grid-cols-1!" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
      {workbench.groups.map((group, index) => (
        <section
          key={group.id}
          onPointerDownCapture={() => workbench.focusGroup(group.id)}
          className={cx("relative flex min-h-0 min-w-0 flex-col bg-white", index !== workbench.focus && "max-md:hidden")}
        >
          <Drop
            className="relative flex min-h-0 flex-1 flex-col"
            full={count >= LIMIT}
            onDrop={(item, side, from) => {
              if (from) return workbench.move(from, group.id, side);
              if (!item) return;
              if (side === "center") workbench.open(item, { group: index });
              else workbench.split(item, index, side);
            }}
          >
            <Pane group={group} />
          </Drop>
        </section>
      ))}
    </div>
  );
}

function Pane({ group }: { group: Group }) {
  const key = itemKey(group.item);
  if (group.item.kind === "doc") return <DocPane key={key} group={group} id={group.item.id} />;
  if (group.item.kind === "material") return <MaterialPane key={key} group={group} id={group.item.id} />;
  return <ChatPane key={group.id} group={group} />;
}

function Drop({ children, className, full, onDrop }: { children: ReactNode; className: string; full: boolean; onDrop: (item: Item | null, side: Side, from: string | null) => void }) {
  const [side, setSide] = useState<Side | null>(null);
  const accepts = (event: DragEvent) => [...event.dataTransfer.types].some((t) => t.startsWith("application/x-research"));
  const zone = (event: DragEvent): Side => {
    if (full) return "center";
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    return x < 0.25 ? "left" : x > 0.75 ? "right" : "center";
  };
  return (
    <div
      className={className}
      onDragOver={(event) => {
        if (!accepts(event)) return;
        event.preventDefault();
        setSide(zone(event));
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setSide(null);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const at = zone(event);
        setSide(null);
        const raw = event.dataTransfer.getData("application/x-research");
        const from = event.dataTransfer.getData("application/x-research-group") || null;
        let item: Item | null = null;
        try {
          item = raw ? (JSON.parse(raw) as Item) : null;
        } catch {}
        onDrop(item, at, from);
      }}
    >
      {children}
      {side && <div className={cx("pointer-events-none absolute z-[6] border border-apple/35 bg-apple/10 transition-all duration-150 ease-spring", SIDES[side])} />}
    </div>
  );
}
