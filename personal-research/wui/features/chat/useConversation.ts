"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Conversation, type Domain, type Space } from "@/lib/api";
import { itemKey, type Group, type Item } from "@/lib/items";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";

export default function useConversation(group: Group) {
  const workbench = useWorkbench();
  const [domain, setDomain] = useState<Domain>("space");
  const [space, setSpace] = useState<Space | null>(null);
  const [chat, setChat] = useState<Conversation | null>(null);
  const [banner, setBanner] = useState("");
  const loaded = useRef("");
  const generation = useRef(0);

  const refresh = useCallback(async (kind: Domain, id: string) => {
    const at = generation.current;
    try {
      const data = await api.conversation(kind, id);
      if (at !== generation.current) return;
      setChat(data);
      setBanner(data.codex_available ? "" : "서버에서 codex CLI 를 찾지 못했습니다. 컨테이너에서 codex login --device-auth 를 확인해 주세요.");
    } catch (error) {
      setBanner(`대화를 불러오지 못했습니다. ${(error as Error).message}`);
    }
  }, []);

  const replace = workbench.replace;
  const remember = useCallback((item: Item) => {
    loaded.current = itemKey(item);
    replace(group.id, item);
  }, [replace, group.id]);

  useEffect(() => {
    const item = group.item;
    if (loaded.current === itemKey(item)) return;
    loaded.current = itemKey(item);
    generation.current += 1;
    setChat(null);
    setBanner("");
    (async () => {
      if (item.kind === "agent") {
        setDomain("agent");
        if (item.agent) await refresh("agent", item.agent);
        return;
      }
      if (item.kind !== "chat") return;
      setDomain("space");
      const detail = await api.space(item.space).catch(() => null);
      setSpace(detail);
      const id = item.conversation === "" ? null : item.conversation || detail?.conversations[0]?.id || null;
      if (id) await refresh("space", id);
    })();
  }, [group.item, refresh]);

  const shown = useRef(group.item);
  shown.current = group.item;
  useEffect(() => {
    if (!chat) return;
    const item: Item = chat.domain === "agent" ? { kind: "agent", agent: chat.id, title: chat.title } : { kind: "chat", space: chat.space_id || space?.id || "", conversation: chat.id, title: chat.title };
    if (itemKey(item) !== itemKey(shown.current) || shown.current.title !== chat.title) remember(item);
  }, [chat, space, remember]);

  useEffect(() => {
    if (!chat?.messages.some((m) => m.status === "queued" || m.status === "running")) return;
    const timer = setTimeout(() => refresh(chat.domain, chat.id), 1500);
    return () => clearTimeout(timer);
  }, [chat, refresh]);

  useEffect(() => {
    const visible = () => !document.hidden && chat && refresh(chat.domain, chat.id);
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, [chat, refresh]);

  const ensure = async (content: string): Promise<Conversation> => {
    let current = chat;
    if (!current && domain === "agent") {
      current = await api.conversation("agent", (await api.startAgent("")).id);
      setChat(current);
    }
    if (!current) {
      let target = space || (group.item.kind === "chat" ? await api.space(group.item.space).catch(() => null) : null);
      if (domain === "space" && !target) {
        const created = await api.createSpace(named(content, workbench.doc?.path), "");
        target = await api.space(created.id);
        setSpace(target);
      }
      const started = await api.startSpace(target?.id || "", workbench.doc?.id || "");
      current = await api.conversation(domain, started.id);
      setChat(current);
    }
    return current;
  };

  return { domain, chat, banner, refresh, ensure };
}

function named(text: string, path?: string): string {
  const repository = path?.match(/^repos\/github\/([^/]+\/[^/]+)/);
  if (repository) return repository[1];
  if (path) return path.split("/").pop()!.replace(/\.(md|html)$/, "");
  return text.length > 24 ? `${text.slice(0, 24)}…` : text;
}
