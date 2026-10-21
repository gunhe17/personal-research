"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type TreeNode } from "@/lib/api";
import { cx } from "@/lib/cx";
import { emit, listen } from "@/lib/events";
import type { Item } from "@/lib/items";
import { save } from "@/lib/storage";
import Fold from "@/ui/Fold";
import Icon from "@/ui/Icon";
import TreeRow from "@/ui/TreeRow";
import FoldList from "@/ui/FoldList";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";
import Heading from "./Heading";
import Hint from "./Hint";
import Leaf from "./Leaf";
import PendingRows from "./PendingRows";
import { documentRow, NEST } from "./rows";
import Search from "./Search";

export default function CollectedSection({ expanded, isOpen, onToggle, onClose }: { expanded: Record<string, boolean>; isOpen: (key: string, fallback?: boolean) => boolean; onToggle: (key: string, fallback?: boolean) => void; onClose: (keys: string[]) => void }) {
  const workbench = useWorkbench();
  const router = useRouter();
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const open = isOpen("library", false);
  const libraryKeys = Object.keys(expanded).filter((key) => key.startsWith("library:"));
  const active = workbench.activeKey;

  useEffect(() => {
    if (open && !tree) api.tree().then((data) => setTree(data.tree), () => setTree([]));
  });

  useEffect(() => listen("collected", () => api.tree().then((data) => setTree(data.tree), () => {})), []);

  return (
    <>
      <Heading label="Collected" icon="collected" onToggle={() => onToggle("library", false)} onCollapse={open && libraryKeys.some((key) => expanded[key]) ? () => onClose(libraryKeys) : undefined} collapseLabel="Collapse collected" />
      <Fold open={open} className={NEST}>
        <Search value={query} onChange={setQuery} label="Search collected" />
        {tree ? (
          <div key={needle ? "found" : "tree"} className="enter-fade flex flex-col gap-1">
            {!tree.length && <Hint text="Nothing yet" />}
            {needle ? (
              <Found needle={needle} tree={tree} active={active} onOpen={workbench.open} />
            ) : (
              <FoldList items={tree} keyOf={(node) => node.path}>{(node) => <Branch node={node} isOpen={(key) => isOpen(key, false)} onToggle={(key) => onToggle(key, false)} active={active} onOpen={workbench.open} />}</FoldList>
            )}
          </div>
        ) : (
          <PendingRows />
        )}
        <TreeRow
          variant="leaf"
          flat
          label="새 수집"
          icon="plus"
          onClick={() => {
            save("homeMode", "collect");
            router.push("/");
            emit("collect");
            emit("sidebar");
          }}
        />
      </Fold>
    </>
  );
}

function Branch({ node, isOpen, onToggle, active, onOpen }: { node: TreeNode; isOpen: (key: string) => boolean; onToggle: (key: string) => void; active: string; onOpen: (item: Item) => void }) {
  if (node.type === "file") return <Leaf row={documentRow(node)} active={active} onOpen={onOpen} flat />;
  const key = `library:${node.path}`;
  const kind = !node.path.includes("/");
  return (
    <div className="flex flex-col gap-1">
      <TreeRow label={node.name} icon={<Icon name={kind ? node.name : "folder"} className={cx("h-3.5 w-3.5", kind ? "text-apple-link" : "text-slate-500")} />} open={isOpen(key)} onClick={() => onToggle(key)} />
      <Fold open={isOpen(key)} className={NEST}>
        {!node.children.length && <Hint text="Nothing yet" small />}
        <FoldList items={node.children} keyOf={(child) => child.path}>{(child) => <Branch node={child} isOpen={isOpen} onToggle={onToggle} active={active} onOpen={onOpen} />}</FoldList>
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
