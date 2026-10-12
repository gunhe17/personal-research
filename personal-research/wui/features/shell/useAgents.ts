import { useEffect, useState } from "react";
import { api, type ConversationItem } from "@/lib/api";
import { listen } from "@/lib/events";

export function useAgents() {
  const [agents, setAgents] = useState<ConversationItem[] | null>(null);

  useEffect(() => {
    const reload = () => api.agentConversations().then((data) => setAgents(data.items), () => setAgents([]));
    reload();
    return listen("agents", reload);
  }, []);

  return agents;
}
