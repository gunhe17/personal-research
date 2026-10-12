import { cx } from "@/lib/cx";

export default function Hint({ text, small, indent }: { text: string; small?: boolean; indent?: boolean }) {
  return <div className={cx("flex h-8 items-center text-slate-400", small ? "text-[11px]" : "text-[12px]", indent ? "pr-2 pl-9" : "px-2")}>{text}</div>;
}
