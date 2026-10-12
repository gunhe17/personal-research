"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { api, type ConversationItem, type Space, type SpaceItem } from "@/lib/api";
import { listen } from "@/lib/events";
import { load, save } from "@/lib/storage";
import Fold from "@/ui/Fold";
import Icon from "@/ui/Icon";
import IconButton from "@/ui/IconButton";
import TreeRow from "@/ui/TreeRow";
import { itemKey, type Item } from "@/features/workbench/items";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";

type Row = [Item, string, string];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const workbench = useWorkbench();
  const [spaces, setSpaces] = useState<SpaceItem[] | null>(null);
  const [details, setDetails] = useState<Record<string, Space>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [agents, setAgents] = useState<ConversationItem[] | null>(null);
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

  useEffect(() => {
    const reload = () => api.agents().then((data) => setAgents(data.items), () => setAgents([]));
    reload();
    return listen("agents", reload);
  }, []);

  const current = workbench.activeSpace;
  const needle = query.trim().toLowerCase();
  const isOpen = (key: string, fallback = true) => expanded[key] ?? fallback;
  const remember = (next: Record<string, boolean>) => {
    setExpanded(next);
    save("spaceExpanded", next);
  };
  const toggle = (key: string, fallback = true) => remember({ ...expanded, [key]: !isOpen(key, fallback) });
  const collapse = () => remember({
    ...expanded,
    spaces: true,
    ...Object.fromEntries((spaces || []).flatMap((space) => [space.id, ...["conversations", "collected", "materials"].map((key) => `${space.id}:${key}`)]).map((key) => [key, false])),
  });
  const reveal = (space: string) => {
    remember({ ...expanded, [space]: true });
    setQuery("");
  };

  useEffect(() => {
    for (const space of spaces || []) {
      if ((needle || isOpen(space.id, space.id === current)) && !requested.current.has(space.id)) {
        requested.current.add(space.id);
        api.space(space.id).then((detail) => setDetails((all) => ({ ...all, [space.id]: detail })), () => {});
      }
    }
  });

  return (
    <nav className="flex flex-col gap-1 px-2 pt-2 pb-2">
      <TreeRow variant="nav" label="Home" icon="home" active={pathname === "/"} onClick={() => router.push("/")} />
      <div className="group relative">
        <TreeRow variant="nav" label="Space" icon="grid" onClick={() => toggle("spaces")} />
        <IconButton icon="collapse" size="sm" label="Collapse all" onClick={collapse} className="absolute top-1/2 right-1.5 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
      </div>
      <Fold open={isOpen("spaces")} className="mt-1 ml-3 border-l border-slate-100 pl-1">
        <label className="mb-1 ml-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-slate-400 transition focus-within:border-apple focus-within:bg-white">
          <Icon name="search" className="h-3.5 w-3.5" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Escape" && setQuery("")}
            placeholder="Search spaces"
            aria-label="Search spaces"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-700">
              <Icon name="close" className="h-3 w-3" />
            </button>
          )}
        </label>
        {needle ? (
          <Results needle={needle} spaces={spaces || []} details={details} active={workbench.activeKey} onOpen={(item) => workbench.open(item)} onReveal={reveal} />
        ) : (
          <>
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
          </>
        )}
      </Fold>
      <TreeRow variant="nav" label="Agent" icon="chat" onClick={() => toggle("agents")} />
      <Fold open={isOpen("agents")} className="mt-1 ml-3 border-l border-slate-100 pl-1">
        {agents && !agents.length && <div className="px-2 py-1.5 text-xs text-slate-400">Nothing yet</div>}
        {(agents || []).map((conversation) => (
          <Leaf
            key={conversation.id}
            row={[{ kind: "agent", agent: conversation.id, title: conversation.title }, conversation.collected_id ? "collected" : "chat", conversation.title || "새 대화"]}
            active={workbench.activeKey}
            onOpen={(item) => workbench.open(item)}
            flat
          />
        ))}
      </Fold>
    </nav>
  );
}

function Folders({ space, isOpen, toggle, active, onOpen }: { space: Space; isOpen: (key: string) => boolean; toggle: (key: string) => void; active: string; onOpen: (item: Item) => void }) {
  return (
    <>
      {sections(space).map(([key, name, rows]) => {
        const id = `${space.id}:${key}`;
        return (
          <div key={key}>
            <TreeRow small label={name} icon={<Icon name={key} className="h-3.5 w-3.5 text-apple-link" />} open={isOpen(id)} count={key === "conversations" ? space.conversations.length : rows.length} onClick={() => toggle(id)} />
            <Fold open={isOpen(id)}>
              {!rows.length && <div className="pr-2 pb-1 pl-9 text-[11px] text-slate-400">비어 있음</div>}
              {rows.map((row) => <Leaf key={itemKey(row[0])} row={row} active={active} onOpen={onOpen} />)}
            </Fold>
          </div>
        );
      })}
    </>
  );
}

function Results({ needle, spaces, details, active, onOpen, onReveal }: { needle: string; spaces: SpaceItem[]; details: Record<string, Space>; active: string; onOpen: (item: Item) => void; onReveal: (space: string) => void }) {
  const found = spaces.flatMap((space) => {
    const rows = details[space.id] ? sections(details[space.id]).flatMap(([, , rows]) => rows).filter(([item]) => item.kind !== "chat" || item.conversation) : [];
    const hits = rows.filter(([item, , label]) => `${label} ${item.kind === "doc" ? item.path || "" : ""}`.toLowerCase().includes(needle));
    return space.title.toLowerCase().includes(needle) || hits.length ? [{ space, hits }] : [];
  });
  if (!found.length) return <div className="px-2 py-1.5 text-[12px] text-slate-400">No matches</div>;
  return (
    <>
      {found.map(({ space, hits }) => (
        <div key={space.id}>
          <TreeRow label={space.title} icon={<Icon name="space" className="h-4 w-4 text-slate-500" />} onClick={() => onReveal(space.id)} />
          {hits.map((row) => <Leaf key={itemKey(row[0])} row={row} active={active} onOpen={onOpen} />)}
        </div>
      ))}
    </>
  );
}

function Leaf({ row: [item, icon, label], active, onOpen, flat }: { row: Row; active: string; onOpen: (item: Item) => void; flat?: boolean }) {
  return (
    <TreeRow
      variant="leaf"
      flat={flat}
      label={label}
      icon={icon}
      active={active === itemKey(item)}
      onClick={() => onOpen(item)}
      onDragStart={(event: DragEvent) => {
        event.dataTransfer.setData("application/x-research", JSON.stringify(item));
        event.dataTransfer.effectAllowed = "copyMove";
      }}
    />
  );
}

function sections(space: Space): [string, string, Row[]][] {
  const conversations: Row[] = [
    ...space.conversations.map((c): Row => [{ kind: "chat", space: space.id, conversation: c.id, title: c.title }, "chat", c.title]),
    [{ kind: "chat", space: space.id, conversation: "", title: "새 대화" }, "plus", "새 대화"],
  ];
  const collected = space.collected.flatMap((root) => (root.documents.length ? root.documents : [root]).map((d): Row => [
    { kind: "doc", id: d.id, title: d.path.split("/").pop(), path: d.path },
    d.path.split("/")[0],
    d.path.split("/").slice(2).join("/") || d.path,
  ]));
  const materials = space.materials.map((m): Row => [{ kind: "material", id: m.id, title: m.title, material: m.kind }, m.kind, m.title]);

  return [
    ["conversations", "Conversations", conversations],
    ["collected", "Collected", collected],
    ["materials", "Materials", materials],
  ];
}
