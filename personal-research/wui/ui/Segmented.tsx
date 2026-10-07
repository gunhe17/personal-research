import { cx } from "@/lib/cx";

type Option<T extends string> = { value: T; label: string; disabled?: boolean; title?: string };

export default function Segmented<T extends string>({ options, value, onChange, label, className }: { options: Option<T>[]; value: T; onChange: (value: T) => void; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cx("inline-flex items-center rounded-full bg-slate-100 p-0.5", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-selected={option.value === value}
          disabled={option.disabled}
          title={option.title}
          onClick={() => onChange(option.value)}
          className="rounded-full px-3 py-1 text-[12px] text-slate-600 transition duration-150 hover:text-slate-900 disabled:opacity-40 aria-selected:bg-white aria-selected:font-medium aria-selected:text-slate-900"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
