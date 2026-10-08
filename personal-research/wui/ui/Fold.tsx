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
    const running = node.getAnimations().length > 0;
    const height = node.getBoundingClientRect().height;
    const opacity = Number(getComputedStyle(node).opacity);
    node.getAnimations().forEach((animation) => animation.cancel());
    const full = node.scrollHeight;
    const from = running ? { height: `${height}px`, opacity } : open ? { height: "0px", opacity: 0 } : { height: `${full}px`, opacity: 1 };
    const to = open ? { height: `${full}px`, opacity: 1 } : { height: "0px", opacity: 0 };
    node.style.overflow = "hidden";
    const animation = node.animate([from, to], {
      duration: open ? 240 : 180,
      easing: open ? "cubic-bezier(0.22, 1, 0.36, 1)" : "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: open ? "none" : "forwards",
    });
    animation.onfinish = () => {
      if (open) node.style.overflow = "";
      else setShown(false);
    };
  }, [open]);

  if (!shown) return null;
  return (
    <div ref={box} className="flow-root">
      <div className={className}>{children}</div>
    </div>
  );
}
