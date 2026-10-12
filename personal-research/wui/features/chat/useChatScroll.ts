"use client";

import { useLayoutEffect, useRef, useState, type RefObject, type UIEvent } from "react";
import { load, save } from "@/lib/storage";

export default function useChatScroll(scroller: RefObject<HTMLDivElement | null>, count: number, groupId: string) {
  const [below, setBelow] = useState(false);
  const seen = useRef(0);

  useLayoutEffect(() => {
    const box = scroller.current;
    const before = seen.current;
    seen.current = count;
    if (!box || !count || count === before) return;
    const kept = before ? 0 : Number(load(`chatScroll:${groupId}`, 0, true)) || 0;
    if (kept) box.scrollTop = kept;
    else if (!before || box.scrollTop + box.clientHeight >= box.scrollHeight - 300) box.scrollTo({ top: box.scrollHeight });
    else setBelow(true);
  }, [count, groupId, scroller]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    save(`chatScroll:${groupId}`, Math.round(event.currentTarget.scrollTop), true);
    const box = event.currentTarget;
    if (box.scrollTop + box.clientHeight >= box.scrollHeight - 300) setBelow(false);
  };

  const jump = () => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    setBelow(false);
  };

  return { below, onScroll, jump };
}
