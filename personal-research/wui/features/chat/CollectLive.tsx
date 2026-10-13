"use client";

import { useEffect, useRef, useState } from "react";
import { api, type CollectJob, type Source } from "@/lib/api";
import { emit } from "@/lib/events";
import CollectCard from "./CollectCard";

export default function CollectLive({ conversation, onDone, onOpen }: { conversation: string; onDone: () => void; onOpen: (collected: Source) => void }) {
  const [job, setJob] = useState<CollectJob | null>(null);
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
