"use client";

import { useState } from "react";
import Button from "@/ui/Button";
import type { Notes } from "./AnnotationLayer";
import type { Quote } from "./useDraft";

export default function Attachments({ notes, quote, onDropQuote }: { notes: Notes; quote: Quote | null; onDropQuote: () => void }) {
  const [listOpen, setListOpen] = useState(false);
  if (!notes.items.length && !quote) return null;
  return (
    <div className="mb-1.5 grid gap-1.5">
      {notes.items.length > 0 && (
        <button type="button" onClick={() => setListOpen(!listOpen)} className="justify-self-start rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[12px]">
          ▤ {notes.items.length} annotation{notes.items.length === 1 ? "" : "s"}
        </button>
      )}
      {listOpen && notes.items.length > 0 && (
        <div className="rounded-lg border border-slate-100 bg-white p-1.5">
          {notes.items.map((note, i) => (
            <div key={note.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 p-1 text-[12px]">
              <button type="button" onClick={() => notes.edit(note.id)} className="truncate text-left">{i + 1}. {note.text}</button>
              <span className="text-slate-500">{note.comment || "코멘트 없음"}</span>
              <Button tone="link" onClick={() => notes.remove(note.id)}>×</Button>
            </div>
          ))}
        </div>
      )}
      {quote && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] ring-1 ring-slate-100">
          <div className="flex justify-between text-slate-500">
            <span>{quote.path ? `인용 · ${quote.path.split("/").pop()}` : "인용"}</span>
            <Button tone="link" onClick={onDropQuote}>×</Button>
          </div>
          <blockquote className="mt-1 max-h-[72px] overflow-auto">{quote.text}</blockquote>
        </div>
      )}
    </div>
  );
}
