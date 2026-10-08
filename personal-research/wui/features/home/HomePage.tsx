"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, type CollectJob } from "@/lib/api";
import { progress, type Progress } from "@/lib/collect";
import { cx } from "@/lib/cx";
import { emit } from "@/lib/events";
import { chatHtml } from "@/lib/markdown";
import Steps from "@/ui/Steps";
import { toast } from "@/ui/Toaster";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";
import HomeBar, { type Mode } from "./HomeBar";


export default function HomePage() {
  const router = useRouter();
  const workbench = useWorkbench();
  const [replies, setReplies] = useState<Progress[]>([]);
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

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
    const update = (next: Progress) => setReplies((all) => all.map((r, i) => (i === at ? next : r)));
    setReplies((all) => [...all, { input: text, steps: [], content: "", sources: [], streaming: true }]);
    setBusy(true);
    let job: CollectJob;
    try {
      job = await api.collect(text);
    } catch (error) {
      update({ input: text, steps: [], content: `Error: ${(error as Error).message}`, sources: [], streaming: false });
      setBusy(false);
      return true;
    }
    setBusy(false);
    emit("collect");
    follow(job, update);
    return true;
  };

  const follow = async (start: CollectJob, update: (next: Progress) => void) => {
    let job = start;
    while (alive.current) {
      update(progress(job));
      if (job.state === "done" || job.state === "failed") break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      job = await api.collectJob(job.id).catch(() => job);
    }
    emit("spaces");
    emit("collect");
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

function Answer({ reply, onOpen }: { reply: Progress; onOpen: (source: { id: string; path: string }) => void }) {
  const empty = !reply.content.trim();
  return (
    <div className="mr-2 max-w-full min-w-0 overflow-hidden rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-slate-900">
      <div className="mb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Agent</div>
      <Steps steps={reply.steps} className="mb-2" />
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
