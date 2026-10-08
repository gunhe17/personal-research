"use client";

import { useState } from "react";
import type { Login, Method, Provider } from "@/lib/api";
import { cx } from "@/lib/cx";
import { since } from "@/lib/time";
import Button from "@/ui/Button";
import Chevron from "@/ui/Chevron";
import Dot from "@/ui/Dot";
import Fold from "@/ui/Fold";
import Icon from "@/ui/Icon";
import KeyValue from "@/ui/KeyValue";
import SectionHeader from "@/ui/SectionHeader";
import Switch from "@/ui/Switch";

type Props = {
  provider: Provider;
  statuses: Record<string, Login | undefined>;
  error: string;
  onSave: (values: Record<string, unknown>) => Promise<Provider | null>;
  onLogin: (method: Method) => void;
  onLogout: (method: Method) => void;
};

const plan = (method: Method) => method.type === "plan_key";

export function usable(method: Method, status?: Login): boolean {
  if (!method.enabled) return false;
  return plan(method) ? Boolean(status?.logged_in) : Boolean(method.secret);
}

export default function ProviderPane({ provider, statuses, error, onSave: persist, onLogin, onLogout }: Props) {
  const [open, setOpen] = useState<Set<string>>(() => new Set([provider.methods[0]?.id]));
  const [saving, setSaving] = useState(false);
  const onSave = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      return await persist(values);
    } finally {
      setSaving(false);
    }
  };
  const status = (method: Method) => statuses[method.id];
  const first = provider.methods.find((m) => usable(m, status(m)));
  const checking = provider.methods.some((m) => m.enabled && plan(m) && !status(m));
  const enabled = provider.methods.filter((m) => m.enabled);

  const add = async (type: "plan_key" | "api_key") => {
    const before = new Set(provider.methods.map((m) => m.id));
    const added = (await onSave({ add: type }))?.methods.find((m) => !before.has(m.id));
    if (added) setOpen((current) => new Set([...current, added.id]));
  };

  const shift = (method: Method, by: number) => {
    const order = provider.methods.map((m) => m.id);
    const at = order.indexOf(method.id);
    [order[at], order[at + by]] = [order[at + by], order[at]];
    onSave({ order });
  };

  const toggle = (id: string) => setOpen((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[21px] font-semibold tracking-tight text-slate-900">{provider.label}</h3>
        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
          <Dot on={Boolean(first)} />
          <span>{!first && checking ? "Checking…" : first ? `Ready · ${first.label} first` : "Not ready"}</span>
        </div>
        {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
      </div>
      <section>
        <SectionHeader title="Order" className="mb-2">
          <Button onClick={() => add("plan_key")}>+ Plan login</Button>
          <Button onClick={() => add("api_key")}>+ API key</Button>
        </SectionHeader>
        <div className="space-y-0.5">
          {provider.methods.map((method, i) => {
            const blocked = (to: number) => to < 0 || to >= provider.methods.length || provider.methods[to].enabled !== method.enabled;
            const expanded = open.has(method.id);
            return (
              <div key={method.id}>
                <div className="group flex items-center gap-1.5 rounded-lg py-1.5 pr-1.5 pl-1 text-sm transition duration-150 hover:bg-slate-50">
                  <button type="button" aria-expanded={expanded} onClick={() => toggle(method.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                    <Chevron open={expanded} />
                    <Icon name={plan(method) ? "person" : "key"} className={cx("h-3.5 w-3.5", method.enabled ? "text-slate-500" : "text-slate-300")} />
                    <span className={cx("w-4 shrink-0 text-center text-[11px] font-semibold", method === first ? "text-apple" : "text-slate-400")}>
                      {method.enabled ? enabled.indexOf(method) + 1 : "–"}
                    </span>
                    <span className={cx("flex w-[6.25rem] shrink-0 items-center gap-2", method.enabled ? "text-slate-800" : "text-slate-400")}>
                      <Dot on={usable(method, status(method))} />
                      <span className="truncate">{method.label}</span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-slate-400">
                      {method.enabled && plan(method) && !status(method) ? "…" : usable(method, status(method)) ? "On" : "Off"}
                    </span>
                  </button>
                  <span className="flex shrink-0 items-center text-slate-400 opacity-60 transition group-hover:opacity-100">
                    <Arrow label="Move up" path="M4 10l4-4 4 4" disabled={saving || blocked(i - 1)} onClick={() => shift(method, -1)} />
                    <Arrow label="Move down" path="M4 6l4 4 4-4" disabled={saving || blocked(i + 1)} onClick={() => shift(method, 1)} />
                  </span>
                  <Switch checked={method.enabled} label="Use this method" disabled={saving} onChange={() => onSave({ enabled: { [method.id]: !method.enabled } })} />
                </div>
                <Fold open={expanded} className="ml-3 border-l border-slate-100 pl-5">
                  <div className="pt-0.5 pb-2">
                    {plan(method) ? (
                      <PlanDetail method={method} status={status(method)} cli={provider.cli} onLogin={() => onLogin(method)} onLogout={() => onLogout(method)} />
                    ) : (
                      <KeyDetail method={method} label={provider.label} onSave={onSave} />
                    )}
                    <Usage method={method} />
                    {removable(provider, method) && (
                      <KeyValue label="">
                        <button type="button" className="text-[12px] text-slate-500 hover:text-red-600" onClick={() => confirm(`Remove ${method.label}?`) && onSave({ remove: method.id })}>
                          Remove {method.label}
                        </button>
                      </KeyValue>
                    )}
                  </div>
                </Fold>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function removable(provider: Provider, method: Method): boolean {
  const same = provider.methods.filter((m) => m.type === method.type).length;
  return provider.methods.length > 1 && (same > 1 || !["plan_key", "api_key"].includes(method.id));
}

function Arrow({ label, path, disabled, onClick }: { label: string; path: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex h-6 w-5 items-center justify-center hover:text-slate-800 disabled:opacity-25">
      <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function PlanDetail({ method, status, cli, onLogin, onLogout }: { method: Method; status?: Login; cli: string; onLogin: () => void; onLogout: () => void }) {
  return (
    <>
      <KeyValue label="Account">
        <span className={cx("min-w-0 flex-1 truncate", !status?.logged_in && "text-slate-400")}>
          {status?.logged_in ? status.detail || "Logged in" : status?.pending ? "Logging in…" : "Logged out"}
        </span>
        <Button tone={status?.logged_in && !status.pending ? "line" : "fill"} size="sm" onClick={onLogin}>
          {status?.pending ? "Continue" : status?.logged_in ? "Log in again" : "Log in"}
        </Button>
        {status?.logged_in && <Button tone="quiet" size="sm" onClick={() => confirm(`Log ${method.label} out on this server?`) && onLogout()}>Log out</Button>}
      </KeyValue>
      <KeyValue label="Logs in with">{cli}</KeyValue>
    </>
  );
}

function KeyDetail({ method, label, onSave }: { method: Method; label: string; onSave: (values: Record<string, unknown>) => Promise<Provider | null> }) {
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState("");
  const store = async () => {
    if (!key.trim()) return;
    if (await onSave({ keys: { [method.id]: key.trim() } })) {
      setKey("");
      setEditing(false);
    }
  };
  return (
    <>
      <KeyValue label="Key">
        {!method.secret || editing ? (
          <>
            <input
              type="password"
              autoFocus={editing}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && store()}
              autoComplete="off"
              spellCheck={false}
              placeholder={method.secret ? "New key" : `${label} API key`}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-apple focus:bg-white focus:outline-none"
            />
            <Button tone="fill" size="sm" onClick={store}>Save</Button>
            {method.secret && <Button tone="quiet" size="sm" onClick={() => setEditing(false)}>Cancel</Button>}
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate">
              {method.secret} <span className="text-slate-400">· saved {new Date(method.saved).toLocaleDateString()}</span>
            </span>
            <Button tone="line" size="sm" onClick={() => setEditing(true)}>Replace</Button>
            <Button tone="quiet" size="sm" onClick={() => confirm(`Remove the saved ${method.label}?`) && onSave({ keys: { [method.id]: null } })}>Remove</Button>
          </>
        )}
      </KeyValue>
      <KeyValue label="Billing">Per request on the provider account</KeyValue>
    </>
  );
}

function Usage({ method }: { method: Method }) {
  return <KeyValue label="Usage">{method.usage.last ? `${method.usage.month} this month · last ${since(method.usage.last)}` : "Not used yet"}</KeyValue>;
}
