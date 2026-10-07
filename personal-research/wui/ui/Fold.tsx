"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export default function Fold({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);

  useLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const node = box.current;
    if (!node) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (!open) setShown(false);
      return;
    }
    node.getAnimations().forEach((animation) => animation.cancel());
    const height = node.scrollHeight;
    node.style.overflow = "hidden";
    const animation = node.animate(
      open ? [{ height: "0px", opacity: 0 }, { height: `${height}px`, opacity: 1 }] : [{ height: `${height}px`, opacity: 1 }, { height: "0px", opacity: 0 }],
      { duration: open ? 240 : 180, easing: open ? "cubic-bezier(0.22, 1, 0.36, 1)" : "cubic-bezier(0.4, 0, 1, 1)" },
    );
    animation.onfinish = () => {
      node.style.overflow = "";
      if (!open) setShown(false);
    };
  }, [open]);

  if (!shown) return null;
  return <div ref={box} className={className}>{children}</div>;
}
