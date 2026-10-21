"use client";

import { useEffect, useRef, useState } from "react";
import { api, type CollectJob, type Source } from "@/lib/api";
import { emit } from "@/lib/events";
import Skeleton from "@/ui/Skeleton";
import CollectCard from "./CollectCard";
import Profile from "./Profile";

export default function CollectLive({ conversation, onDone, onOpen }: { conversation: string; onDone: () => void; onOpen: (collected: Source) => void }) {
  const [job, setJob] = useState<CollectJob | null>();
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const items = await api.collectJobs().then((data) => data.items, () => []);
      if (!alive) return;
      const found = items.find((item) => item.conversation_id === conversation) || null;
      setJob(found);
      if (found && (found.state === "queued" || found.state === "running")) timer = setTimeout(tick, 1000);
      else if (found) {
        if (found.state === "done") emit("collected");
        done.current();
      }
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [conversation]);

  if (job === undefined) {
    return (
      <article className="mb-10">
        <Profile provider={null} label="수집" />
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-[13px]">
            <Skeleton className="w-2/5" />
          </div>
          <Skeleton lines={["w-3/5", "w-1/2", "w-2/3", "w-2/5"]} className="px-4 py-6" />
        </div>
      </article>
    );
  }
  if (!job) return null;
  return (
    <CollectCard
      input={job.input}
      events={job.events}
      state={job.state}
      collected={job.collected_id ? { id: job.collected_id, path: job.path } : null}
      onOpen={onOpen}
    />
  );
}
