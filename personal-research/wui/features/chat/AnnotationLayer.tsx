"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";
import type { Annotation } from "@/lib/api";
import Button from "@/ui/Button";
import { uuid } from "@/lib/id";

export type Notes = ReturnType<typeof useAnnotations>;

export function useAnnotations(initial: Annotation[], onChange: (items: Annotation[]) => void) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<{ id: string; original: string | null } | null>(null);

  const commit = useCallback((next: Annotation[]) => {
    setItems(next);
    onChange(next);
  }, [onChange]);

  const add = (candidate: Omit<Annotation, "id">) => {
    const found = items.find((a) => a.source_id === candidate.source_id && a.start === candidate.start && a.end === candidate.end);
    if (found) return setEditing({ id: found.id, original: found.comment });
    if (items.length >= 10) return;
    const item = { ...candidate, id: uuid() };
    commit([...items, item]);
    setEditing({ id: item.id, original: null });
  };

  const comment = (id: string, text: string) => commit(items.map((a) => (a.id === id ? { ...a, comment: text } : a)));
  const remove = (id: string) => {
    commit(items.filter((a) => a.id !== id));
    if (editing?.id === id) setEditing(null);
  };
  const cancel = () => {
    if (!editing) return;
    if (editing.original === null) commit(items.filter((a) => a.id !== editing.id));
    else comment(editing.id, editing.original);
    setEditing(null);
  };

  return {
    items,
    editing: editing?.id || null,
    add,
    comment,
    remove,
    cancel,
    edit: (id: string) => setEditing({ id, original: items.find((a) => a.id === id)?.comment ?? "" }),
    done: () => setEditing(null),
    clear: () => {
      commit([]);
      setEditing(null);
    },
  };
}

export function capture(selection: Selection | null): Omit<Annotation, "id"> | null {
  if (!selection?.rangeCount || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const node = range.startContainer;
  const article = (node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest("[data-answer-id]");
  const root = article?.querySelector("[data-article]");
  if (!article || !root || !root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const before = range.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const text = range.toString();
  if (!text.trim() || text.length > 2000) return null;
  const start = before.toString().length;
  return { source_id: (article as HTMLElement).dataset.answerId!, start, end: start + text.length, text, comment: "" };
}

function locate(item: Annotation, scope: HTMLElement): Range | null {
  const root = scope.querySelector(`[data-answer-id="${CSS.escape(item.source_id)}"] [data-article]`);
  if (!root || root.textContent?.slice(item.start, item.end) !== item.text) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let position = 0;
  let started = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent?.length || 0;
    if (!started && item.start >= position && item.start < position + length) {
      range.setStart(node, item.start - position);
      started = true;
    }
    if (started && item.end <= position + length) {
      range.setEnd(node, item.end - position);
      return range;
    }
    position += length;
  }
  return null;
}

type Mark = { id: string; number: number; left: number; top: number };

const painted = new Map<unknown, Range[]>();

function highlight(owner: unknown, ranges: Range[]) {
  if (ranges.length) painted.set(owner, ranges);
  else painted.delete(owner);
  if (globalThis.Highlight && CSS.highlights) CSS.highlights.set("annotations", new Highlight(...[...painted.values()].flat()));
}

export default function AnnotationLayer({ scope, notes, version }: { scope: RefObject<HTMLElement | null>; notes: Notes; version: unknown }) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [editor, setEditor] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const root = scope.current;
    if (!root) return;
    const paint = () => {
      const base = root.getBoundingClientRect();
      const ranges: Range[] = [];
      const next: Mark[] = [];
      notes.items.forEach((item, i) => {
        const range = locate(item, root);
        if (!range) return;
        ranges.push(range);
        const rects = range.getClientRects();
        const rect = rects[rects.length - 1];
        if (rect) next.push({ id: item.id, number: i + 1, left: Math.max(4, rect.right - base.left - 10), top: rect.top - base.top - 22 });
        if (item.id === notes.editing) {
          const first = range.getBoundingClientRect();
          setEditor({ left: Math.max(10, Math.min(first.left - base.left, base.width - 370)), top: first.bottom - base.top + 6 });
        }
      });
      setMarks(next);
      if (!notes.editing) setEditor(null);
      highlight(root, ranges);
    };
    paint();
    window.addEventListener("resize", paint);
    return () => {
      window.removeEventListener("resize", paint);
      highlight(root, []);
    };
  }, [scope, notes.items, notes.editing, version]);

  useEffect(() => {
    if (!notes.editing) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.isComposing) {
        event.preventDefault();
        notes.cancel();
      }
    };
    const outside = (event: PointerEvent) => !(event.target as Element).closest("[data-annotation]") && notes.cancel();
    window.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
    };
  }, [notes]);

  const active = notes.items.find((a) => a.id === notes.editing);
  return (
    <>
      {marks.map((mark) => (
        <button
          key={mark.id}
          type="button"
          data-annotation
          aria-label={`주석 ${mark.number} 수정`}
          onClick={() => notes.edit(mark.id)}
          className="absolute z-40 h-[18px] w-[18px] rounded-full bg-slate-800 text-[11px] text-white"
          style={{ left: mark.left, top: mark.top }}
        >
          {mark.number}
        </button>
      ))}
      {active && editor && (
        <div data-annotation className="absolute z-50 flex w-[min(360px,calc(100%-20px))] gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5" style={editor}>
          <input
            autoFocus
            maxLength={2000}
            aria-label="주석 코멘트"
            placeholder="코멘트 (선택)"
            value={active.comment}
            onChange={(event) => notes.comment(active.id, event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && !event.nativeEvent.isComposing && notes.done()}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[13px]"
          />
          <Button tone="fill" size="sm" onClick={notes.done}>✓</Button>
        </div>
      )}
    </>
  );
}
