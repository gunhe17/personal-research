"use client";

import { useEffect, useState } from "react";
import { api, type Member } from "@/lib/api";
import { cx } from "@/lib/cx";
import Button from "@/ui/Button";
import IconButton from "@/ui/IconButton";
import KeyValue from "@/ui/KeyValue";
import Popup from "@/ui/Popup";
import SectionHeader from "@/ui/SectionHeader";
import Skeleton from "@/ui/Skeleton";
import TextInput from "@/ui/TextInput";
import FoldList from "@/ui/FoldList";
import usePresence from "@/ui/usePresence";
import SettingsPage from "./SettingsPage";

export default function UsersPane({ me }: { me: string }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const [doomed, setDoomed] = useState<Member | null>(null);
  const failure = usePresence(Boolean(error), error);

  const reload = () => api.users().then((data) => setMembers(data.items), (failure) => setError(failure.message));
  useEffect(() => {
    reload();
  }, []);

  const add = async () => {
    if (!email.trim()) return;
    try {
      const created = await api.addUser(name.trim(), email.trim());
      setIssued({ email: created.email, password: created.password });
      setName("");
      setEmail("");
      setError("");
      reload();
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  const remove = async (member: Member) => {
    setDoomed(null);
    try {
      await api.removeUser(member.id);
      setError("");
      reload();
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  return (
    <SettingsPage title="Users">
      <section>
        <SectionHeader title="Users" count={members?.length} className="mb-2" />
        <div className="flex flex-col gap-3">
          {!members && !error && [0, 1].map((index) => (
            <div key={index} className="overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-2">
              {["w-20", "w-40", "w-10"].map((width) => (
                <div key={width} className="flex min-h-8 items-center gap-3 py-1 max-sm:flex-col max-sm:items-stretch max-sm:gap-1">
                  <span className="w-24 shrink-0 py-0.5"><Skeleton className="w-12" /></span>
                  <Skeleton className={`max-w-full ${width}`} />
                </div>
              ))}
            </div>
          ))}
          <FoldList items={members} keyOf={(member) => member.id}>
            {(member) => (
            <div className="enter-fade overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="px-4 py-2">
                <KeyValue label="Name">{member.name}</KeyValue>
                <KeyValue label="Email">{member.email}</KeyValue>
                <KeyValue label="Role">{member.role === "admin" ? "Admin" : "User"}</KeyValue>
              </div>
              {member.id !== me && (
                <div className="flex justify-end px-4 pb-3">
                  <Button tone="quiet" size="sm" onClick={() => setDoomed(member)}>Delete</Button>
                </div>
              )}
            </div>
            )}
          </FoldList>
          <div className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
            <div className="px-4 py-2">
              <KeyValue label="Name">
                <TextInput aria-label="New user name" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
              </KeyValue>
              <KeyValue label="Email">
                <TextInput type="email" aria-label="New user email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => event.key === "Enter" && add()} />
              </KeyValue>
              <KeyValue label="Role">User</KeyValue>
            </div>
            <div className="flex justify-end px-4 pb-3">
              <Button tone="fill" size="sm" disabled={!email.trim()} onClick={add}>Add</Button>
            </div>
          </div>
        </div>
        {failure.mounted && <p className={cx("mt-1 text-[12px] text-red-600", failure.leaving ? "exit-fade" : "enter-fade")}>{failure.content}</p>}
      </section>
      <Issued open={Boolean(issued)} email={issued?.email || ""} password={issued?.password || ""} onClose={() => setIssued(null)} />
      <Popup
        open={Boolean(doomed)}
        label="Delete user"
        title="Delete user"
        onClose={() => setDoomed(null)}
        actions={
          <>
            <Button tone="quiet" size="sm" onClick={() => setDoomed(null)}>Cancel</Button>
            <Button tone="fill" size="sm" onClick={() => doomed && remove(doomed)}>Delete</Button>
          </>
        }
      >
        {doomed?.name} ({doomed?.email}) 를 지웁니다. 이 사람의 로그인과 저장된 요금제·API 키도 함께 지워집니다.
      </Popup>
    </SettingsPage>
  );
}

function Issued({ open, email, password, onClose }: { open: boolean; email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState<"copy" | "check" | "close">("copy");

  useEffect(() => {
    if (copied === "copy") return;
    const timer = setTimeout(() => setCopied("copy"), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => navigator.clipboard.writeText(password).then(() => setCopied("check"), () => setCopied("close"));
  return (
    <Popup open={open} label="Issued password" title="Password issued" onClose={onClose} actions={<Button tone="fill" size="sm" onClick={onClose}>Done</Button>}>
      {email} 의 비밀번호입니다. 이 창을 닫으면 다시 볼 수 없습니다.
      <div className="mt-4 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[14px] text-slate-900 select-all">{password}</code>
        <IconButton
          icon={copied}
          label={copied === "check" ? "Copied" : copied === "close" ? "Copy failed" : "Copy password"}
          className={copied === "check" ? "text-ok" : copied === "close" ? "text-red-500" : ""}
          onClick={copy}
        />
      </div>
    </Popup>
  );
}
