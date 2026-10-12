"use client";

import { cx } from "@/lib/cx";
import IconButton from "@/ui/IconButton";
import { kindLabel, type Item } from "@/lib/items";
import { useWorkbench } from "./WorkbenchProvider";

const nameOf = (item: Item) => item.title || (item.kind === "doc" && item.path?.split("/").pop()) || (item.kind === "chat" || item.kind === "agent" ? "새 대화" : "");

export default function PaneTabs() {
  const workbench = useWorkbench();
  const many = workbench.groups.length > 1;
  return (
    <div role="tablist" className="flex h-[34px] shrink-0 overflow-x-auto border-b border-slate-200 bg-slate-50 whitespace-nowrap [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
      {workbench.groups.map((group, index) => {
        const active = index === workbench.focus;
        const name = nameOf(group.item);
        return (
          <div key={group.id} className={cx("flex max-w-52 shrink-0 items-center gap-1.5 border-r px-2.5 transition-colors duration-200", active ? "border-slate-100 bg-white" : "border-slate-200 bg-slate-50")}>
            <button type="button" role="tab" aria-selected={active} title={name} onClick={() => workbench.focusGroup(group.id)} className="flex min-w-0 items-center gap-1.5 self-stretch focus:outline-none">
              {many && active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-apple" />}
              <span className={cx("text-[12px]", active ? "text-slate-400" : "text-slate-300")}>{kindLabel(group.item)}</span>
              <span className="text-[12px] text-slate-200">/</span>
              <span className={cx("min-w-0 truncate text-[12px]", active ? "text-slate-900" : "text-slate-500")}>{name}</span>
            </button>
            <IconButton icon="close" size="sm" label="닫기" onClick={() => workbench.close(group.id)} />
          </div>
        );
      })}
    </div>
  );
}
