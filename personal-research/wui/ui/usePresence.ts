import { useEffect, useRef, useState } from "react";

export const EXIT = 200;

export default function usePresence<T>(open: boolean, content?: T) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const last = useRef(content);
  if (open) last.current = content;
  if (open && !mounted) setMounted(true);
  if (open && leaving) setLeaving(false);

  useEffect(() => {
    if (open || !mounted) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMounted(false);
      return;
    }
    setLeaving(true);
    const timer = setTimeout(() => {
      setMounted(false);
      setLeaving(false);
    }, EXIT);
    return () => clearTimeout(timer);
  }, [open, mounted]);

  return { mounted, leaving, content: open ? content : last.current };
}
