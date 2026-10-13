"use client";

import type { ReactNode } from "react";
import type { Message, MessageContext } from "@/lib/api";
import { format } from "@/lib/number";
import Button from "@/ui/Button";

type Props = { question: Message; canRetry: boolean; children: ReactNode; onScene: (context: MessageContext) => void; onAction: (action: "retry" | "cancel") => void };

export default function Exchange({ question, canRetry, children, onScene, onAction }: Props) {
  const context = question.context || {};
  const quote = "mb-2 border-l-2 border-slate-200 pl-2.5 text-slate-500";
  return (
    <section className="mt-12 first:mt-0">
      <div className="mb-8 ml-auto w-fit max-w-[85%] rounded-lg border border-slate-100 bg-white px-4 py-3 leading-[1.7] break-words whitespace-pre-wrap" style={{ fontSize: "calc(14px * var(--chat-zoom))" }}>
        <div className="mb-1 text-[11px] text-slate-500">나</div>
        {context.selected_text && <blockquote className={quote}>{context.selected_text}</blockquote>}
        {(context.citations || []).map((cite, i) => <blockquote key={i} className={quote}>{cite.text}</blockquote>)}
        {(context.annotations || []).map((a, i) => (
          <details key={a.id || i}>
            <summary className="cursor-pointer text-[12px] text-slate-500">{i + 1}. {a.text.slice(0, 80)}</summary>
            <blockquote className={quote}>{a.text}</blockquote>
            {a.comment && <p>{a.comment}</p>}
          </details>
        ))}
        <div>{question.content}</div>
        {context.source_path && <div className="mt-1.5 text-[11px] text-slate-500">{context.source_path}</div>}
        {Number.isFinite(context.w) && (
          <div className="mt-1.5 text-[11px] text-slate-500">
            w={format(context.w!)}, h={format(context.h!)} · {context.mode}{"  "}
            <Button tone="link" onClick={() => onScene(context)}>이 장면 보기</Button>
          </div>
        )}
      </div>
      {children}
      <Status question={question} canRetry={canRetry} onAction={onAction} />
    </section>
  );
}

function readable(text: string): string {
  const start = text.indexOf("{");
  if (start >= 0) {
    try {
      const body = JSON.parse(text.slice(start));
      const message = body.error?.message || body.message || (typeof body.error === "string" && body.error);
      if (message) return `${text.slice(0, start).trim()} ${message}`.trim();
    } catch {}
  }
  return text.trim().split("\n")[0];
}

function Status({ question, canRetry, onAction }: { question: Message; canRetry: boolean; onAction: (action: "retry" | "cancel") => void }) {
  if (!question.status || question.status === "completed") return null;
  if (question.status === "queued" || question.status === "running") {
    return (
      <div role="status" className="flex items-center gap-2.5 text-[13px] text-slate-500">
        <span className="pulse-dot h-2 w-2 rounded-full bg-apple" />
        <span>{question.status === "queued" ? "차례를 기다리고 있습니다." : "수집물을 조사하고 답을 쓰고 있습니다."}</span>
        <Button tone="link" onClick={() => onAction("cancel")}>중지</Button>
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center gap-2.5 text-[13px] text-red-700">
      <span>{question.error ? readable(question.error) : (question.status === "cancelled" ? "답변 생성을 중지했습니다." : "답변을 받지 못했습니다.")}</span>
      {canRetry && <Button tone="link" onClick={() => onAction("retry")}>다시 시도</Button>}
    </div>
  );
}
