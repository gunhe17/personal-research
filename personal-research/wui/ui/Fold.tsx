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
    const style = getComputedStyle(node);
    const current = { height: `${node.getBoundingClientRect().height}px`, opacity: Number(style.opacity), marginTop: style.marginTop };
    node.getAnimations().forEach((animation) => animation.cancel());
    const parent = node.parentElement ? getComputedStyle(node.parentElement) : null;
    const gap = parent && /flex|grid/.test(parent.display) ? parseFloat(parent.rowGap) || 0 : 0;
    const shut = { height: "0px", opacity: 0, marginTop: `${-gap}px` };
    const full = { height: `${node.scrollHeight}px`, opacity: 1, marginTop: "0px" };
    const from = running ? current : open ? shut : full;
    const to = open ? full : shut;
    node.style.overflow = "hidden";
    const animation = node.animate([from, to], {
      duration: open ? 240 : 180,
      easing: open ? "cubic-bezier(0.22, 1, 0.36, 1)" : "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: open ? "none" : "forwards",
    });
    const settle = () => {
      if (open) node.style.overflow = "";
      else setShown(false);
    };
    animation.finished.then(settle, () => {});
    const fallback = setTimeout(() => {
      if (node.getAnimations().length) {
        node.getAnimations().forEach((pending) => pending.cancel());
        settle();
      }
    }, 400);
    return () => clearTimeout(fallback);
  }, [open]);

  if (!shown) return null;
  return (
    <div ref={box} className="flow-root">
      <div className={className}>{children}</div>
    </div>
  );
}
