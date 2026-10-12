"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, type Annotation, type Conversation, type Domain, type Message, type MessageContext, type Space } from "@/lib/api";
import { emit } from "@/lib/events";
import { load, save } from "@/lib/storage";
import Button from "@/ui/Button";
import type { Scene } from "@/features/blocks/Blocks";
import PaneBar from "@/features/workbench/PaneBar";
import { itemKey, type Group, type Item } from "@/features/workbench/items";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";
import AnnotationLayer, { capture, useAnnotations } from "./Annotations";
import CollectCard from "./CollectCard";
import CollectLive from "./CollectLive";
import Answer from "./Answer";
import Composer, { commanded } from "./Composer";
import Exchange from "./Exchange";
import { useModel } from "./ModelPicker";

type Quote = { text: string; path?: string; id?: string };
type Payload = { client_id: string; content: string; kind: string; context: MessageContext };
type Draft = { draft?: string; quote?: Quote | null; annotations?: Annotation[]; context?: MessageContext | null; retryPayload?: Payload | null };

export default function ChatPane({ group }: { group: Group }) {
  const workbench = useWorkbench();
  const draftKey = `space-draft:${group.id}`;
  const [stored] = useState(() => load<Draft>(draftKey, {}));
  const [domain, setDomain] = useState<Domain>("space");
  const [space, setSpace] = useState<Space | null>(null);
  const [chat, setChat] = useState<Conversation | null>(null);
  const [banner, setBanner] = useState("");
  const [text, setText] = useState(stored.draft || "");
  const [quote, setQuote] = useState<Quote | null>(stored.quote || null);
  const [context, setContext] = useState<MessageContext | null>(stored.context || null);
  const [retry, setRetry] = useState<Payload | null>(stored.retryPayload || null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [scene, setScene] = useState<Scene | null>(null);
  const [selection, setSelection] = useState<{ text: string; answer: string | null } | null>(null);
  const [below, setBelow] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [catalog, choice, choose] = useModel();
  const scroller = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const loaded = useRef("");
  const generation = useRef(0);
  const draftRef = useRef<Draft>(stored);
  const notes = useAnnotations(stored.annotations || [], (annotations) => {
    setRetry(null);
    persist({ annotations, retryPayload: null });
  });

  const persist = useCallback((patch: Draft) => {
    draftRef.current = { ...draftRef.current, ...patch };
    save(draftKey, draftRef.current);
  }, [draftKey]);

  const refresh = useCallback(async (kind: Domain, id: string) => {
    const at = generation.current;
    try {
      const data = await api.conversation(kind, id);
      if (at !== generation.current) return;
      setChat(data);
      setBanner(data.codex_available ? "" : "서버에서 codex CLI 를 찾지 못했습니다. 컨테이너에서 codex login --device-auth 를 확인해 주세요.");
    } catch (error) {
      setBanner(`대화를 불러오지 못했습니다. ${(error as Error).message}`);
    }
  }, []);

  const replace = workbench.replace;
  const remember = useCallback((item: Item) => {
    loaded.current = itemKey(item);
    replace(group.id, item);
  }, [replace, group.id]);

  useEffect(() => {
    const item = group.item;
    if (loaded.current === itemKey(item)) return;
    loaded.current = itemKey(item);
    generation.current += 1;
    setChat(null);
    setBanner("");
    (async () => {
      if (item.kind === "agent") {
        setDomain("agent");
        if (item.agent) await refresh("agent", item.agent);
        return;
      }
      if (item.kind !== "chat") return;
      setDomain("space");
      const detail = await api.space(item.space).catch(() => null);
      setSpace(detail);
      const id = item.conversation === "" ? null : item.conversation || detail?.conversations[0]?.id || null;
      if (id) await refresh("space", id);
    })();
  }, [group.item, refresh]);

  const shown = useRef(group.item);
  shown.current = group.item;
  useEffect(() => {
    if (!chat) return;
    const item: Item = chat.domain === "agent" ? { kind: "agent", agent: chat.id, title: chat.title } : { kind: "chat", space: chat.space_id || space?.id || "", conversation: chat.id, title: chat.title };
    if (itemKey(item) !== itemKey(shown.current) || shown.current.title !== chat.title) remember(item);
  }, [chat, space, remember]);

  useEffect(() => {
    if (!chat?.messages.some((m) => m.status === "queued" || m.status === "running")) return;
    const timer = setTimeout(() => refresh(chat.domain, chat.id), 1500);
    return () => clearTimeout(timer);
  }, [chat, refresh]);

  useEffect(() => {
    const visible = () => !document.hidden && chat && refresh(chat.domain, chat.id);
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, [chat, refresh]);

  useEffect(() => {
    const q = workbench.quote;
    if (!q || q.target !== group.id) return;
    const next = { text: q.text.slice(0, 2000), path: q.path, id: q.id };
    setQuote(next);
    setRetry(null);
    persist({ quote: next, retryPayload: null });
    workbench.clearQuote();
    input.current?.focus();
  }, [workbench, group.id, persist]);

  const count = chat?.messages.length || 0;
  const seen = useRef(0);
  useLayoutEffect(() => {
    const box = scroller.current;
    const before = seen.current;
    seen.current = count;
    if (!box || !count || count === before) return;
    const kept = before ? 0 : Number(load(`chatScroll:${group.id}`, 0, true)) || 0;
    if (kept) box.scrollTop = kept;
    else if (!before || box.scrollTop + box.clientHeight >= box.scrollHeight - 300) box.scrollTo({ top: box.scrollHeight });
    else setBelow(true);
  }, [count, group.id]);

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
  }, []);

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
      let current = chat;
      if (!current && domain === "agent") {
        current = await api.conversation("agent", (await api.startAgent("")).id);
        setChat(current);
      }
      if (!current) {
        let target = space || (group.item.kind === "chat" ? await api.space(group.item.space).catch(() => null) : null);
        if (domain === "space" && !target) {
          const created = await api.createSpace(named(content, workbench.doc?.path), "");
          target = await api.space(created.id);
          setSpace(target);
        }
        const started = await api.startSpace(target?.id || "", workbench.doc?.id || "");
        current = await api.conversation(domain, started.id);
        setChat(current);
      }
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
        <div ref={scroller} onScroll={(event) => {
          save(`chatScroll:${group.id}`, Math.round(event.currentTarget.scrollTop), true);
          const box = event.currentTarget;
          if (box.scrollTop + box.clientHeight >= box.scrollHeight - 300) setBelow(false);
        }} className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
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
            <Button className="sticky bottom-3 left-1/2 -translate-x-1/2 bg-white" size="sm" onClick={() => {
              scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
              setBelow(false);
            }}>새 답변으로 ↓</Button>
          )}
        </div>
        {selection && (
          <Button className="absolute top-3 left-1/2 z-20 -translate-x-1/2 bg-white" size="sm" onClick={() => {
            const candidate = capture(window.getSelection());
            if (candidate) notes.add(candidate);
            attach({ text: selection.text }, selection.answer ? { source_answer_id: selection.answer } : undefined);
            setSelection(null);
          }}>선택한 내용에 질문 ↗</Button>
        )}
        <div className="shrink-0 px-4 pt-2 pb-1">
          <div className="mx-auto max-w-[760px]">
            {(notes.items.length > 0 || quote) && (
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
                      <Button tone="link" onClick={() => attach(null)}>×</Button>
                    </div>
                    <blockquote className="mt-1 max-h-[72px] overflow-auto">{quote.text}</blockquote>
                  </div>
                )}
              </div>
            )}
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

function named(text: string, path?: string): string {
  const repository = path?.match(/^repos\/github\/([^/]+\/[^/]+)/);
  if (repository) return repository[1];
  if (path) return path.split("/").pop()!.replace(/\.(md|html)$/, "");
  return text.length > 24 ? `${text.slice(0, 24)}…` : text;
}
