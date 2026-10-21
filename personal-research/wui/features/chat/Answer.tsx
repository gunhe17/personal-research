"use client";

import type { Message, MessageContext, Source } from "@/lib/api";
import { cx } from "@/lib/cx";
import { chatHtml } from "@/lib/markdown";
import Button from "@/ui/Button";
import Blocks, { type Scene } from "@/features/blocks/Blocks";
import Profile from "./Profile";

type Props = {
  message: Message;
  fresh: boolean;
  label: string;
  provider: string | null;
  scene: Scene | null;
  onContext: (context: MessageContext) => void;
  onAsk: () => void;
  onCopy: () => void;
  onOpen: (source: Source) => void;
};

export default function Answer({ message, fresh, label, provider, scene, onContext, onAsk, onCopy, onOpen }: Props) {
  return (
    <article data-answer-id={message.id} className={cx(fresh && "enter-fade", "mb-10")}>
      <Profile provider={provider} label={label} />
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
            <Button key={source.id} tone="link" size="sm" onClick={() => onOpen(source)} className="block! w-full truncate text-left">
              {source.path}
            </Button>
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
