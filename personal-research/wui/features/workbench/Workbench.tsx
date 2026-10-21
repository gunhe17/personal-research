"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import Button from "@/ui/Button";
import useLeaving from "@/ui/useLeaving";
import usePresence from "@/ui/usePresence";
import ChatPane from "@/features/chat/ChatPane";
import DocPane from "@/features/doc/DocPane";
import MaterialPane from "@/features/material/MaterialPane";
import { fromQuery, itemKey, LIMIT, type Group, type Item, type Side } from "@/lib/items";
import PaneTabs from "./PaneTabs";
import { useWorkbench } from "./WorkbenchProvider";

const SIDES: Record<Side, string> = { left: "inset-y-0 left-0 right-1/2", right: "inset-y-0 left-1/2 right-0", center: "inset-0" };

export default function Workbench() {
  const router = useRouter();
  const params = useSearchParams();
  const workbench = useWorkbench();
  const opened = useRef(false);
  const grid = useRef<HTMLDivElement>(null);
  const { ready, groups, leaving } = workbench;
  const staying = useMemo(() => (ready ? groups.filter((group) => !leaving.includes(group.id)) : null), [ready, groups, leaving]);
  const entering = useLeaving(staying, (group) => group.id).filter((entry) => entry.entering).map((entry) => entry.key);
  const closing = leaving.length > 0;
  const shut = [...(entering.length < groups.length ? entering : []), ...(leaving.length < groups.length ? leaving : [])];
  const template = groups.map((group) => (shut.includes(group.id) ? "minmax(0, 0fr)" : "minmax(0, 1fr)")).join(" ");

  useLayoutEffect(() => {
    if (entering.length) grid.current?.getBoundingClientRect();
  });

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
        <div className="enter-fade flex flex-col items-center gap-2 text-[13px] text-slate-500">
          <span>열린 항목이 없습니다</span>
          <Button tone="link" size="md" onClick={() => router.push("/")}>홈으로</Button>
        </div>
      </Drop>
    );
  }
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <PaneTabs />
      <div
        ref={grid}
        className={cx("grid min-h-0 min-w-0 flex-1 gap-px bg-slate-100 transition-[grid-template-columns] motion-reduce:transition-none max-md:grid-cols-1!", closing ? "duration-200 ease-exit" : "duration-[260ms] ease-spring")}
        style={{ gridTemplateColumns: template }}
      >
        {workbench.groups.map((group, index) => (
          <section
            key={group.id}
            onPointerDownCapture={() => workbench.focusGroup(group.id)}
            className={cx("relative flex min-h-0 min-w-0 flex-col bg-white", leaving.includes(group.id) ? "overflow-hidden exit-veil" : "enter-fade", index !== workbench.focus && "max-md:hidden")}
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
    </div>
  );
}

function Pane({ group }: { group: Group }) {
  const key = itemKey(group.item);
  if (group.item.kind === "chat" || group.item.kind === "agent") return <ChatPane key={group.id} group={group} />;
  return (
    <div key={key} className="enter-fade flex min-h-0 flex-1 flex-col">
      {group.item.kind === "doc" ? <DocPane group={group} id={group.item.id} /> : <MaterialPane group={group} id={group.item.id} />}
    </div>
  );
}

function Drop({ children, className, full, onDrop }: { children: ReactNode; className: string; full: boolean; onDrop: (item: Item | null, side: Side, from: string | null) => void }) {
  const [side, setSide] = useState<Side | null>(null);
  const indicator = usePresence(Boolean(side), side);
  const accepts = (event: DragEvent) => [...event.dataTransfer.types].some((t) => t.startsWith("application/x-research"));
  const zone = (event: DragEvent): Side => {
    if (full && !event.dataTransfer.types.includes("application/x-research-group")) return "center";
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
      {indicator.mounted && indicator.content && <div className={cx("pointer-events-none absolute z-[6] border border-apple/35 bg-apple/10 transition-all duration-150 ease-spring", indicator.leaving ? "exit-fade" : "enter-fade", SIDES[indicator.content])} />}
    </div>
  );
}
