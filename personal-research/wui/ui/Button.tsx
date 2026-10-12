import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

const TONES = {
  fill: "bg-apple text-white hover:bg-apple-hover",
  line: "border border-apple-link text-apple-link hover:bg-white",
  quiet: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  link: "text-apple-link hover:underline underline-offset-2",
};

const SIZES = {
  sm: "px-3 py-1 text-[12px]",
  md: "px-3 py-1 text-[13px]",
  lg: "px-4 py-1.5 text-[15px]",
};

type Props = {
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"button">, "className" | "children">;

export default function Button({ tone = "line", size = "md", className, children, ...rest }: Props) {
  const classes = cx(
    "inline-flex shrink-0 items-center justify-center gap-1 transition duration-150 disabled:opacity-40",
    tone === "link" ? "text-[12px]" : cx("rounded-full", SIZES[size]),
    TONES[tone],
    className,
  );
  return <button type="button" className={classes} {...rest}>{children}</button>;
}
