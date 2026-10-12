"use client";

import { useEffect, useState } from "react";
import { api, type CollectEvent, type CollectJob, type Source } from "@/lib/api";
import { clock, lead, origin, recalled, seconds, stepsOf, type Step, type Texts } from "@/lib/collect";
import { cx } from "@/lib/cx";
import Button from "@/ui/Button";
import Segmented from "@/ui/Segmented";
import StepMark from "@/ui/StepMark";
import Profile from "./Profile";

type View = "both" | "eng" | "kor";

const STAGES: [string, string][] = [["detect", "판별"], ["fetch", "원문"], ["translate", "번역"], ["check", "검사"]];

type Props = {
  input: string;
  events: CollectEvent[];
  state: CollectJob["state"];
  collected: Source | null;
  onOpen: (collected: Source) => void;
};

export default function CollectCard({ input, events, state, collected, onOpen }: Props) {
  const texts = useTexts(state === "done" && collected && !collected.path.endsWith(".html") ? collected.id : null);
  const recorded = events.length > 0;
  const steps = recorded ? stepsOf(events) : state === "done" && collected ? recalled(collected.path, texts) : [];
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
        {texts && texts.eng.length > 0 && <Preview texts={texts} />}
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
        <StepMark state={state} />
      </span>
      <span className={cx("w-10 shrink-0 text-[12px]", state === "idle" ? "text-slate-300" : "text-slate-800")}>{label}</span>
      <span className={cx("min-w-0 flex-1 truncate text-[12px]", state === "running" ? "sweep" : state === "error" ? "text-red-600" : state === "skip" ? "text-slate-400" : "text-slate-500")} title={step?.text}>
        {step?.text || ""}
      </span>
      {step && step.at === 0 ? (
        <span className="shrink-0 font-mono text-[11px] text-slate-300" aria-label="시간 기록 없음">–</span>
      ) : (
        <span className={cx("shrink-0 font-mono text-[11px] tabular-nums", state === "running" ? "text-apple-link" : "text-slate-300")}>{time}</span>
      )}
    </li>
  );
}

function useTexts(id: string | null): Texts | null {
  const [loaded, setLoaded] = useState<{ id: string; texts: Texts } | null>(null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const read = (language: string) => api.file(id, language).then((data) => lead(data.content), () => []);
    Promise.all([read("eng"), read("kor")]).then(([eng, kor]) => !cancelled && setLoaded({ id, texts: { eng, kor } }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return loaded && loaded.id === id ? loaded.texts : null;
}

function Preview({ texts }: { texts: Texts }) {
  const [view, setView] = useState<View>("both");
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
            { value: "eng", label: "Eng" },
            { value: "kor", label: "Korean" },
            { value: "both", label: "Line by line" },
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
