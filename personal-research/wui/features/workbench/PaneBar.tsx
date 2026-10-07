"use client";

import type { ReactNode } from "react";
import IconButton from "@/ui/IconButton";
import { kindLabel, type Group } from "./items";
import { useWorkbench } from "./WorkbenchProvider";

export default function PaneBar({ group, name, title, actions }: { group: Group; name: string; title?: string; actions?: ReactNode }) {
  const workbench = useWorkbench();
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/x-research-group", group.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className="flex h-[34px] shrink-0 cursor-grab items-center gap-1.5 border-b border-slate-100 px-2.5 select-none"
    >
      <span className="text-[12px] text-slate-400">{kindLabel(group.item)}</span>
      <span className="text-[12px] text-slate-200">/</span>
      <span title={title || name} className="mr-auto min-w-0 truncate text-[12px] text-slate-700">{name}</span>
      {actions}
      <IconButton icon="close" size="sm" label="닫기" onClick={() => workbench.close(group.id)} />
    </div>
  );
}
