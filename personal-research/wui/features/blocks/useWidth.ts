import { useEffect, useRef, useState } from "react";

export function useWidth(fallback = 640) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setWidth(Math.max(260, Math.round(node.getBoundingClientRect().width))));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { box, width };
}
