import { useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import Button from "@/ui/Button";
import IconButton from "@/ui/IconButton";
import Popup from "@/ui/Popup";

type Props = { title: string; message: ReactNode; selected?: boolean; onRemove: () => Promise<unknown>; children: ReactNode };

export default function Removable({ title, message, selected, onRemove, children }: Props) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

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
      {children}
      <IconButton
        icon="trash"
        size="sm"
        label={title}
        onClick={() => {
          setError("");
          setAsking(true);
        }}
        className={cx("absolute top-1/2 right-1 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100", selected ? "bg-ice pointer-coarse:opacity-100" : "bg-slate-50")}
      />
      <Popup
        open={asking}
        label={title}
        title={title}
        onClose={() => setAsking(false)}
        actions={
          <>
            <Button tone="quiet" size="sm" onClick={() => setAsking(false)}>Cancel</Button>
            <Button tone="fill" size="sm" onClick={remove}>Delete</Button>
          </>
        }
      >
        {message}
        {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
      </Popup>
    </div>
  );
}
