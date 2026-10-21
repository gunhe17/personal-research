"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Login } from "@/lib/api";
import { cx } from "@/lib/cx";
import Button from "@/ui/Button";
import Skeleton from "@/ui/Skeleton";
import TextInput from "@/ui/TextInput";
import { toast } from "@/ui/Toaster";
import useEscape from "@/ui/useEscape";
import usePresence from "@/ui/usePresence";

type Target = { provider: string; method: string; title: string; initial?: Login };
type Props = Target & { leaving: boolean; onClose: (cancelled: boolean) => void };

export default function LoginSheet({ target, onClose }: { target: Target | null; onClose: (cancelled: boolean) => void }) {
  const presence = usePresence(Boolean(target), target);
  if (!presence.mounted || !presence.content) return null;
  const { provider, method } = presence.content;
  return <Sheet key={`${provider}/${method}`} {...presence.content} leaving={presence.leaving} onClose={onClose} />;
}

function Sheet({ provider, method, title, initial, leaving, onClose }: Props) {
  const [resumed] = useState(Boolean(initial?.pending));
  const [login, setLogin] = useState<Login | null>(resumed ? initial || null : null);
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const live = useRef(true);

  const finish = useCallback((data: Login) => {
    if (data.logged_in && !data.pending) setTimeout(() => live.current && onClose(false), 1200);
  }, [onClose]);

  useEffect(() => {
    live.current = true;
    if (!resumed) {
      api.startLogin(provider, method).then((data) => {
        if (!live.current) return;
        setLogin(data);
        setMessage("");
      }, (error) => live.current && setMessage(error.message));
    }
    return () => {
      live.current = false;
    };
  }, [provider, method, resumed]);

  useEffect(() => {
    if (!login?.pending || login.pending.needs_code) return;
    const timer = setTimeout(() => {
      api.loginStatus(provider, method).then((data) => {
        if (!live.current) return;
        setLogin(data);
        if (!data.pending && !data.logged_in) setMessage("Login ended without approval. Try again.");
        finish(data);
      }, () => live.current && setLogin((current) => current && { ...current }));
    }, 2000);
    return () => clearTimeout(timer);
  }, [login, provider, method, finish]);

  const cancel = useCallback(() => onClose(true), [onClose]);
  useEscape(cancel, { capture: true, when: !leaving });

  const submit = async () => {
    if (!code.trim() || checking) return;
    setChecking(true);
    setMessage("Checking the code…");
    try {
      const data = await api.submitLogin(provider, method, code.trim());
      setLogin(data);
      setMessage("");
      finish(data);
    } catch (error) {
      setMessage((error as Error).message);
    }
    setChecking(false);
  };

  const pending = login?.pending;
  const starting = !login && !message;
  const done = Boolean(login?.logged_in && !pending && !message);
  const step = (n: number) => (
    <span className={cx("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px]", done || (pending && n < 3) ? "bg-apple text-white" : "border border-slate-200 text-slate-400")}>
      {done ? "✓" : n}
    </span>
  );

  return (
    <div className={cx("absolute inset-0 z-10 flex items-start justify-center bg-white/60 p-6 pt-16 backdrop-blur-[2px]", leaving ? "exit-veil" : "enter-fade")}>
      <div className={cx("w-full max-w-sm overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200", leaving ? "exit-rise" : "enter-rise")}>
        <div className="flex items-center border-b border-slate-100 px-5 py-4">
          <h3 className="flex-1 text-sm font-semibold text-slate-900">{title}</h3>
          <Button tone="quiet" size="sm" onClick={() => onClose(true)}>Cancel</Button>
        </div>
        <ol className="space-y-5 p-5 text-[13px] text-slate-800">
          <li className="flex gap-3">
            {step(1)}
            <div className="min-w-0">
              <div className="font-medium">Open the login page</div>
              {starting && <Skeleton className="mt-2 w-48" label="Starting login" />}
              {pending?.url && (
                <a href={pending.url} target="_blank" rel="noopener noreferrer" className="enter-fade mt-1 inline-block max-w-full truncate text-apple-link hover:underline">
                  {pending.url.replace(/^https:\/\//, "").slice(0, 48)}{pending.url.length > 56 ? "…" : ""} ↗
                </a>
              )}
            </div>
          </li>
          <li className="flex gap-3">
            {step(2)}
            <div className="min-w-0 flex-1">
              <div className="font-medium">{pending?.needs_code ? "Paste the code shown after login" : "Enter this code"}</div>
              {starting && <Skeleton className="mt-2 h-11 w-40 rounded-lg" label="Starting login" />}
              {pending?.code && (
                <div className="enter-fade mt-2 flex items-center gap-2">
                  <span className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-[21px] font-semibold tracking-[0.12em] text-slate-900 select-all">{pending.code}</span>
                  <Button tone="quiet" size="sm" onClick={() => navigator.clipboard?.writeText(pending.code).then(() => toast("Code copied"))}>Copy</Button>
                </div>
              )}
              {pending?.needs_code && (
                <div className="mt-2 flex gap-2">
                  <TextInput
                    size="md"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && submit()}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Paste the code"
                  />
                  <Button tone="fill" size="sm" disabled={checking} onClick={submit}>Submit</Button>
                </div>
              )}
            </div>
          </li>
          <li className="flex gap-3">
            {step(3)}
            <div>
              {starting ? (
                <Skeleton className="mt-1 w-32" label="Starting login" />
              ) : (
                <div key={done ? "done" : message} className={cx("enter-fade font-medium", !done && "text-slate-400")}>{done ? "Logged in" : message || (pending?.needs_code ? "Waiting for the code…" : "Waiting for approval…")}</div>
              )}
              <div className="mt-1 text-[12px] text-slate-400">{pending?.error || (done ? login?.detail : pending && !pending.needs_code ? "This closes by itself when you approve." : "")}</div>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
