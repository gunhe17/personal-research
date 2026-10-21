import { cx } from "@/lib/cx";

type Props = { lines?: string[]; className?: string; label?: string };

export default function Skeleton({ lines, className, label = "불러오는 중" }: Props) {
  if (!lines) return <div role="status" aria-label={label} className={cx("skeleton h-3", !className?.includes("rounded") && "rounded-md", className)} />;
  return (
    <div role="status" aria-label={label} className={cx("flex flex-col gap-2.5", className)}>
      {lines.map((width, index) => (
        <div key={index} className={cx("skeleton h-3 rounded-md", width)} />
      ))}
    </div>
  );
}
