import type { DragEvent } from "react";
import { emit } from "@/lib/events";
import { itemKey, type Item } from "@/lib/items";
import TreeRow from "@/ui/TreeRow";
import type { Row } from "./rows";

export default function Leaf({ row: [item, icon, label], active, onOpen, flat }: { row: Row; active: string; onOpen: (item: Item) => void; flat?: boolean }) {
  return (
    <TreeRow
      variant="leaf"
      flat={flat}
      label={label}
      icon={icon}
      active={active === itemKey(item)}
      onClick={() => {
        onOpen(item);
        emit("sidebar");
      }}
      onDragStart={(event: DragEvent) => {
        event.dataTransfer.setData("application/x-research", JSON.stringify(item));
        event.dataTransfer.effectAllowed = "copyMove";
      }}
    />
  );
}
