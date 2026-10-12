import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

type Props = { size?: "sm" | "md" | "lg" } & Omit<ComponentProps<"input">, "size">;

const sizes = {
  sm: "min-w-0 flex-1 px-2.5 py-1 text-[13px]",
  md: "min-w-0 flex-1 px-3 py-1.5 text-[13px]",
  lg: "w-full px-3 py-2 text-[15px]",
};

export default function TextInput({ size = "sm", className, ...rest }: Props) {
  return (
    <input
      className={cx("rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-apple focus:bg-white focus:outline-none", sizes[size], className)}
      {...rest}
    />
  );
}
