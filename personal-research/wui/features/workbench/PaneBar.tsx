"use client";

import { useEffect, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import IconButton from "@/ui/IconButton";
import { kindLabel, type Group } from "@/lib/items";
import { useWorkbench } from "./WorkbenchProvider";

export default function PaneBar({ group, name, title, actions }: { group: Group; name: string; title?: string; actions?: ReactNode }) {
  const workbench = useWorkbench();
  const many = workbench.groups.length > 1;
  const active = !many || workbench.groups[workbench.focus]?.id === group.id;
  const { rename } = workbench;
  useEffect(() => {
    if (name) rename(group.id, name);
  }, [name, group.id, rename]);
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/x-research-group", group.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className={cx("flex h-[34px] shrink-0 cursor-grab items-center gap-1.5 border-b px-2.5 transition-colors duration-200 select-none max-md:justify-end", !actions && "max-md:hidden", active ? "border-slate-100 bg-white" : "border-slate-200 bg-slate-50")}
    >
      {many && active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-apple max-md:hidden" />}
      <span className={cx("text-[12px] max-md:hidden", active ? "text-slate-400" : "text-slate-300")}>{kindLabel(group.item)}</span>
      <span className="text-[12px] text-slate-200 max-md:hidden">/</span>
      <span title={title || name} className={cx("mr-auto min-w-0 truncate text-[12px] max-md:hidden", active ? "text-slate-900" : "text-slate-500")}>{name}</span>
      {actions}
      <IconButton icon="close" size="sm" label="닫기" className="max-md:hidden" onClick={() => workbench.close(group.id)} />
    </div>
  );
}
