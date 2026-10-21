import Icon from "@/ui/Icon";

export default function Search({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-[7px] text-slate-400 transition duration-150 focus-within:border-apple focus-within:bg-white">
      <Icon name="search" className="h-3.5 w-3.5" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === "Escape" && onChange("")}
        placeholder={label}
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="text-slate-400 hover:text-slate-700">
          <Icon name="close" className="h-3 w-3" />
        </button>
      )}
    </label>
  );
}
