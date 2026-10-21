"use client";

import { useMemo, useState } from "react";
import Fold from "@/ui/Fold";
import TreeRow from "@/ui/TreeRow";
import FoldList from "@/ui/FoldList";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";
import Hint from "./Hint";
import Leaf from "./Leaf";
import PendingRows from "./PendingRows";
import removeConversation from "./removeConversation";
import { NEST, NEW } from "./rows";
import Search from "./Search";
import { useAgents } from "./useAgents";

export default function AgentSection({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const workbench = useWorkbench();
  const agents = useAgents();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matched = useMemo(() => agents && agents.filter((conversation) => (conversation.title || NEW).toLowerCase().includes(needle)), [agents, needle]);
  const active = workbench.activeKey;

  return (
    <>
      <TreeRow variant="nav" label="Agent" icon="agent" onClick={onToggle} />
      <Fold open={open} className={NEST}>
        <Search value={query} onChange={setQuery} label="Search agents" />
        {needle && matched && !matched.length && <Hint text="No matches" />}
        {agents ? (
          <div className="enter-fade flex flex-col gap-1">
            <FoldList items={matched} keyOf={(conversation) => conversation.id}>
              {(conversation) => (
                <Leaf
                  row={[{ kind: "agent", agent: conversation.id, title: conversation.title }, conversation.collected_id ? "collected" : "chat", conversation.title || NEW]}
                  active={active}
                  onOpen={workbench.open}
                  onRemove={() => removeConversation(workbench, { kind: "agent", agent: conversation.id })}
                  flat
                />
              )}
            </FoldList>
          </div>
        ) : (
          <PendingRows />
        )}
        <Leaf row={[{ kind: "agent", agent: "", title: NEW }, "plus", NEW]} active={active} onOpen={workbench.open} flat />
      </Fold>
    </>
  );
}
