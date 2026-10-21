import { cx } from "@/lib/cx";
import Skeleton from "@/ui/Skeleton";

const WIDTHS = ["w-3/5", "w-4/5", "w-2/5"];

export default function PendingRows({ folder }: { folder?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      {WIDTHS.map((width) => (
        <div key={width} className={cx("flex h-8 items-center gap-1.5 pr-2", folder ? "pl-6" : "pl-2")}>
          <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-md" />
          <Skeleton className={width} />
        </div>
      ))}
    </div>
  );
}
