"use client";

import { useCallback, useRef, useState } from "react";
import type { Annotation, MessageContext } from "@/lib/api";
import { load, save } from "@/lib/storage";

export type Quote = { text: string; path?: string; id?: string };
export type Payload = { client_id: string; content: string; kind: string; context: MessageContext };
export type Draft = { draft?: string; quote?: Quote | null; annotations?: Annotation[]; context?: MessageContext | null; retryPayload?: Payload | null };

export default function useDraft(groupId: string) {
  const key = `space-draft:${groupId}`;
  const [stored] = useState(() => load<Draft>(key, {}));
  const draftRef = useRef<Draft>(stored);

  const persist = useCallback((patch: Draft) => {
    draftRef.current = { ...draftRef.current, ...patch };
    save(key, draftRef.current);
  }, [key]);

  return { stored, persist };
}
