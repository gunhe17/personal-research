"use client";

import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import IconButton from "@/ui/IconButton";
import useLeaving from "@/ui/useLeaving";
import { kindLabel, type Item } from "@/lib/items";
import { useWorkbench } from "./WorkbenchProvider";

const nameOf = (item: Item) => item.title || (item.kind === "doc" && item.path?.split("/").pop()) || (item.kind === "chat" || item.kind === "agent" ? "새 대화" : "");

export default function PaneTabs() {
  const workbench = useWorkbench();
  const many = workbench.groups.length > 1;
  const { groups, leaving } = workbench;
  const staying = useMemo(() => groups.filter((group) => !leaving.includes(group.id)), [groups, leaving]);
  const entering = useLeaving(staying, (group) => group.id).filter((entry) => entry.entering).map((entry) => entry.key);
  return (
    <div className="relative shrink-0 md:hidden">
      <div role="tablist" className="flex h-9 overflow-x-auto overflow-y-hidden border-b border-slate-200 bg-slate-50 whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {workbench.groups.map((group, index) => {
        const active = index === workbench.focus;
        const name = nameOf(group.item);
        return (
          <Tab key={group.id} entering={entering.includes(group.id)} leaving={leaving.includes(group.id)} className={cx("flex max-w-full flex-1 shrink-0 items-center gap-1.5 border-r pr-1 pl-2.5 transition-colors duration-150", leaving.includes(group.id) ? "exit-pop" : "enter-pop", active ? "border-slate-100 bg-white" : "border-slate-200 bg-slate-50")}>
            <button type="button" role="tab" aria-selected={active} title={name} onClick={() => workbench.focusGroup(group.id)} className="flex min-w-0 items-center gap-1.5 self-stretch focus:outline-none">
              {many && active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-apple" />}
              <span className={cx("text-[13px]", active ? "text-slate-400" : "text-slate-300")}>{kindLabel(group.item)}</span>
              <span className="text-[13px] text-slate-200">/</span>
              <span className={cx("min-w-0 truncate text-[13px]", active ? "text-slate-900" : "text-slate-500")}>{name}</span>
            </button>
            <div className="ml-auto flex items-center">
              {active && <span id={`tab-actions-${group.id}`} className="flex items-center empty:hidden" />}
              <IconButton icon="close" label="닫기" onClick={() => workbench.close(group.id)} />
            </div>
          </Tab>
        );
      })}
      </div>
      <div id="tab-menu" className="absolute top-full right-1 z-30" />
    </div>
  );
}

function Tab({ entering, leaving, className, children }: { entering: boolean; leaving: boolean; className: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const first = useRef(entering);
  useLayoutEffect(() => {
    const node = box.current;
    if (!node || !(leaving || first.current)) return;
    first.current = false;
    const style = getComputedStyle(node);
    const at = (width: number, open: boolean) => ({ flexGrow: 0, flexBasis: `${width}px`, minWidth: "0px", overflow: "hidden", paddingLeft: open ? style.paddingLeft : "0px", paddingRight: open ? style.paddingRight : "0px" });
    const width = node.getBoundingClientRect().width;
    if (leaving) node.animate([at(width, true), at(0, false)], { duration: 200, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" });
    else node.animate([at(0, false), at(width, true)], { duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
  }, [leaving]);
  return <div ref={box} className={className}>{children}</div>;
}
