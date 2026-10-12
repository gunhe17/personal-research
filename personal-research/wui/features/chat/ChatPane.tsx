"use client";

import { useEffect, useRef, useState } from "react";
import { api, type Message, type MessageContext } from "@/lib/api";
import { emit } from "@/lib/events";
import Button from "@/ui/Button";
import type { Scene } from "@/features/blocks/Blocks";
import PaneBar from "@/features/workbench/PaneBar";
import type { Group } from "@/lib/items";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";
import AnnotationLayer, { capture, useAnnotations } from "./AnnotationLayer";
import Attachments from "./Attachments";
import CollectCard from "./CollectCard";
import CollectLive from "./CollectLive";
import Answer from "./Answer";
import Composer, { commanded } from "./Composer";
import Exchange from "./Exchange";
import { useModel } from "./ModelPicker";
import useChatScroll from "./useChatScroll";
import useConversation from "./useConversation";
import useDraft, { type Payload, type Quote } from "./useDraft";
import useThreadSelection from "./useThreadSelection";

export default function ChatPane({ group }: { group: Group }) {
  const workbench = useWorkbench();
  const { stored, persist } = useDraft(group.id);
  const [text, setText] = useState(stored.draft || "");
  const [quote, setQuote] = useState<Quote | null>(stored.quote || null);
  const [context, setContext] = useState<MessageContext | null>(stored.context || null);
  const [retry, setRetry] = useState<Payload | null>(stored.retryPayload || null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [scene, setScene] = useState<Scene | null>(null);
  const [catalog, choice, choose] = useModel();
  const { domain, chat, banner, refresh, ensure } = useConversation(group);
  const scroller = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [selection, clearSelection] = useThreadSelection(thread);
  const { below, onScroll, jump } = useChatScroll(scroller, chat?.messages.length || 0, group.id);
  const notes = useAnnotations(stored.annotations || [], (annotations) => {
    setRetry(null);
    persist({ annotations, retryPayload: null });
  });

  useEffect(() => {
    const incoming = workbench.quote;
    if (!incoming || incoming.target !== group.id) return;
    const next = { text: incoming.text.slice(0, 2000), path: incoming.path, id: incoming.id };
    setQuote(next);
    setRetry(null);
    persist({ quote: next, retryPayload: null });
    workbench.clearQuote();
    input.current?.focus();
  }, [workbench, group.id, persist]);

  const write = (value: string) => {
    setText(value);
    persist({ draft: value });
  };

  const attach = (next: Quote | null, extra?: MessageContext) => {
    setQuote(next);
    const merged = extra ? { ...(context || {}), ...extra } : context;
    setContext(merged);
    setRetry(null);
    persist({ quote: next, context: merged, retryPayload: null });
    input.current?.focus();
  };

  const pick = (next: Parameters<typeof choose>[0]) => {
    choose(next);
    setRetry(null);
    persist({ retryPayload: null });
  };

  const send = async () => {
    const content = text.trim() || (notes.items.length ? "첨부한 주석을 확인하고 설명해줘." : "");
    if (!content || sending) return;
    const payload: Payload = retry?.content === content ? retry : {
      client_id: crypto.randomUUID(),
      content,
      kind: commanded(content)?.kind || (/^(next|go|다음)$/i.test(content) ? "next" : /인출/.test(content) ? "retrieval" : "question"),
      context: { ...(context || {}), model: choice || undefined, selected_text: quote?.text || "", source_path: quote?.path || "", annotations: notes.items.map((a) => ({ ...a })) },
    };
    setRetry(payload);
    persist({ retryPayload: payload });
    setSending(true);
    setStatus("보내는 중…");
    try {
      const current = await ensure(content);
      await api.ask(current.domain, current.id, payload);
      write("");
      setQuote(null);
      setRetry(null);
      notes.clear();
      persist({ quote: null, retryPayload: null });
      setStatus("");
      await refresh(current.domain, current.id);
      emit(current.domain === "agent" ? "agents" : "spaces");
    } catch (error) {
      setStatus(`${(error as Error).message} 입력 내용은 유지됩니다.`);
    }
    setSending(false);
  };

  const label = (question?: Message, answer?: Message) => {
    if (question?.kind === "collect") return "수집";
    const name = catalog?.providers.flatMap((p) => p.models).find((m) => m.id === question?.context?.model?.model)?.label || "Codex";
    return `${name}${answer?.rich?.via?.startsWith("api_key") ? " · API key" : ""}`;
  };

  const exchanges = threads(chat?.messages || []);
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <PaneBar group={group} name={chat?.title || "새 대화"} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={scroller} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {banner && <div role="alert" className="mx-4 mt-3 rounded-lg border border-slate-200 bg-ice px-3.5 py-2.5 text-[13px]">{banner}</div>}
          {!chat?.messages.length && (
            <div className="mx-auto max-w-[560px] px-6 pt-16 text-center text-[14px] leading-relaxed text-slate-500">
              <p className="mb-2 text-[21px] font-semibold text-slate-800">{domain === "agent" ? "무엇을 물어볼까요?" : "이 space 에서 무엇을 배울까요?"}</p>
              <p>질문하면 수집물을 먼저 조사해 근거와 함께 답합니다. 문서에서 문장을 골라 인용할 수 있습니다.</p>
            </div>
          )}
          <div
            ref={thread}
            onPointerUp={(event) => {
              if (!(event.target as Element).closest("[data-answer-id]")) return;
              const candidate = capture(window.getSelection());
              if (candidate) {
                notes.add(candidate);
                window.getSelection()?.removeAllRanges();
              }
            }}
            className="relative mx-auto max-w-[760px] px-5 pt-8 pb-12 empty:hidden"
          >
            {exchanges.map(({ question, answers }) => (
              <Exchange key={question.id} question={question} canRetry={Boolean(chat?.codex_available)} onScene={(c) => setScene({ context: c, nonce: Date.now() })} onAction={async (action) => {
                try {
                  await api.act(chat!.domain, chat!.id, action, question.id);
                  await refresh(chat!.domain, chat!.id);
                } catch (error) {
                  setStatus((error as Error).message);
                }
              }}>
                {question.kind === "collect" && answers.map((answer) => (
                  <CollectCard
                    key={answer.id}
                    input={question.content}
                    events={answer.context?.steps || []}
                    state={answer.sources?.length ? "done" : "failed"}
                    collected={answer.sources?.[0] || null}
                    onOpen={(source) => workbench.open({ kind: "doc", id: source.id, path: source.path }, { beside: group.id })}
                  />
                ))}
                {question.kind !== "collect" && answers.map((answer) => (
                  <Answer
                    key={answer.id}
                    message={answer}
                    label={label(question, answer)}
                    provider={question.context?.model?.provider || catalog?.default.provider || "openai"}
                    scene={scene}
                    onContext={(c) => {
                      const merged = { ...c, source_answer_id: answer.id };
                      setContext(merged);
                      persist({ context: merged });
                    }}
                    onAsk={() => attach({ text: answer.rich ? answer.rich.title : answer.content.slice(0, 200) }, { source_answer_id: answer.id })}
                    onCopy={async () => {
                      try {
                        await navigator.clipboard.writeText(answer.content);
                        setStatus("답변을 복사했습니다.");
                      } catch {
                        setStatus("답변을 드래그해 복사해 주세요.");
                      }
                    }}
                    onOpen={(source) => workbench.open({ kind: "doc", id: source.id, path: source.path }, { beside: group.id })}
                  />
                ))}
                {question.kind === "collect" && !answers.length && chat && <CollectLive conversation={chat.id} onDone={() => refresh(chat.domain, chat.id)} onOpen={(source) => workbench.open({ kind: "doc", id: source.id, path: source.path }, { beside: group.id })} />}
              </Exchange>
            ))}
            <AnnotationLayer scope={thread} notes={notes} version={chat} />
          </div>
          {below && (
            <Button className="sticky bottom-3 left-1/2 -translate-x-1/2 bg-white" size="sm" onClick={jump}>새 답변으로 ↓</Button>
          )}
        </div>
        {selection && (
          <Button className="absolute top-3 left-1/2 z-20 -translate-x-1/2 bg-white" size="sm" onClick={() => {
            const candidate = capture(window.getSelection());
            if (candidate) notes.add(candidate);
            attach({ text: selection.text }, selection.answer ? { source_answer_id: selection.answer } : undefined);
            clearSelection();
          }}>선택한 내용에 질문 ↗</Button>
        )}
        <div className="shrink-0 px-4 pt-2 pb-1">
          <div className="mx-auto max-w-[760px]">
            <Attachments notes={notes} quote={quote} onDropQuote={() => attach(null)} />
            <Composer value={text} sending={sending} catalog={catalog} choice={choice} input={input} onPick={pick} onChange={write} onSend={send} />
            <p role="status" className="mx-auto my-1 min-h-4 text-[12px] text-slate-500">{status}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function threads(messages: Message[]): { question: Message; answers: Message[] }[] {
  const out: { question: Message; answers: Message[] }[] = [];
  for (const message of messages) {
    if (message.role === "user") out.push({ question: message, answers: [] });
    else (out.find((e) => e.question.id === message.question_id) || out[out.length - 1])?.answers.push(message);
  }
  return out;
}
