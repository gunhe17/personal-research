"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { api, type Space, type SpaceItem } from "@/lib/api";
import { listen } from "@/lib/events";
import { load, save } from "@/lib/storage";
import Fold from "@/ui/Fold";
import Icon from "@/ui/Icon";
import TreeRow from "@/ui/TreeRow";
import { itemKey, type Item } from "@/features/workbench/items";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const workbench = useWorkbench();
  const [spaces, setSpaces] = useState<SpaceItem[] | null>(null);
  const [details, setDetails] = useState<Record<string, Space>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const requested = useRef(new Set<string>());

  const refresh = useCallback(() => {
    api.spaces().then((data) => setSpaces(data.items), () => setSpaces([]));
    requested.current.clear();
    setDetails({});
  }, []);

  useEffect(() => {
    setExpanded(load("spaceExpanded", {}));
    refresh();
    return listen("spaces", refresh);
  }, [refresh]);

  const current = workbench.activeSpace;
  const isOpen = (key: string, fallback = true) => expanded[key] ?? fallback;
  const toggle = (key: string, fallback = true) => {
    const next = { ...expanded, [key]: !isOpen(key, fallback) };
    setExpanded(next);
    save("spaceExpanded", next);
  };

  useEffect(() => {
    for (const space of spaces || []) {
      if (isOpen(space.id, space.id === current) && !requested.current.has(space.id)) {
        requested.current.add(space.id);
        api.space(space.id).then((detail) => setDetails((all) => ({ ...all, [space.id]: detail })), () => {});
      }
    }
  });

  return (
    <nav className="flex flex-col gap-0.5 px-2 pt-2 pb-2">
      <TreeRow variant="nav" label="Home" icon="home" active={pathname === "/"} onClick={() => router.push("/")} />
      <TreeRow variant="nav" label="Space" icon="grid" onClick={() => toggle("spaces")} />
      <Fold open={isOpen("spaces")} className="mt-1 ml-3 border-l border-slate-100 pl-1">
        {spaces && !spaces.length && <div className="px-2 py-1.5 text-xs text-slate-400">Nothing yet</div>}
        {(spaces || []).slice(0, 12).map((space) => (
          <div key={space.id}>
            <TreeRow
              label={space.title}
              icon={<Icon name="space" className={space.id === current ? "h-4 w-4 text-apple-link" : "h-4 w-4 text-slate-500"} />}
              open={isOpen(space.id, space.id === current)}
              strong={space.id === current}
              onClick={() => toggle(space.id, space.id === current)}
            />
            <Fold open={isOpen(space.id, space.id === current) && Boolean(details[space.id])} className="mb-1 ml-3 border-l border-slate-100 pl-1">
              {details[space.id] && <Folders space={details[space.id]} isOpen={isOpen} toggle={toggle} active={workbench.activeKey} onOpen={(item) => workbench.open(item)} />}
            </Fold>
          </div>
        ))}
      </Fold>
    </nav>
  );
}

function Folders({ space, isOpen, toggle, active, onOpen }: { space: Space; isOpen: (key: string) => boolean; toggle: (key: string) => void; active: string; onOpen: (item: Item) => void }) {
  const conversations: [Item, string, string][] = [
    ...space.conversations.map((c): [Item, string, string] => [{ kind: "chat", space: space.id, conversation: c.id, title: c.title }, "chat", c.title]),
    [{ kind: "chat", space: space.id, conversation: "", title: "새 대화" }, "plus", "새 대화"],
  ];
  const collected = space.collected.flatMap((root) => (root.documents.length ? root.documents : [root]).map((d): [Item, string, string] => [
    { kind: "doc", id: d.id, title: d.path.split("/").pop(), path: d.path },
    d.path.split("/")[0],
    d.path.split("/").slice(2).join("/") || d.path,
  ]));
  const materials = space.materials.map((m): [Item, string, string] => [{ kind: "material", id: m.id, title: m.title, material: m.kind }, m.kind, m.title]);
  const folders: [string, string, [Item, string, string][]][] = [
    ["conversations", "Conversations", conversations],
    ["collected", "Collected", collected],
    ["materials", "Materials", materials],
  ];

  return (
    <>
      {folders.map(([key, name, rows]) => {
        const id = `${space.id}:${key}`;
        return (
          <div key={key}>
            <TreeRow small label={name} icon={<Icon name={key} className="h-3.5 w-3.5 text-apple-link" />} open={isOpen(id)} count={rows.length} onClick={() => toggle(id)} />
            <Fold open={isOpen(id)}>
              {!rows.length && <div className="pr-2 pb-1 pl-9 text-[11px] text-slate-400">비어 있음</div>}
              {rows.map(([item, icon, label]) => (
                <TreeRow
                  key={itemKey(item)}
                  variant="leaf"
                  label={label}
                  icon={icon}
                  active={active === itemKey(item)}
                  onClick={() => onOpen(item)}
                  onDragStart={(event: DragEvent) => {
                    event.dataTransfer.setData("application/x-research", JSON.stringify(item));
                    event.dataTransfer.effectAllowed = "copyMove";
                  }}
                />
              ))}
            </Fold>
          </div>
        );
      })}
    </>
  );
}
