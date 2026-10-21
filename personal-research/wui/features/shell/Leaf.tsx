import type { DragEvent } from "react";
import { emit } from "@/lib/events";
import { itemKey, type Item } from "@/lib/items";
import TreeRow from "@/ui/TreeRow";
import Removable from "./Removable";
import type { Row } from "./rows";

type Props = { row: Row; active: string; onOpen: (item: Item) => void; onRemove?: () => Promise<unknown>; flat?: boolean };

export default function Leaf({ row: [item, icon, label], active, onOpen, onRemove, flat }: Props) {
  const selected = active === itemKey(item);
  const row = (
    <TreeRow
      variant="leaf"
      flat={flat}
      label={label}
      icon={icon}
      active={selected}
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
  if (!onRemove) return row;

  return (
    <Removable title="Delete conversation" message={`“${label}” 대화를 지웁니다. 목록과 작업대에서 사라집니다.`} selected={selected} onRemove={onRemove}>
      {row}
    </Removable>
  );
}
