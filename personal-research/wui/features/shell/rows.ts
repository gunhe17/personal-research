import type { Space, TreeNode } from "@/lib/api";
import type { Item } from "@/lib/items";

export type Row = [Item, string, string];

export const NEST = "ml-3 flex flex-col gap-1 border-l border-slate-100 pl-2";
export const NEW = "새 대화";

export function documentRow(node: TreeNode): Row {
  return [{ kind: "doc", id: node.type === "file" ? node.id : "", title: node.name, path: node.path }, node.path.split("/")[0], node.name];
}

export function sections(space: Space): [string, string, Row[]][] {
  const conversations: Row[] = [
    ...space.conversations.map((c): Row => [{ kind: "chat", space: space.id, conversation: c.id, title: c.title }, "chat", c.title]),
    [{ kind: "chat", space: space.id, conversation: "", title: NEW }, "plus", NEW],
  ];
  const collected = space.collected.flatMap((root) => (root.documents.length ? root.documents : [root]).map((d): Row => [
    { kind: "doc", id: d.id, title: d.path.split("/").pop(), path: d.path },
    d.path.split("/")[0],
    d.path.split("/").slice(2).join("/") || d.path,
  ]));
  const materials = space.materials.map((m): Row => [{ kind: "material", id: m.id, title: m.title }, m.kind, m.title]);

  return [
    ["conversations", "Conversations", conversations],
    ["collected", "Collected", collected],
    ["materials", "Materials", materials],
  ];
}
