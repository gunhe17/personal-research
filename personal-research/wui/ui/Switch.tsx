import { cx } from "@/lib/cx";

export default function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} title={label} aria-label={label} onClick={onChange} className={cx("relative h-5 w-9 shrink-0 rounded-full transition", checked ? "bg-ok" : "bg-slate-200")}>
      <span className={cx("absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition", checked && "translate-x-4")} />
    </button>
  );
}
