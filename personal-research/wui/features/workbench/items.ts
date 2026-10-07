export type Item =
  | { kind: "chat"; space: string; conversation: string | null; title?: string }
  | { kind: "agent"; agent: string; title?: string }
  | { kind: "doc"; id: string; title?: string; path?: string }
  | { kind: "material"; id: string; title?: string; material?: string };

export type Group = { id: string; item: Item };

export type Side = "left" | "right" | "center";

export const LIMIT = 4;

export function itemKey(item: Item): string {
  if (item.kind === "chat") return item.conversation ? `chat:${item.conversation}` : `chat:${item.conversation === "" ? "new" : "latest"}:${item.space}`;
  if (item.kind === "agent") return `agent:${item.agent}`;
  return `${item.kind}:${item.id}`;
}

export function kindLabel(item: Item): string {
  return { chat: "conversation", agent: "conversation", doc: "collected", material: "materials" }[item.kind];
}

export function fromQuery(params: URLSearchParams): Item[] {
  const items: Item[] = [];
  const open = params.get("open");
  if (open) {
    try {
      items.push(JSON.parse(open) as Item);
    } catch {}
  }
  const agent = params.get("agent");
  if (agent) items.push({ kind: "agent", agent, title: "Agent" });
  const space = params.get("space");
  if (space) items.push({ kind: "chat", space, conversation: params.get("new") ? "" : params.get("conversation"), title: "대화" });
  const material = params.get("material");
  if (material) items.push({ kind: "material", id: material });
  const doc = params.get("doc");
  if (doc) items.push({ kind: "doc", id: doc });
  return items;
}

export function legacy(saved: unknown): Group[] {
  const groups = (saved as { groups?: { id: string; item?: Item; tabs?: Item[]; active?: string }[] })?.groups || [];
  return groups
    .map((g) => ({ id: g.id, item: g.item || g.tabs?.find((t) => itemKey(t) === g.active) || g.tabs?.[0] }))
    .filter((g): g is Group => Boolean(g.item));
}
