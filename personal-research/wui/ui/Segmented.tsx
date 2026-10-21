"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";

type Option<T extends string> = { value: T; label: string; disabled?: boolean; title?: string };

export default function Segmented<T extends string>({ options, value, onChange, label, className }: { options: Option<T>[]; value: T; onChange: (value: T) => void; label: string; className?: string }) {
  const group = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const node = group.current;
    if (!node) return;
    const measure = () => {
      const selected = node.querySelector<HTMLElement>("[aria-selected=true]");
      const next = selected ? { left: selected.offsetLeft, width: selected.offsetWidth } : null;
      setSlot((prev) => (prev && next && prev.left === next.left && prev.width === next.width ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, options]);

  return (
    <div ref={group} role="group" aria-label={label} className={cx("relative inline-flex max-w-full items-center rounded-full bg-slate-100 p-0.5", className)}>
      {slot && <span className="absolute top-0.5 bottom-0.5 left-0 rounded-full bg-white transition-[transform,width] duration-180 ease-spring" style={{ width: slot.width, transform: `translateX(${slot.left}px)` }} />}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-selected={option.value === value}
          disabled={option.disabled}
          title={option.title}
          onClick={() => onChange(option.value)}
          className="relative min-w-0 truncate rounded-full px-3 py-1 text-[12px] whitespace-nowrap text-slate-600 transition-colors duration-150 hover:text-slate-900 disabled:opacity-40 aria-selected:font-medium aria-selected:text-slate-900"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
