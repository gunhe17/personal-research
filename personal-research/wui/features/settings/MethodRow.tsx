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
import Switch from "@/ui/Switch";

type Props = {
  provider: Provider;
  method: Method;
  status?: Login;
  rank: number;
  first: boolean;
  expanded: boolean;
  saving: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: () => void;
  onShift: (by: number) => void;
  onSave: (values: Record<string, unknown>) => Promise<Provider | null>;
  onLogin: () => void;
  onLogout: () => void;
};

export const plan = (method: Method) => method.type === "plan_key";

export function usable(method: Method, status?: Login): boolean {
  if (!method.enabled) return false;
  return plan(method) ? Boolean(status?.logged_in) : Boolean(method.secret);
}

export default function MethodRow({ provider, method, status, rank, first, expanded, saving, canMoveUp, canMoveDown, onToggle, onShift, onSave, onLogin, onLogout }: Props) {
  return (
    <div>
      <div className="group flex items-center gap-1.5 rounded-lg py-1.5 pr-1.5 pl-1 text-sm transition duration-150 hover:bg-slate-50">
        <button type="button" aria-expanded={expanded} onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          <Chevron open={expanded} />
          <Icon name={plan(method) ? "person" : "key"} className={cx("h-3.5 w-3.5", method.enabled ? "text-slate-500" : "text-slate-300")} />
          <span className={cx("w-4 shrink-0 text-center text-[11px] font-semibold", first ? "text-apple" : "text-slate-400")}>
            {method.enabled ? rank : "–"}
          </span>
          <span className={cx("flex w-[6.25rem] shrink-0 items-center gap-2", method.enabled ? "text-slate-800" : "text-slate-400")}>
            <Dot on={usable(method, status)} />
            <span className="truncate">{method.label}</span>
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] text-slate-400">
            {method.enabled && plan(method) && !status ? "…" : usable(method, status) ? "On" : "Off"}
          </span>
        </button>
        <span className="flex shrink-0 items-center text-slate-400 opacity-60 transition group-hover:opacity-100">
          <Arrow label="Move up" path="M4 10l4-4 4 4" disabled={saving || !canMoveUp} onClick={() => onShift(-1)} />
          <Arrow label="Move down" path="M4 6l4 4 4-4" disabled={saving || !canMoveDown} onClick={() => onShift(1)} />
        </span>
        <Switch checked={method.enabled} label="Use this method" disabled={saving} onChange={() => onSave({ enabled: { [method.id]: !method.enabled } })} />
      </div>
      <Fold open={expanded} className="ml-3 border-l border-slate-100 pl-5">
        <div className="pt-0.5 pb-2">
          {plan(method) ? (
            <PlanDetail method={method} status={status} cli={provider.cli} onLogin={onLogin} onLogout={onLogout} />
          ) : (
            <KeyDetail method={method} label={provider.label} onSave={onSave} />
          )}
          <Usage method={method} />
          {!plan(method) && removable(provider, method) && (
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
        {status?.logged_in && <Button tone="quiet" size="sm" onClick={() => confirm(`Log out and remove ${method.label}?`) && onLogout()}>Log out</Button>}
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
