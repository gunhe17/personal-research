"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, collect, type CollectEvent } from "@/lib/api";
import { cx } from "@/lib/cx";
import { emit } from "@/lib/events";
import { chatHtml } from "@/lib/markdown";
import { toast } from "@/ui/Toaster";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";
import HomeBar, { type Mode } from "./HomeBar";

type Step = { key: string; text: string; state: string; at: number; took: number | null };
type Reply = { input: string; steps: Step[]; note: string; content: string; answered: boolean; sources: { id: string; path: string }[]; streaming: boolean };

export default function HomePage() {
  const router = useRouter();
  const workbench = useWorkbench();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = list.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [replies]);

  const send = async (text: string, mode: Mode): Promise<boolean> => {
    if (mode === "ask") {
      try {
        const created = await api.startAgent(text);
        router.push(`/collected?agent=${encodeURIComponent(created.id)}`);
        return true;
      } catch (error) {
        toast(`Could not start the chat: ${(error as Error).message}`);
        return false;
      }
    }
    if (!/^https?:\/\//i.test(text) && !/^\d{4}\.\d{4,5}/.test(text)) {
      toast("Give a URL or an arXiv id");
      return false;
    }
    const at = replies.length;
    const update = (change: (reply: Reply) => Reply) => setReplies((all) => all.map((r, i) => (i === at ? change(r) : r)));
    setReplies((all) => [...all, { input: text, steps: [], note: "", content: "", answered: false, sources: [], streaming: true }]);
    setBusy(true);
    try {
      await collect(text, (event: CollectEvent) => update((reply) => apply(reply, event)));
    } catch (error) {
      update((reply) => ({ ...reply, content: `Error: ${(error as Error).message}` }));
    }
    update((reply) => ({ ...reply, streaming: false }));
    setBusy(false);
    emit("spaces");
    return true;
  };

  const empty = !replies.length;
  return (
    <section className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-slate-50">
      <div className={cx("mx-auto flex h-full w-full max-w-2xl flex-col px-6 pb-10", empty && "justify-center")}>
        {empty && (
          <h1 className="text-center text-[40px] font-semibold tracking-tight text-slate-800" style={{ letterSpacing: "0.44px" }}>
            오늘의 research는 무엇인가요?
          </h1>
        )}
        {!empty && (
          <div ref={list} className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto py-6" style={{ fontSize: "calc(14px * var(--chat-zoom))" }}>
            {replies.map((reply, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[36rem] rounded-2xl rounded-tr-md bg-slate-900 px-3.5 py-2.5 leading-relaxed break-words whitespace-pre-wrap text-white">{reply.input}</div>
                </div>
                <Answer reply={reply} onOpen={(source) => workbench.open({ kind: "doc", id: source.id, path: source.path })} />
              </div>
            ))}
          </div>
        )}
        <HomeBar busy={busy} onSend={send} />
      </div>
    </section>
  );
}

function apply(reply: Reply, event: CollectEvent): Reply {
  if (event.type === "step") {
    const now = performance.now();
    const found = reply.steps.find((s) => s.key === event.key);
    const steps = found
      ? reply.steps.map((s) => (s.key === event.key ? { ...s, text: event.text, state: event.state || "running", took: now - s.at } : s))
      : [...reply.steps, { key: event.key, text: event.text, state: event.state || "running", at: now, took: null }];
    return { ...reply, steps };
  }
  if (event.type === "terms") return { ...reply, note: `Keywords ${event.terms.join(", ")}` };
  if (event.type === "collected") return { ...reply, sources: [{ id: event.id, path: event.path }] };
  if (event.type === "delta") return { ...reply, answered: true, content: (reply.answered ? reply.content : "") + event.text };
  if (event.type === "done") return { ...reply, content: event.text || reply.content, sources: reply.sources.length || !event.id ? reply.sources : [{ id: event.id, path: event.id }] };
  return { ...reply, content: `${reply.content ? `${reply.content}\n\n` : ""}Error: ${event.error}` };
}

const MARKS: Record<string, string> = {
  done: "M4 12.5l5 5L20 6.5",
  skip: "M5 12h14",
  error: "M6 6l12 12M18 6L6 18",
};

function Answer({ reply, onOpen }: { reply: Reply; onOpen: (source: { id: string; path: string }) => void }) {
  const empty = !reply.content.trim();
  return (
    <div className="mr-2 max-w-full min-w-0 overflow-hidden rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-slate-900">
      <div className="mb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Agent</div>
      {reply.note && <div className="mb-1.5 text-[11px] text-slate-500">{reply.note}</div>}
      {reply.steps.length > 0 && (
        <div className="mb-2">
          {reply.steps.map((step, i) => (
            <div key={step.key} className={cx("enter-pop relative flex gap-2.5", i < reply.steps.length - 1 && "pb-2.5")}>
              {i < reply.steps.length - 1 && <span className="absolute top-[15px] bottom-0 left-[5px] w-px bg-slate-200" />}
              <span className="relative z-10 mt-[4px] flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-full bg-white">
                {MARKS[step.state] ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cx("h-[11px] w-[11px]", step.state === "error" ? "text-red-500" : step.state === "skip" ? "text-slate-300" : "text-slate-400")}>
                    <path d={MARKS[step.state]} />
                  </svg>
                ) : (
                  <span className="breathe block h-[7px] w-[7px] rounded-full bg-apple" />
                )}
              </span>
              <span className={cx("min-w-0 flex-1 text-[12px]", step.state === "skip" ? "text-slate-400" : step.state === "running" ? "sweep" : "text-slate-500")}>{step.text}</span>
              <span className="shrink-0 pt-px font-mono text-[10px] text-slate-300 tabular-nums">{step.took && step.took >= 1000 ? `${(step.took / 1000).toFixed(1)}s` : ""}</span>
            </div>
          ))}
        </div>
      )}
      {reply.streaming && empty ? (
        <div className="typing py-0.5" aria-label="Generating"><span /><span /><span /></div>
      ) : (
        <div className="md-chat min-w-0">
          <div dangerouslySetInnerHTML={{ __html: chatHtml(reply.content) }} />
          {reply.streaming && <span className="stream-cursor" aria-hidden="true" />}
        </div>
      )}
      {reply.sources.length > 0 && (
        <div className="mt-2.5 border-t border-slate-100 pt-2">
          <div className="mb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Sources</div>
          {reply.sources.map((source) => (
            <button key={source.id} type="button" onClick={() => onOpen(source)} className="block w-full truncate rounded px-1 py-0.5 text-left text-[11px] text-apple-link transition duration-150 hover:bg-slate-50">
              {source.path}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
