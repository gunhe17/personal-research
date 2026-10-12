import { useEffect, type RefObject } from "react";

export default function useOutside(ref: RefObject<Element | null>, onClose: () => void, when = true) {
  useEffect(() => {
    if (!when) return;
    const outside = (event: PointerEvent) => !ref.current?.contains(event.target as Node) && onClose();
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [ref, onClose, when]);
}
