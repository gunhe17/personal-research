"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { api, type ConversationItem, type Space, type SpaceItem, type TreeNode } from "@/lib/api";
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
  const [agentQuery, setAgentQuery] = useState("");
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [docQuery, setDocQuery] = useState("");
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

  useEffect(() => {
    if (isOpen("library", false) && !tree) api.tree().then((data) => setTree(data.tree), () => setTree([]));
  });

  const current = workbench.activeSpace;
  const shownAgents = (agents || []).filter((conversation) => (conversation.title || "새 대화").toLowerCase().includes(agentQuery.trim().toLowerCase()));
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
      <TreeRow variant="nav" label="Agent" icon="agent" onClick={() => toggle("agents")} />
      <Fold open={isOpen("agents")} className="ml-3 flex flex-col gap-1 border-l border-slate-100 pl-2">
        <Search value={agentQuery} onChange={setAgentQuery} label="Search agents" />
        {agentQuery.trim() && !shownAgents.length && <div className="flex h-8 items-center px-2 text-[12px] text-slate-400">No matches</div>}
        {shownAgents.map((conversation) => (
          <Leaf
            key={conversation.id}
            row={[{ kind: "agent", agent: conversation.id, title: conversation.title }, conversation.collected_id ? "collected" : "chat", conversation.title || "새 대화"]}
            active={workbench.activeKey}
            onOpen={(item) => workbench.open(item)}
            flat
          />
        ))}
        <Leaf row={[{ kind: "agent", agent: "", title: "새 대화" }, "plus", "새 대화"]} active={workbench.activeKey} onOpen={(item) => workbench.open(item)} flat />
      </Fold>
      <TreeRow variant="nav" label="Collected" icon="collected" onClick={() => toggle("library", false)} />
      <Fold open={isOpen("library", false)} className="ml-3 flex flex-col gap-1 border-l border-slate-100 pl-2">
        <Search value={docQuery} onChange={setDocQuery} label="Search collected" />
        {tree && !tree.length && <div className="flex h-8 items-center px-2 text-xs text-slate-400">Nothing yet</div>}
        {docQuery.trim() ? (
          <Found needle={docQuery.trim().toLowerCase()} tree={tree || []} active={workbench.activeKey} onOpen={(item) => workbench.open(item)} />
        ) : (
          (tree || []).map((node) => <Branch key={node.path} node={node} isOpen={(key) => isOpen(key, false)} toggle={(key) => toggle(key, false)} active={workbench.activeKey} onOpen={(item) => workbench.open(item)} />)
        )}
      </Fold>
      <div className="group relative">
        <TreeRow variant="nav" label="Space" icon="grid" onClick={() => toggle("spaces")} />
        <IconButton icon="collapse" size="sm" label="Collapse all" onClick={collapse} className="absolute top-1/2 right-1.5 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
      </div>
      <Fold open={isOpen("spaces")} className="ml-3 flex flex-col gap-1 border-l border-slate-100 pl-2">
        <Search value={query} onChange={setQuery} label="Search spaces" />
        {needle ? (
          <Results needle={needle} spaces={spaces || []} details={details} active={workbench.activeKey} onOpen={(item) => workbench.open(item)} onReveal={reveal} />
        ) : (
          <>
            {spaces && !spaces.length && <div className="flex h-8 items-center px-2 text-xs text-slate-400">Nothing yet</div>}
            {(spaces || []).slice(0, 12).map((space) => (
              <div key={space.id} className="flex flex-col gap-1">
                <TreeRow
                  label={space.title}
                  icon={<Icon name="space" className={space.id === current ? "h-4 w-4 text-apple-link" : "h-4 w-4 text-slate-500"} />}
                  open={isOpen(space.id, space.id === current)}
                  strong={space.id === current}
                  onClick={() => toggle(space.id, space.id === current)}
                />
                <Fold open={isOpen(space.id, space.id === current) && Boolean(details[space.id])} className="ml-3 flex flex-col gap-1 border-l border-slate-100 pl-2">
                  {details[space.id] && <Folders space={details[space.id]} isOpen={isOpen} toggle={toggle} active={workbench.activeKey} onOpen={(item) => workbench.open(item)} />}
                </Fold>
              </div>
            ))}
          </>
        )}
      </Fold>
    </nav>
  );
}

function Search({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-[7px] text-slate-400 transition focus-within:border-apple focus-within:bg-white">
      <Icon name="search" className="h-3.5 w-3.5" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === "Escape" && onChange("")}
        placeholder={label}
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="text-slate-400 hover:text-slate-700">
          <Icon name="close" className="h-3 w-3" />
        </button>
      )}
    </label>
  );
}

function Branch({ node, isOpen, toggle, active, onOpen }: { node: TreeNode; isOpen: (key: string) => boolean; toggle: (key: string) => void; active: string; onOpen: (item: Item) => void }) {
  if (node.type === "file") return <Leaf row={documentRow(node)} active={active} onOpen={onOpen} flat />;
  const key = `library:${node.path}`;
  return (
    <div className="flex flex-col gap-1">
      <TreeRow label={node.name} icon={<Icon name="folder" className="h-3.5 w-3.5 text-slate-500" />} open={isOpen(key)} onClick={() => toggle(key)} />
      <Fold open={isOpen(key)} className="ml-3 flex flex-col gap-1 border-l border-slate-100 pl-2">
        {node.children.map((child) => <Branch key={child.path} node={child} isOpen={isOpen} toggle={toggle} active={active} onOpen={onOpen} />)}
      </Fold>
    </div>
  );
}

function Found({ needle, tree, active, onOpen }: { needle: string; tree: TreeNode[]; active: string; onOpen: (item: Item) => void }) {
  const files = (nodes: TreeNode[]): TreeNode[] => nodes.flatMap((node) => (node.type === "file" ? [node] : files(node.children)));
  const hits = files(tree).filter((node) => node.path.toLowerCase().includes(needle));
  if (!hits.length) return <div className="flex h-8 items-center px-2 text-[12px] text-slate-400">No matches</div>;
  return <>{hits.slice(0, 50).map((node) => <Leaf key={node.path} row={documentRow(node)} active={active} onOpen={onOpen} flat />)}</>;
}

function documentRow(node: TreeNode): Row {
  return [{ kind: "doc", id: node.type === "file" ? node.id : "", title: node.name, path: node.path }, node.path.split("/")[0], node.name];
}

function Folders({ space, isOpen, toggle, active, onOpen }: { space: Space; isOpen: (key: string) => boolean; toggle: (key: string) => void; active: string; onOpen: (item: Item) => void }) {
  return (
    <>
      {sections(space).map(([key, name, rows]) => {
        const id = `${space.id}:${key}`;
        return (
          <div key={key} className="flex flex-col gap-1">
            <TreeRow small label={name} icon={<Icon name={key} className="h-3.5 w-3.5 text-apple-link" />} open={isOpen(id)} count={key === "conversations" ? space.conversations.length : rows.length} onClick={() => toggle(id)} />
            <Fold open={isOpen(id)} className="flex flex-col gap-1">
              {!rows.length && <div className="flex h-8 items-center pr-2 pl-9 text-[11px] text-slate-400">Nothing yet</div>}
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
  if (!found.length) return <div className="flex h-8 items-center px-2 text-[12px] text-slate-400">No matches</div>;
  return (
    <>
      {found.map(({ space, hits }) => (
        <div key={space.id} className="flex flex-col gap-1">
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
