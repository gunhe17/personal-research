"use client";

import { useEffect, useState, type RefObject } from "react";
import Icon from "@/ui/Icon";
import { toast } from "@/ui/Toaster";

type Picked = { text: string; range: Range; left: number; top: number };

export default function SelectionBar({ scope, onQuote }: { scope: RefObject<HTMLElement | null>; onQuote: (text: string) => void }) {
  const [picked, setPicked] = useState<Picked | null>(null);

  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const up = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || "";
      if (text.length < 2 || !selection?.rangeCount || !root.contains(selection.anchorNode)) return;
      const range = selection.getRangeAt(0).cloneRange();
      const rect = range.getClientRects()[0] || range.getBoundingClientRect();
      setPicked({ text, range, left: Math.min(Math.max(8, rect.left), window.innerWidth - 90), top: Math.max(8, rect.top - 36) });
    };
    const down = (event: MouseEvent) => !(event.target as Element).closest("[data-selection-bar]") && setPicked(null);
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setPicked(null);
    root.addEventListener("mouseup", up);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", escape);
    const hide = () => setPicked(null);
    const scroller = root.parentElement;
    scroller?.addEventListener("scroll", hide, { passive: true });
    return () => {
      scroller?.removeEventListener("scroll", hide);
      root.removeEventListener("mouseup", up);
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", escape);
    };
  }, [scope]);

  if (!picked) return null;
  const quote = () => {
    if (globalThis.Highlight && CSS.highlights) CSS.highlights.set("doc-selection", new Highlight(picked.range));
    window.getSelection()?.removeAllRanges();
    onQuote(picked.text);
    toast("Quoted");
    setPicked(null);
  };
  const copy = async () => {
    await navigator.clipboard.writeText(picked.text).catch(() => {});
    toast("Copied");
    setPicked(null);
  };
  const button = "inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900";
  return (
    <div data-selection-bar onMouseDown={(event) => event.preventDefault()} className="enter-pop fixed z-[55] flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-0.5" style={{ left: picked.left, top: picked.top }}>
      <button type="button" title="Quote in chat" aria-label="Quote in chat" className={button} onClick={quote}><Icon name="chat" className="h-4 w-4" /></button>
      <button type="button" title="Copy" aria-label="Copy" className={button} onClick={copy}><Icon name="copy" className="h-4 w-4" /></button>
    </div>
  );
}
