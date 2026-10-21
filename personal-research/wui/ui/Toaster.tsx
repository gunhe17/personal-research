"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import usePresence from "./usePresence";

export function toast(message: string): void {
  window.dispatchEvent(new CustomEvent("research:toast", { detail: message }));
}

export default function Toaster() {
  const [message, setMessage] = useState("");
  const [shown, setShown] = useState(false);
  const presence = usePresence(shown, message);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const show = (event: Event) => {
      setMessage((event as CustomEvent<string>).detail);
      setShown(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShown(false), 2000);
    };
    window.addEventListener("research:toast", show);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("research:toast", show);
    };
  }, []);

  if (!presence.mounted) return null;
  return (
    <div
      key={presence.leaving ? "leaving" : message}
      role="status"
      className={cx("pointer-events-none fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm text-slate-800 ring-1 ring-slate-200", presence.leaving ? "exit-fade" : "enter-rise")}
    >
      {presence.content}
    </div>
  );
}
