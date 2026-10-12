import { useEffect, type RefObject } from "react";

export default function useOutside(ref: RefObject<Element | null> | RefObject<Element | null>[], onClose: () => void, when = true) {
  useEffect(() => {
    if (!when) return;
    const boxes = Array.isArray(ref) ? ref : [ref];
    const outside = (event: PointerEvent) => !boxes.some((box) => box.current?.contains(event.target as Node)) && onClose();
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [ref, onClose, when]);
}
