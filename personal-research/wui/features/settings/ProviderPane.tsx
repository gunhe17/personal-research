"use client";

import { useState } from "react";
import type { Login, Method, Provider } from "@/lib/api";
import Button from "@/ui/Button";
import Dot from "@/ui/Dot";
import FoldList from "@/ui/FoldList";
import usePresence from "@/ui/usePresence";
import { cx } from "@/lib/cx";
import SectionHeader from "@/ui/SectionHeader";
import Skeleton from "@/ui/Skeleton";
import MethodRow, { plan, usable } from "./MethodRow";
import SettingsPage from "./SettingsPage";

type Props = {
  provider: Provider;
  statuses: Record<string, Login | undefined>;
  error: string;
  onSave: (values: Record<string, unknown>) => Promise<Provider | null>;
  onLogin: (method: Method) => void;
  onLogout: (method: Method) => void;
};

export default function ProviderPane({ provider, statuses, error, onSave, onLogin, onLogout }: Props) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const save = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      return await onSave(values);
    } finally {
      setSaving(false);
    }
  };
  const order = provider.methods.map((m) => m.id).join(" ");
  const [seen, setSeen] = useState({ order, moves: {} as Record<string, number> });
  if (seen.order !== order) {
    const before = seen.order.split(" ");
    const kept = before.filter((id) => provider.methods.some((m) => m.id === id));
    const now = provider.methods.map((m) => m.id).filter((id) => kept.includes(id));
    const moves = { ...seen.moves };
    now.forEach((id, at) => {
      if (kept[at] !== id) moves[id] = (moves[id] || 0) + 1;
    });
    setSeen({ order, moves });
  }
  const failure = usePresence(Boolean(error), error);
  const status = (method: Method) => statuses[method.id];
  const first = provider.methods.find((m) => usable(m, status(m)));
  const checking = provider.methods.some((m) => m.enabled && plan(m) && !status(m));
  const enabled = provider.methods.filter((m) => m.enabled);

  const add = async (type: "plan_key" | "api_key") => {
    const before = new Set(provider.methods.map((m) => m.id));
    const added = (await save({ add: type }))?.methods.find((m) => !before.has(m.id));
    if (added) setOpen((current) => new Set([...current, added.id]));
  };

  const shift = (method: Method, by: number) => {
    const order = provider.methods.map((m) => m.id);
    const at = order.indexOf(method.id);
    [order[at], order[at + by]] = [order[at + by], order[at]];
    save({ order });
  };

  const toggle = (id: string) => setOpen((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <SettingsPage
      title={provider.label}
      status={
        <>
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
            {!first && checking ? (
              <>
                <Skeleton className="h-1.5 w-1.5 rounded-full" />
                <Skeleton className="w-16" />
              </>
            ) : (
              <>
                <Dot on={Boolean(first)} />
                <span key={first ? "ready" : "idle"} className="enter-fade">{first ? "Ready" : "Not ready"}</span>
              </>
            )}
          </div>
          {failure.mounted && <p className={cx("mt-2 text-[12px] text-red-600", failure.leaving ? "exit-fade" : "enter-fade")}>{failure.content}</p>}
        </>
      }
    >
      <section>
        <SectionHeader title="Order" className="mb-2">
          <Button onClick={() => add("plan_key")}>+ Plan login</Button>
          <Button onClick={() => add("api_key")}>+ API key</Button>
        </SectionHeader>
        <div className="flex flex-col gap-0.5">
          <FoldList items={provider.methods} keyOf={(m) => m.id}>
            {(method) => {
              const i = provider.methods.indexOf(method);
              const blocked = (to: number) => i < 0 || to < 0 || to >= provider.methods.length || provider.methods[to].enabled !== method.enabled;
              return (
                <MethodRow
                  key={seen.moves[method.id] || 0}
                  moved={Boolean(seen.moves[method.id])}
                  provider={provider}
                  method={method}
                  status={status(method)}
                  rank={enabled.indexOf(method) + 1}
                  first={method === first}
                  expanded={open.has(method.id)}
                  saving={saving}
                  canMoveUp={!blocked(i - 1)}
                  canMoveDown={!blocked(i + 1)}
                  onToggle={() => toggle(method.id)}
                  onShift={(by) => shift(method, by)}
                  onSave={save}
                  onLogin={() => onLogin(method)}
                  onLogout={() => onLogout(method)}
                />
              );
            }}
          </FoldList>
        </div>
      </section>
    </SettingsPage>
  );
}
