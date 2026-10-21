"use client";

import { useState } from "react";
import Button from "@/ui/Button";
import Fold from "@/ui/Fold";
import FoldList from "@/ui/FoldList";
import usePresence from "@/ui/usePresence";
import type { Notes } from "./AnnotationLayer";
import type { Quote } from "./useDraft";

export default function Attachments({ notes, quote, onDropQuote }: { notes: Notes; quote: Quote | null; onDropQuote: () => void }) {
  const [listOpen, setListOpen] = useState(false);
  const noted = notes.items.length > 0;
  const count = usePresence(noted, notes.items.length).content;
  const quoted = usePresence(Boolean(quote), quote).content;
  return (
    <div>
      <Fold open={noted} className="pb-1.5">
        <Button tone="quiet" size="sm" onClick={() => setListOpen(!listOpen)}>
          ▤ {count} annotation{count === 1 ? "" : "s"}
        </Button>
      </Fold>
      <Fold open={listOpen && noted} className="pb-1.5">
        <div className="rounded-lg border border-slate-100 bg-white p-1.5">
          <FoldList items={notes.items} keyOf={(note) => note.id}>
            {(note, i) => (
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 p-1 text-[12px]">
                <button type="button" onClick={() => notes.edit(note.id)} className="truncate text-left">{i + 1}. {note.text}</button>
                <span className="text-slate-500">{note.comment || "코멘트 없음"}</span>
                <Button tone="link" onClick={() => notes.remove(note.id)}>×</Button>
              </div>
            )}
          </FoldList>
        </div>
      </Fold>
      <Fold open={Boolean(quote)} className="pb-1.5">
        {quoted && (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] ring-1 ring-slate-100">
            <div className="flex justify-between text-slate-500">
              <span>{quoted.path ? `인용 · ${quoted.path.split("/").pop()}` : "인용"}</span>
              <Button tone="link" onClick={onDropQuote}>×</Button>
            </div>
            <blockquote className="mt-1 max-h-[72px] overflow-auto">{quoted.text}</blockquote>
          </div>
        )}
      </Fold>
    </div>
  );
}
