"use client";

import { useEffect, useState, type RefObject } from "react";

export type ThreadSelection = { text: string; answer: string | null };

export default function useThreadSelection(thread: RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<ThreadSelection | null>(null);

  useEffect(() => {
    const changed = () => {
      const picked = window.getSelection();
      const content = picked?.toString().trim();
      const anchor = picked?.anchorNode?.parentElement;
      if (content && anchor && thread.current?.contains(anchor)) setSelection({ text: content.slice(0, 2000), answer: anchor.closest<HTMLElement>("[data-answer-id]")?.dataset.answerId || null });
      else if (!content) setSelection(null);
    };
    document.addEventListener("selectionchange", changed);
    return () => document.removeEventListener("selectionchange", changed);
  }, [thread]);

  return [selection, () => setSelection(null)] as const;
}
