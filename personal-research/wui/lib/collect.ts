import type { CollectEvent, CollectJob, Source } from "./api";

export type Step = { key: string; text: string; state: string; at: number; took: number | null };
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
