"use client";

import { useMemo, useState } from "react";
import { api, type Space, type SpaceItem } from "@/lib/api";
import { cx } from "@/lib/cx";
import { emit } from "@/lib/events";
import { itemKey, type Item } from "@/lib/items";
import Fold from "@/ui/Fold";
import Icon from "@/ui/Icon";
import { toast } from "@/ui/Toaster";
import TreeRow from "@/ui/TreeRow";
import FoldList from "@/ui/FoldList";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";
import Heading from "./Heading";
import Hint from "./Hint";
import Leaf from "./Leaf";
import PendingRows from "./PendingRows";
import Removable from "./Removable";
import removeConversation from "./removeConversation";
import { NEST, NEW, sections } from "./rows";
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
  const shown = useMemo(() => spaces && spaces.slice(0, all ? undefined : 12), [spaces, all]);
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
            {!spaces && <PendingRows />}
            {spaces && (
              <div className="enter-fade flex flex-col gap-1">
                {!spaces.length && <Hint text="Nothing yet" />}
                <FoldList items={shown} keyOf={(space) => space.id} className="flex flex-col gap-1">
                  {(space) => (
                    <>
                      <Removable title="Delete space" message={`“${space.title}” space 를 지웁니다. 안의 대화와 자료도 함께 휴지통으로 갑니다.`} selected={space.id === current} onRemove={() => removeSpace(workbench, space.id, details[space.id])}>
                        <TreeRow
                          label={space.title}
                          icon={<Icon name="space" className={cx("h-4 w-4", space.id === current ? "text-apple-link" : "text-slate-500")} />}
                          open={spaceOpen(space)}
                          strong={space.id === current}
                          onClick={() => onToggle(space.id, space.id === current)}
                        />
                      </Removable>
                      <Fold open={spaceOpen(space)} className={NEST}>
                        <Folders space={details[space.id]} isOpen={isOpen} onToggle={onToggle} active={active} onOpen={workbench.open} />
                      </Fold>
                    </>
                  )}
                </FoldList>
                {!all && spaces.length > 12 && <TreeRow variant="leaf" flat label="더 보기" onClick={() => setAll(true)} />}
              </div>
            )}
            <TreeRow
              variant="leaf"
              flat
              label="새 space"
              icon="plus"
              onClick={async () => {
                const created = await api.createSpace("", "").catch((failure: Error) => toast(failure.message));
                if (!created) return;
                emit("spaces");
                onReveal(created.id);
                workbench.open({ kind: "chat", space: created.id, conversation: "", title: NEW });
                emit("sidebar");
              }}
            />
          </>
        )}
      </Fold>
    </>
  );
}

function Folders({ space, isOpen, onToggle, active, onOpen }: { space: Space | null | undefined; isOpen: (key: string) => boolean; onToggle: (key: string) => void; active: string; onOpen: (item: Item) => void }) {
  const workbench = useWorkbench();
  const folders = useMemo(() => space && sections(space), [space]);
  if (space === undefined) return <PendingRows folder />;
  if (!space || !folders) return <Hint text="Could not load" small />;
  return (
    <div className="enter-fade flex flex-col gap-1">
      {folders.map(([key, name, rows]) => {
        const id = `${space.id}:${key}`;
        return (
          <div key={key} className="flex flex-col gap-1">
            <TreeRow small label={name} icon={<Icon name={key} className="h-3.5 w-3.5 text-apple-link" />} open={isOpen(id)} count={key === "conversations" ? space.conversations.length : rows.length} onClick={() => onToggle(id)} />
            <Fold open={isOpen(id)} className="flex flex-col gap-1">
              {!rows.length && <Hint text="Nothing yet" small indent />}
              <FoldList items={rows} keyOf={(row) => itemKey(row[0])}>
                {(row) => <Leaf row={row} active={active} onOpen={onOpen} onRemove={row[0].kind === "chat" && row[0].conversation ? () => removeConversation(workbench, row[0]) : undefined} />}
              </FoldList>
            </Fold>
          </div>
        );
      })}
    </div>
  );
}

function Results({ needle, spaces, details, active, onOpen, onReveal }: { needle: string; spaces: SpaceItem[]; details: Record<string, Space | null>; active: string; onOpen: (item: Item) => void; onReveal: (space: string) => void }) {
  const found = spaces.flatMap((space) => {
    const detail = details[space.id];
    const rows = detail ? sections(detail).flatMap(([, , rows]) => rows).filter(([item]) => item.kind !== "chat" || item.conversation) : [];
    const hits = rows.filter(([item, , label]) => `${label} ${item.kind === "doc" ? item.path || "" : ""}`.toLowerCase().includes(needle));
    return space.title.toLowerCase().includes(needle) || hits.length ? [{ space, hits }] : [];
  });
  if (!found.length) return <Hint text="No matches" />;
  return (
    <div className="enter-fade flex flex-col gap-1">
      {found.map(({ space, hits }) => (
        <div key={space.id} className="flex flex-col gap-1">
          <TreeRow label={space.title} icon={<Icon name="space" className="h-4 w-4 text-slate-500" />} onClick={() => onReveal(space.id)} />
          {hits.map((row) => <Leaf key={itemKey(row[0])} row={row} active={active} onOpen={onOpen} />)}
        </div>
      ))}
    </div>
  );
}

async function removeSpace(workbench: ReturnType<typeof useWorkbench>, id: string, space: Space | null | undefined) {
  await api.removeSpace(id);
  const materials = new Set((space?.materials || []).map((material) => material.id));
  for (const group of workbench.groups) if ((group.item.kind === "chat" && group.item.space === id) || (group.item.kind === "material" && materials.has(group.item.id))) workbench.close(group.id);
  emit("spaces");
}
