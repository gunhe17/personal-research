"use client";

import { useState } from "react";
import Fold from "@/ui/Fold";
import TreeRow from "@/ui/TreeRow";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";
import Hint from "./Hint";
import Leaf from "./Leaf";
import { NEST, NEW } from "./rows";
import Search from "./Search";
import { useAgents } from "./useAgents";

export default function AgentSection({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const workbench = useWorkbench();
  const agents = useAgents();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matched = (agents || []).filter((conversation) => (conversation.title || NEW).toLowerCase().includes(needle));
  const active = workbench.activeKey;

  return (
    <>
      <TreeRow variant="nav" label="Agent" icon="agent" onClick={onToggle} />
      <Fold open={open} className={NEST}>
        <Search value={query} onChange={setQuery} label="Search agents" />
        {needle && !matched.length && <Hint text="No matches" />}
        {matched.map((conversation) => (
          <Leaf
            key={conversation.id}
            row={[{ kind: "agent", agent: conversation.id, title: conversation.title }, conversation.collected_id ? "collected" : "chat", conversation.title || NEW]}
            active={active}
            onOpen={workbench.open}
            flat
          />
        ))}
        <Leaf row={[{ kind: "agent", agent: "", title: NEW }, "plus", NEW]} active={active} onOpen={workbench.open} flat />
      </Fold>
    </>
  );
}
