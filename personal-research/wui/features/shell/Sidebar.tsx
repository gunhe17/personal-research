"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { emit } from "@/lib/events";
import { load, save } from "@/lib/storage";
import TreeRow from "@/ui/TreeRow";
import AgentSection from "./AgentSection";
import CollectedSection from "./CollectedSection";
import SpaceSection from "./SpaceSection";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => load("spaceExpanded", {}));

  const isOpen = (key: string, fallback = true) => expanded[key] ?? fallback;
  const remember = (next: Record<string, boolean>) => {
    setExpanded(next);
    save("spaceExpanded", next);
  };
  const toggle = (key: string, fallback = true) => remember({ ...expanded, [key]: !isOpen(key, fallback) });
  const close = (keys: string[]) => remember({ ...expanded, ...Object.fromEntries(keys.map((key) => [key, false])) });
  const reveal = (key: string) => remember({ ...expanded, [key]: true });

  return (
    <nav className="flex flex-col gap-1 px-2 pt-2 pb-2">
      <TreeRow
        variant="nav"
        label="Home"
        icon="home"
        active={pathname === "/"}
        onClick={() => {
          router.push("/");
          emit("sidebar");
        }}
      />
      <AgentSection open={isOpen("agents")} onToggle={() => toggle("agents")} />
      <CollectedSection expanded={expanded} isOpen={isOpen} onToggle={toggle} onClose={close} />
      <SpaceSection isOpen={isOpen} onToggle={toggle} onClose={close} onReveal={reveal} />
    </nav>
  );
}
