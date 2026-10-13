import { api } from "@/lib/api";
import { emit } from "@/lib/events";
import { itemKey, type Item } from "@/lib/items";
import type { useWorkbench } from "@/features/workbench/WorkbenchProvider";

export default async function removeConversation(workbench: ReturnType<typeof useWorkbench>, item: Item) {
  if (item.kind === "agent") await api.removeConversation("agent", item.agent);
  else if (item.kind === "chat" && item.conversation) await api.removeConversation("space", item.conversation);
  else return;
  for (const group of workbench.groups) if (itemKey(group.item) === itemKey(item)) workbench.close(group.id);
  emit(item.kind === "agent" ? "agents" : "spaces");
}
