import { useEffect } from "react";

export default function useEscape(onClose: () => void, { capture = false, when = true }: { capture?: boolean; when?: boolean } = {}) {
  useEffect(() => {
    if (!when) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (capture) event.preventDefault();
      else if (event.defaultPrevented) return;
      onClose();
    };
    window.addEventListener("keydown", escape, capture);
    return () => window.removeEventListener("keydown", escape, capture);
  }, [onClose, capture, when]);
}
