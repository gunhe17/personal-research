"use client";

import type { CollectJob } from "@/lib/api";
import { progress } from "@/lib/collect";
import { since } from "@/lib/time";
import Dot from "@/ui/Dot";
import SectionHeader from "@/ui/SectionHeader";
import Steps from "@/ui/Steps";

const STATES: Record<CollectJob["state"], string> = { queued: "Waiting", running: "Collecting", done: "Done", failed: "Failed" };

export default function CollectPane({ jobs, onOpen }: { jobs: CollectJob[]; onOpen: (id: string, path: string) => void }) {
  return (
    <div className="space-y-6">
      <h3 className="text-[21px] font-semibold tracking-tight text-slate-900">Collect</h3>
      <section>
        <SectionHeader title="Collections" count={jobs.length} className="mb-2" />
        {!jobs.length && <p className="text-[12px] text-slate-400">Nothing collected since the server started</p>}
        <ul className="grid gap-2">
          {jobs.map((job) => (
            <li key={job.id} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px] text-slate-900" title={job.input}>{job.input}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-slate-500">
                  <Dot on={job.state === "running" || job.state === "queued"} />
                  {STATES[job.state]} · {since(job.finished_at || job.created_at)}
                </span>
              </div>
              <Steps steps={progress(job).steps} />
              {job.path && (
                <button type="button" onClick={() => onOpen(job.collected_id, job.path)} className="mt-2 block max-w-full truncate text-left text-[12px] text-apple-link hover:underline">
                  {job.path}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
