"use client";

import { useEffect, useRef, useState } from "react";
import { api, type CollectJob } from "@/lib/api";
import { progress } from "@/lib/collect";
import Steps from "@/ui/Steps";
import { Profile } from "./Answer";

export default function CollectLive({ conversation, onDone }: { conversation: string; onDone: () => void }) {
  const [job, setJob] = useState<CollectJob | null>(null);
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const items = await api.collects().then((data) => data.items, () => []);
      if (!alive) return;
      const found = items.find((item) => item.conversation_id === conversation) || null;
      setJob(found);
      if (found && (found.state === "queued" || found.state === "running")) timer = setTimeout(tick, 1000);
      else if (found) done.current();
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [conversation]);

  if (!job) return null;
  return (
    <article className="mb-10">
      <Profile provider={null} label="수집" />
      <Steps steps={progress(job).steps} />
    </article>
  );
}
