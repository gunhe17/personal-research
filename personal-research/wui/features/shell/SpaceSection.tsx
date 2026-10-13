"use client";

import { useState } from "react";
import type { Space, SpaceItem } from "@/lib/api";
import { cx } from "@/lib/cx";
import { itemKey, type Item } from "@/lib/items";
import Fold from "@/ui/Fold";
import Icon from "@/ui/Icon";
import TreeRow from "@/ui/TreeRow";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";
import Heading from "./Heading";
import Hint from "./Hint";
import Leaf from "./Leaf";
import removeConversation from "./removeConversation";
import { NEST, sections } from "./rows";
import Search from "./Search";
import { useSpaces } from "./useSpaces";

const FOLDERS = ["conversations", "collected", "materials"];

export default function SpaceSection({ isOpen, onToggle, onClose, onReveal }: { isOpen: (key: string, fallback?: boolean) => boolean; onToggle: (key: string, fallback?: boolean) => void; onClose: (keys: string[]) => void; onReveal: (key: string) => void }) {
  const workbench = useWorkbench();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const needle = query.trim().toLowerCase();
  const current = workbench.activeSpace;
  const active = workbench.activeKey;
  const spaceOpen = (space: SpaceItem) => isOpen(space.id, space.id === current);
  const { spaces, details } = useSpaces((space) => Boolean(needle) || spaceOpen(space));
  const spaceKeys = (spaces || []).flatMap((space) => [space.id, ...FOLDERS.map((key) => `${space.id}:${key}`)]);

  return (
    <>
      <Heading label="Space" icon="grid" onToggle={() => onToggle("spaces")} onCollapse={isOpen("spaces") && (spaces || []).some(spaceOpen) ? () => onClose(spaceKeys) : undefined} collapseLabel="Collapse all" />
      <Fold open={isOpen("spaces")} className={NEST}>
        <Search value={query} onChange={setQuery} label="Search spaces" />
        {needle ? (
          <Results
            needle={needle}
            spaces={spaces || []}
            details={details}
            active={active}
            onOpen={workbench.open}
            onReveal={(space) => {
              onReveal(space);
              setQuery("");
            }}
          />
        ) : (
          <>
            {spaces && !spaces.length && <Hint text="Nothing yet" />}
            {(spaces || []).slice(0, all ? undefined : 12).map((space) => (
              <div key={space.id} className="flex flex-col gap-1">
                <TreeRow
                  label={space.title}
                  icon={<Icon name="space" className={cx("h-4 w-4", space.id === current ? "text-apple-link" : "text-slate-500")} />}
                  open={spaceOpen(space)}
                  strong={space.id === current}
                  onClick={() => onToggle(space.id, space.id === current)}
                />
                <Fold open={spaceOpen(space) && Boolean(details[space.id])} className={NEST}>
                  {details[space.id] && <Folders space={details[space.id]} isOpen={isOpen} onToggle={onToggle} active={active} onOpen={workbench.open} />}
                </Fold>
              </div>
            ))}
            {!all && (spaces || []).length > 12 && <TreeRow variant="leaf" flat label="더 보기" onClick={() => setAll(true)} />}
          </>
        )}
      </Fold>
    </>
  );
}

function Folders({ space, isOpen, onToggle, active, onOpen }: { space: Space; isOpen: (key: string) => boolean; onToggle: (key: string) => void; active: string; onOpen: (item: Item) => void }) {
  const workbench = useWorkbench();
  return (
    <>
      {sections(space).map(([key, name, rows]) => {
        const id = `${space.id}:${key}`;
        return (
          <div key={key} className="flex flex-col gap-1">
            <TreeRow small label={name} icon={<Icon name={key} className="h-3.5 w-3.5 text-apple-link" />} open={isOpen(id)} count={key === "conversations" ? space.conversations.length : rows.length} onClick={() => onToggle(id)} />
            <Fold open={isOpen(id)} className="flex flex-col gap-1">
              {!rows.length && <Hint text="Nothing yet" small indent />}
              {rows.map((row) => <Leaf key={itemKey(row[0])} row={row} active={active} onOpen={onOpen} onRemove={row[0].kind === "chat" && row[0].conversation ? () => removeConversation(workbench, row[0]) : undefined} />)}
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
