import type { ComponentProps, ReactNode } from "react";
import PaneBar from "./PaneBar";

export default function Pane({ children, ...bar }: ComponentProps<typeof PaneBar> & { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <PaneBar {...bar} />
      {children}
    </div>
  );
}
