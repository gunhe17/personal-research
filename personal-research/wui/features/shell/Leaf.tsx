import { useState, type DragEvent } from "react";
import { cx } from "@/lib/cx";
import { emit } from "@/lib/events";
import { itemKey, type Item } from "@/lib/items";
import Button from "@/ui/Button";
import IconButton from "@/ui/IconButton";
import Popup from "@/ui/Popup";
import TreeRow from "@/ui/TreeRow";
import type { Row } from "./rows";

type Props = { row: Row; active: string; onOpen: (item: Item) => void; onRemove?: () => Promise<unknown>; flat?: boolean };

export default function Leaf({ row: [item, icon, label], active, onOpen, onRemove, flat }: Props) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
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

  const remove = async () => {
    try {
      await onRemove();
      setAsking(false);
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  return (
    <div className="group relative">
      {row}
      <IconButton
        icon="trash"
        size="sm"
        label="Delete conversation"
        onClick={() => {
          setError("");
          setAsking(true);
        }}
        className={cx("absolute top-1/2 right-1 -translate-y-1/2 bg-white/80 opacity-0 group-hover:opacity-100 focus-visible:opacity-100", selected && "pointer-coarse:opacity-100")}
      />
      {asking && (
        <Popup
          label="Delete conversation"
          title="Delete conversation"
          onClose={() => setAsking(false)}
          actions={
            <>
              <Button tone="quiet" size="sm" onClick={() => setAsking(false)}>Cancel</Button>
              <Button tone="fill" size="sm" onClick={remove}>Delete</Button>
            </>
          }
        >
          “{label}” 대화를 지웁니다. 목록과 작업대에서 사라집니다.
          {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
        </Popup>
      )}
    </div>
  );
}
