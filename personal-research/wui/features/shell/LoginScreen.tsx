"use client";

import { useState, type FormEvent } from "react";
import { cx } from "@/lib/cx";
import { api } from "@/lib/api";
import Button from "@/ui/Button";
import TextInput from "@/ui/TextInput";
import { EXIT } from "@/ui/usePresence";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError("");
    try {
      await api.signIn(email.trim(), password);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return location.reload();
      setDone(true);
      setTimeout(() => location.reload(), EXIT);
    } catch (failure) {
      setError((failure as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className={cx("flex h-full items-center justify-center bg-slate-50 px-6", done && "exit-veil")}>
      <form onSubmit={submit} className={cx("w-full max-w-sm", done ? "exit-rise" : "enter-rise")}>
        <h1 className="mb-8 text-center text-[21px] font-semibold tracking-tight text-slate-900">Personal Research</h1>
        <div className="space-y-2">
          <TextInput size="lg" autoFocus required type="email" autoComplete="username" aria-label="Email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextInput size="lg" required type="password" autoComplete="current-password" aria-label="Password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        {error && <p className="enter-fade mt-3 text-[13px] text-red-600">{error}</p>}
        <Button tone="fill" size="lg" type="submit" disabled={busy} className="mt-5 w-full">{busy ? "Logging in…" : "Log in"}</Button>
      </form>
    </main>
  );
}
