"use client";

import { useState } from "react";
import { api, type Account } from "@/lib/api";
import { save } from "@/lib/storage";
import Button from "@/ui/Button";
import KeyValue from "@/ui/KeyValue";
import SectionHeader from "@/ui/SectionHeader";

const field = "min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] text-slate-900 focus:border-apple focus:bg-white focus:outline-none";

export default function AccountPane({ account }: { account: Account | null }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const signOut = async () => {
    await api.signOut().catch(() => null);
    save("workbench", { groups: [], focus: 0 });
    save("settingsOpen", false, true);
    location.reload();
  };

  const change = async () => {
    if (!current || !next) return;
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      setMessage({ ok: true, text: "비밀번호를 바꿨습니다." });
    } catch (error) {
      setMessage({ ok: false, text: (error as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-[21px] font-semibold tracking-tight text-slate-900">Account</h3>
      <section>
        <SectionHeader title="Signed in" className="mb-2" />
        <KeyValue label="Name">{account?.name || "…"}</KeyValue>
        <KeyValue label="Email">
          <span className="min-w-0 flex-1 truncate">{account?.email || "…"}</span>
          <Button tone="quiet" size="sm" onClick={signOut}>Log out</Button>
        </KeyValue>
        <KeyValue label="Role">{account?.role === "admin" ? "Admin" : "User"}</KeyValue>
      </section>
      <section>
        <SectionHeader title="Password" className="mb-2" />
        <KeyValue label="Current">
          <input type="password" autoComplete="current-password" aria-label="Current password" value={current} onChange={(event) => setCurrent(event.target.value)} className={field} />
        </KeyValue>
        <KeyValue label="New">
          <input type="password" autoComplete="new-password" aria-label="New password" placeholder="8자 이상" value={next} onChange={(event) => setNext(event.target.value)} onKeyDown={(event) => event.key === "Enter" && change()} className={field} />
          <Button tone="fill" size="sm" disabled={!current || next.length < 8} onClick={change}>Save</Button>
        </KeyValue>
        {message && <p className={message.ok ? "mt-1 text-[12px] text-slate-500" : "mt-1 text-[12px] text-red-600"}>{message.text}</p>}
      </section>
    </div>
  );
}
