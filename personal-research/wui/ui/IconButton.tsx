import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";
import Icon from "./Icon";

type Props = { icon: string; label: string; active?: boolean; size?: "md" | "sm" } & Omit<ComponentProps<"button">, "children">;

export default function IconButton({ icon, label, active, size = "md", className, ...rest }: Props) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cx(
        "touch inline-flex shrink-0 items-center justify-center transition duration-150 enabled:active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-apple/30",
        size === "md" ? "h-7 w-7 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900" : "h-[22px] w-[22px] rounded-md text-slate-400 hover:bg-pebble hover:text-slate-800",
        active && (size === "md" ? "text-apple" : "bg-pebble text-slate-800"),
        className,
      )}
      {...rest}
    >
      <Icon name={icon} className={size === "md" ? "h-[18px] w-[18px]" : "h-[14px] w-[14px]"} />
    </button>
  );
}
