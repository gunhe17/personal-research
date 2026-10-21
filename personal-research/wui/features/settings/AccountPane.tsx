"use client";

import { useState } from "react";
import { api, type Account } from "@/lib/api";
import { save } from "@/lib/storage";
import Button from "@/ui/Button";
import KeyValue from "@/ui/KeyValue";
import SectionHeader from "@/ui/SectionHeader";
import TextInput from "@/ui/TextInput";
import SettingsPage from "./SettingsPage";

export default function AccountPane({ account }: { account: Account | null }) {
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const signOut = async () => {
    await api.signOut().catch(() => null);
    save("workbench", { groups: [], focus: 0 });
    save("settingsOpen", false, true);
    location.reload();
  };

  const change = async () => {
    if (next.length < 8) return;
    try {
      await api.changePassword(next);
      setNext("");
      setMessage({ ok: true, text: "비밀번호를 바꿨습니다." });
    } catch (error) {
      setMessage({ ok: false, text: (error as Error).message });
    }
  };

  return (
    <SettingsPage title="Profile">
      <section>
        <SectionHeader title="Profile" className="mb-2" />
        <KeyValue label="Name">{account?.name || "…"}</KeyValue>
        <KeyValue label="Email">
          <span className="min-w-0 flex-1 truncate">{account?.email || "…"}</span>
          <Button tone="quiet" size="sm" onClick={signOut}>Log out</Button>
        </KeyValue>
        <KeyValue label="Role">{account?.role === "admin" ? "Admin" : "User"}</KeyValue>
        <KeyValue label="Password">
          <TextInput
            type="password"
            autoComplete="new-password"
            aria-label="New password"
            placeholder="새 비밀번호 8자 이상"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && change()}
          />
          <Button size="sm" disabled={next.length < 8} onClick={change}>Change</Button>
        </KeyValue>
        {message && <p className={message.ok ? "enter-fade mt-1 text-[12px] text-slate-500" : "enter-fade mt-1 text-[12px] text-red-600"}>{message.text}</p>}
      </section>
    </SettingsPage>
  );
}
