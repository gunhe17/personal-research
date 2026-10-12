"use client";

import { useEffect, useState } from "react";
import { api, type CollectEvent } from "@/lib/api";
import { stepsOf, type Step } from "@/lib/collect";
import { cx } from "@/lib/cx";
import Button from "@/ui/Button";
import Segmented from "@/ui/Segmented";
import { Profile } from "./Answer";

type State = "queued" | "running" | "done" | "failed";
type View = "both" | "eng" | "kor";

const STAGES: [string, string][] = [["detect", "판별"], ["fetch", "원문"], ["translate", "번역"], ["check", "검사"]];
const MARKS: Record<string, string> = { done: "M4 12.5l5 5L20 6.5", error: "M6 6l12 12M18 6L6 18", skip: "M5 12h14" };

type Props = {
  input: string;
  events: CollectEvent[];
  state: State;
  collected: { id: string; path: string } | null;
  onOpen: (collected: { id: string; path: string }) => void;
};

export default function CollectCard({ input, events, state, collected, onOpen }: Props) {
  const steps = stepsOf(events);
  const now = useNow(state === "running");
  const [host, rest] = origin(input);
  return (
    <article className="mb-10">
      <Profile provider={null} label="수집" />
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-[12px] text-slate-500">
          <span className="font-semibold text-slate-800">{host}</span>
          <span className="min-w-0 flex-1 truncate">{rest}</span>
        </div>
        {state === "queued" && (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-ice px-4 py-2 text-[12px] text-slate-600">
            <span className="breathe block h-[7px] w-[7px] rounded-full bg-apple" />
            앞의 수집이 끝나기를 기다리는 중
          </div>
        )}
        {(steps.length > 0 || state === "queued" || state === "running") && (
          <ul className="px-4 py-2">
            {STAGES.map(([key, label]) => (
              <Row key={key} label={label} step={steps.find((s) => s.key === key)} now={now} />
            ))}
          </ul>
        )}
        {state === "done" && collected && !collected.path.endsWith(".html") && <Preview id={collected.id} />}
        {collected && (
          <div className="flex items-center border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <Button tone="fill" size="sm" onClick={() => onOpen(collected)}>Open</Button>
          </div>
        )}
      </div>
    </article>
  );
}

function Row({ label, step, now }: { label: string; step?: Step; now: number }) {
  const state = step?.state || "idle";
  const time = state === "running" && step ? clock(now - step.at) : step?.took ? seconds(step.took) : "";
  return (
    <li className="flex items-center gap-2.5 py-1.5">
      <span className="flex h-4 w-4 items-center justify-center">
        {MARKS[state] ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cx("h-[11px] w-[11px]", state === "error" ? "text-red-500" : state === "skip" ? "text-slate-300" : "text-slate-400")}>
            <path d={MARKS[state]} />
          </svg>
        ) : state === "running" ? (
          <span className="breathe block h-[7px] w-[7px] rounded-full bg-apple" />
        ) : (
          <span className="block h-[7px] w-[7px] rounded-full border border-slate-300" />
        )}
      </span>
      <span className={cx("w-10 shrink-0 text-[12px]", state === "idle" ? "text-slate-300" : "text-slate-800")}>{label}</span>
      <span className={cx("min-w-0 flex-1 truncate text-[12px]", state === "running" ? "sweep" : state === "error" ? "text-red-600" : state === "skip" ? "text-slate-400" : "text-slate-500")} title={step?.text}>
        {step?.text || ""}
      </span>
      <span className={cx("shrink-0 font-mono text-[10px] tabular-nums", state === "running" ? "text-apple-link" : "text-slate-300")}>{time}</span>
    </li>
  );
}

function Preview({ id }: { id: string }) {
  const [texts, setTexts] = useState<{ eng: string[]; kor: string[] } | null>(null);
  const [view, setView] = useState<View>("both");

  useEffect(() => {
    const read = (language: string) => api.file(id, language).then((data) => lead(data.content), () => []);
    Promise.all([read("eng"), read("kor")]).then(([eng, kor]) => setTexts({ eng, kor }));
  }, [id]);

  if (!texts?.eng.length) return null;
  const paired = texts.kor.length > 0;
  const shown = paired ? view : "eng";
  return (
    <div className="border-t border-slate-100 px-4 py-3">
      {paired && (
        <Segmented
          label="Preview"
          value={view}
          onChange={setView}
          className="mb-2"
          options={[
            { value: "both", label: "Line by line" },
            { value: "eng", label: "Eng" },
            { value: "kor", label: "Kor" },
          ]}
        />
      )}
      <div className="space-y-1 text-[13px] leading-relaxed">
        {shown === "both"
          ? texts.eng.map((sentence, i) => (
              <div key={i}>
                <p className="text-slate-500">{sentence}</p>
                {texts.kor[i] && <p className="text-slate-900">{texts.kor[i]}</p>}
              </div>
            ))
          : <p className="text-slate-900">{(shown === "eng" ? texts.eng : texts.kor).join(" ")}</p>}
      </div>
    </div>
  );
}

function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  return now;
}

function origin(input: string): [string, string] {
  try {
    const url = new URL(input);
    return [url.host.replace(/^www\./, ""), `${url.pathname}${url.search}`];
  } catch {
    return [input, ""];
  }
}

function lead(text: string): string[] {
  const paragraph = text
    .split(/\n\s*\n/)
    .map((part) => part.replace(/<[^>]*>/g, " ").trim())
    .find((part) => /[A-Za-z가-힣]/.test(part) && !/^(#|!\[|```|[-*+>|]|\d+\.|---)/.test(part)) || "";
  const plain = paragraph
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return plain.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2);
}

function seconds(ms: number): string {
  return ms >= 60000 ? `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s` : `${(ms / 1000).toFixed(1)}s`;
}

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
