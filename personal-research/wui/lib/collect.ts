import type { CollectEvent, CollectJob, Source } from "./api";

export type Step = { key: string; text: string; state: string; at: number; took: number | null };
export type Texts = { eng: string[]; kor: string[] };
export type Progress = { input: string; steps: Step[]; content: string; sources: Source[]; streaming: boolean };

export function stepsOf(events: CollectEvent[]): Step[] {
  return events.reduce(apply, { input: "", steps: [], content: "", sources: [], streaming: false }).steps;
}

export function progress(job: CollectJob): Progress {
  const waiting = job.state === "queued" ? [{ key: "queue", text: "Waiting for the collection ahead", state: "running", at: 0, took: null }] : [];
  const built = job.events.reduce(apply, { input: job.input, steps: waiting, content: "", sources: [], streaming: false });

  return { ...built, streaming: job.state === "queued" || job.state === "running" };
}

function apply(reply: Progress, event: CollectEvent): Progress {
  if (event.type === "step") {
    const found = reply.steps.find((s) => s.key === event.key);
    const steps = found
      ? reply.steps.map((s) => (s.key === event.key ? { ...s, text: event.text, state: event.state || "running", took: event.at - s.at } : s))
      : [...reply.steps, { key: event.key, text: event.text, state: event.state || "running", at: event.at, took: null }];
    return { ...reply, steps };
  }
  if (event.type === "collected") return { ...reply, sources: [{ id: event.id, path: event.path }] };
  if (event.type === "done") return { ...reply, content: event.text || reply.content, sources: reply.sources.length || !event.id ? reply.sources : [{ id: event.id, path: event.id }] };
  if (event.type === "error") return { ...reply, content: `${reply.content ? `${reply.content}\n\n` : ""}Error: ${event.error}` };
  return reply;
}

const KINDS: [string, string][] = [["paper/", "arXiv paper"], ["video/", "YouTube transcript"], ["document/x/", "X article"], ["repository/", "GitHub document"], ["document/", "Web document"]];

export function recalled(path: string, texts: Texts | null): Step[] {
  const step = (key: string, text: string, state = "done"): Step => ({ key, text, state, at: 0, took: null });
  const kind = KINDS.find(([prefix]) => path.startsWith(prefix))?.[1] || "Document";
  return [
    step("detect", `Detected ${kind}`),
    step("fetch", `Saved ${path}`),
    texts?.kor.length ? step("translate", "Korean translation saved") : step("translate", path.endsWith(".html") ? "Paper HTML needs segmented translation" : "No Korean translation", "skip"),
    step("check", "Checked consistency"),
  ];
}

export function origin(input: string): [string, string] {
  try {
    const url = new URL(input);
    return [url.host.replace(/^www\./, ""), `${url.pathname}${url.search}`];
  } catch {
    return [input, ""];
  }
}

export function lead(text: string): string[] {
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

export function seconds(ms: number): string {
  return ms >= 60000 ? `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s` : `${(ms / 1000).toFixed(1)}s`;
}

export function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
