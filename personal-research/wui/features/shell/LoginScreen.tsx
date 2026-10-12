"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import Button from "@/ui/Button";
import TextInput from "@/ui/TextInput";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError("");
    try {
      await api.signIn(email.trim(), password);
      location.reload();
    } catch (failure) {
      setError((failure as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="flex h-full items-center justify-center bg-slate-50 px-6">
      <form onSubmit={submit} className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-[28px] font-semibold tracking-tight text-slate-900">Personal Research</h1>
        <div className="space-y-2">
          <TextInput size="lg" autoFocus type="email" autoComplete="username" aria-label="Email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextInput size="lg" type="password" autoComplete="current-password" aria-label="Password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
        <Button tone="fill" size="lg" type="submit" disabled={busy} className="mt-5 w-full">{busy ? "Logging in…" : "Log in"}</Button>
      </form>
    </main>
  );
}
