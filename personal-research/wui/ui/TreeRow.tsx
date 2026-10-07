import type { DragEvent, ReactNode } from "react";
import { cx } from "@/lib/cx";
import Chevron from "./Chevron";
import Icon from "./Icon";

type Props = {
  label: string;
  icon?: ReactNode;
  variant?: "nav" | "folder" | "leaf";
  open?: boolean;
  active?: boolean;
  strong?: boolean;
  small?: boolean;
  count?: number;
  trailing?: ReactNode;
  title?: string;
  onClick: () => void;
  onDragStart?: (event: DragEvent) => void;
};

export default function TreeRow({ label, icon, variant = "folder", open = false, active, strong, small, count, trailing, title, onClick, onDragStart }: Props) {
  const glyph = typeof icon === "string" ? <Icon name={icon} className={variant === "nav" ? "h-4 w-4" : "h-3.5 w-3.5"} /> : icon;
  return (
    <button
      type="button"
      title={title || label}
      aria-expanded={variant === "folder" ? open : undefined}
      aria-selected={active}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onClick={onClick}
      className={cx(
        "flex w-full items-center rounded-lg text-left transition duration-150",
        variant === "nav" && cx("gap-2 px-2 py-1.5 text-sm", active ? "bg-apple font-medium text-white" : "text-slate-600 hover:bg-slate-50"),
        variant === "folder" && cx("gap-1.5 pr-2 pl-1 hover:bg-slate-50", small ? "py-1 text-[12px]" : "py-1.5 text-sm", strong ? "font-semibold text-slate-900" : "text-slate-700"),
        variant === "leaf" && cx("gap-1.5 py-1 pr-2 pl-9 text-[12px]", active ? "bg-ice text-apple-link" : "text-slate-600 hover:bg-slate-50"),
      )}
    >
      {variant === "folder" && <Chevron open={open} />}
      {glyph}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className="shrink-0 text-[10px] font-normal text-slate-400">{count}</span>}
      {trailing}
    </button>
  );
}
