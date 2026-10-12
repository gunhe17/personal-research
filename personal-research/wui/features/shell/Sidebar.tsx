"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { api, type ConversationItem, type Space, type SpaceItem, type TreeNode } from "@/lib/api";
import { cx } from "@/lib/cx";
import { listen } from "@/lib/events";
import { load, save } from "@/lib/storage";
import Fold from "@/ui/Fold";
import Icon from "@/ui/Icon";
import IconButton from "@/ui/IconButton";
import TreeRow from "@/ui/TreeRow";
import { itemKey, type Item } from "@/lib/items";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";

type Row = [Item, string, string];

const NEST = "ml-3 flex flex-col gap-1 border-l border-slate-100 pl-2";
const NEW = "새 대화";
const FOLDERS = ["conversations", "collected", "materials"];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const workbench = useWorkbench();
  const [spaces, setSpaces] = useState<SpaceItem[] | null>(null);
  const [details, setDetails] = useState<Record<string, Space>>({});
  const [agents, setAgents] = useState<ConversationItem[] | null>(null);
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [agentQuery, setAgentQuery] = useState("");
  const [documentQuery, setDocumentQuery] = useState("");
  const [spaceQuery, setSpaceQuery] = useState("");
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
    const reload = () => api.agentConversations().then((data) => setAgents(data.items), () => setAgents([]));
    reload();
    return listen("agents", reload);
  }, []);

  const current = workbench.activeSpace;
  const active = workbench.activeKey;
  const open = (item: Item) => workbench.open(item);
  const isOpen = (key: string, fallback = true) => expanded[key] ?? fallback;
  const remember = (next: Record<string, boolean>) => {
    setExpanded(next);
    save("spaceExpanded", next);
  };
  const toggle = (key: string, fallback = true) => remember({ ...expanded, [key]: !isOpen(key, fallback) });
  const close = (keys: string[]) => remember({ ...expanded, ...Object.fromEntries(keys.map((key) => [key, false])) });

  const spaceOpen = (space: SpaceItem) => isOpen(space.id, space.id === current);
  const spaceNeedle = spaceQuery.trim().toLowerCase();
  const documentNeedle = documentQuery.trim().toLowerCase();
  const agentNeedle = agentQuery.trim().toLowerCase();
  const libraryKeys = Object.keys(expanded).filter((key) => key.startsWith("library:"));
  const spaceKeys = (spaces || []).flatMap((space) => [space.id, ...FOLDERS.map((key) => `${space.id}:${key}`)]);
  const matchedAgents = (agents || []).filter((conversation) => (conversation.title || NEW).toLowerCase().includes(agentNeedle));

  useEffect(() => {
    if (isOpen("library", false) && !tree) api.tree().then((data) => setTree(data.tree), () => setTree([]));
    for (const space of spaces || []) {
      if ((spaceNeedle || spaceOpen(space)) && !requested.current.has(space.id)) {
        requested.current.add(space.id);
        api.space(space.id).then((detail) => setDetails((all) => ({ ...all, [space.id]: detail })), () => {});
      }
    }
  });

  return (
    <nav className="flex flex-col gap-1 px-2 pt-2 pb-2">
      <TreeRow variant="nav" label="Home" icon="home" active={pathname === "/"} onClick={() => router.push("/")} />

      <TreeRow variant="nav" label="Agent" icon="agent" onClick={() => toggle("agents")} />
      <Fold open={isOpen("agents")} className={NEST}>
        <Search value={agentQuery} onChange={setAgentQuery} label="Search agents" />
        {agentNeedle && !matchedAgents.length && <Hint text="No matches" />}
        {matchedAgents.map((conversation) => (
          <Leaf
            key={conversation.id}
            row={[{ kind: "agent", agent: conversation.id, title: conversation.title }, conversation.collected_id ? "collected" : "chat", conversation.title || NEW]}
            active={active}
            onOpen={open}
            flat
          />
        ))}
        <Leaf row={[{ kind: "agent", agent: "", title: NEW }, "plus", NEW]} active={active} onOpen={open} flat />
      </Fold>

      <Heading label="Collected" icon="collected" onToggle={() => toggle("library", false)} onCollapse={isOpen("library", false) && libraryKeys.some((key) => expanded[key]) ? () => close(libraryKeys) : undefined} collapseLabel="Collapse collected" />
      <Fold open={isOpen("library", false)} className={NEST}>
        <Search value={documentQuery} onChange={setDocumentQuery} label="Search collected" />
        {tree && !tree.length && <Hint text="Nothing yet" />}
        {documentNeedle ? (
          <Found needle={documentNeedle} tree={tree || []} active={active} onOpen={open} />
        ) : (
          (tree || []).map((node) => <Branch key={node.path} node={node} isOpen={(key) => isOpen(key, false)} toggle={(key) => toggle(key, false)} active={active} onOpen={open} />)
        )}
      </Fold>

      <Heading label="Space" icon="grid" onToggle={() => toggle("spaces")} onCollapse={isOpen("spaces") && (spaces || []).some(spaceOpen) ? () => close(spaceKeys) : undefined} collapseLabel="Collapse all" />
      <Fold open={isOpen("spaces")} className={NEST}>
        <Search value={spaceQuery} onChange={setSpaceQuery} label="Search spaces" />
        {spaceNeedle ? (
          <Results
            needle={spaceNeedle}
            spaces={spaces || []}
            details={details}
            active={active}
            onOpen={open}
            onReveal={(space) => {
              remember({ ...expanded, [space]: true });
              setSpaceQuery("");
            }}
          />
        ) : (
          <>
            {spaces && !spaces.length && <Hint text="Nothing yet" />}
            {(spaces || []).slice(0, 12).map((space) => (
              <div key={space.id} className="flex flex-col gap-1">
                <TreeRow
                  label={space.title}
                  icon={<Icon name="space" className={cx("h-4 w-4", space.id === current ? "text-apple-link" : "text-slate-500")} />}
                  open={spaceOpen(space)}
                  strong={space.id === current}
                  onClick={() => toggle(space.id, space.id === current)}
                />
                <Fold open={spaceOpen(space) && Boolean(details[space.id])} className={NEST}>
                  {details[space.id] && <Folders space={details[space.id]} isOpen={isOpen} toggle={toggle} active={active} onOpen={open} />}
                </Fold>
              </div>
            ))}
          </>
        )}
      </Fold>
    </nav>
  );
}

function Heading({ label, icon, onToggle, onCollapse, collapseLabel }: { label: string; icon: string; onToggle: () => void; onCollapse?: () => void; collapseLabel: string }) {
  return (
    <div className="relative">
      <TreeRow variant="nav" label={label} icon={icon} onClick={onToggle} />
      {onCollapse && <IconButton icon="collapse" size="sm" label={collapseLabel} onClick={onCollapse} className="absolute top-1/2 right-0 -translate-y-1/2" />}
    </div>
  );
}

function Hint({ text, small, indent }: { text: string; small?: boolean; indent?: boolean }) {
  return <div className={cx("flex h-8 items-center text-slate-400", small ? "text-[11px]" : "text-[12px]", indent ? "pr-2 pl-9" : "px-2")}>{text}</div>;
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
  const kind = !node.path.includes("/");
  return (
    <div className="flex flex-col gap-1">
      <TreeRow label={node.name} icon={<Icon name={kind ? node.name : "folder"} className={cx("h-3.5 w-3.5", kind ? "text-apple-link" : "text-slate-500")} />} open={isOpen(key)} onClick={() => toggle(key)} />
      <Fold open={isOpen(key)} className={NEST}>
        {!node.children.length && <Hint text="Nothing yet" small />}
        {node.children.map((child) => <Branch key={child.path} node={child} isOpen={isOpen} toggle={toggle} active={active} onOpen={onOpen} />)}
      </Fold>
    </div>
  );
}

function Found({ needle, tree, active, onOpen }: { needle: string; tree: TreeNode[]; active: string; onOpen: (item: Item) => void }) {
  const files = (nodes: TreeNode[]): TreeNode[] => nodes.flatMap((node) => (node.type === "file" ? [node] : files(node.children)));
  const hits = files(tree).filter((node) => node.path.toLowerCase().includes(needle));
  if (!hits.length) return <Hint text="No matches" />;
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
              {!rows.length && <Hint text="Nothing yet" small indent />}
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
  if (!found.length) return <Hint text="No matches" />;
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
