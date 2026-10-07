"use client";

import type { Message, MessageContext } from "@/lib/api";
import { chatHtml } from "@/lib/markdown";
import Button from "@/ui/Button";
import Blocks, { type Scene } from "@/features/blocks/Blocks";

type Props = {
  message: Message;
  label: string;
  scene: Scene | null;
  onContext: (context: MessageContext) => void;
  onAsk: () => void;
  onCopy: () => void;
  onOpen: (source: { id: string; path: string }) => void;
};

export default function Answer({ message, label, scene, onContext, onAsk, onCopy, onOpen }: Props) {
  return (
    <article data-answer-id={message.id} className="mb-10">
      <div className="mb-4 flex items-center gap-2 text-[12px] text-slate-500">
        <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-200 font-serif text-[14px]">{label === "수집" ? "↓" : "∂"}</span>
        <span>{label}</span>
      </div>
      <div data-article className="article">
        {message.rich ? (
          <Blocks rich={message.rich} id={message.id} onContext={onContext} scene={scene} />
        ) : (
          <div className="md-chat" dangerouslySetInnerHTML={{ __html: chatHtml(message.content) }} />
        )}
      </div>
      {(message.sources || []).length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2.5 text-[12px]">
          <span className="mb-0.5 block text-slate-500">근거</span>
          {message.sources!.map((source) => (
            <button key={source.id} type="button" onClick={() => onOpen(source)} className="block max-w-full truncate py-px text-left font-mono text-[11px] text-apple-link">
              {source.path}
            </button>
          ))}
        </div>
      )}
      <div className="mt-1.5 flex gap-4">
        <Button tone="link" onClick={onAsk}>이 답변에 질문하기</Button>
        <Button tone="link" onClick={onCopy}>복사</Button>
      </div>
    </article>
  );
}
