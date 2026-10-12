"use client";

import { useEffect, useState } from "react";
import { api, type Member } from "@/lib/api";
import Button from "@/ui/Button";
import KeyValue from "@/ui/KeyValue";
import SectionHeader from "@/ui/SectionHeader";
import { toast } from "@/ui/Toaster";

const field = "min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] text-slate-900 focus:border-apple focus:bg-white focus:outline-none";

export default function UsersPane({ me }: { me: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);

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
    if (!confirm(`Delete ${member.name} (${member.email})?`)) return;
    try {
      await api.removeUser(member.id);
      setError("");
      reload();
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  const copy = async () => {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.password).then(() => toast("Password copied"), () => toast("Select the password and copy it"));
  };

  return (
    <div className="space-y-6">
      <h3 className="text-[21px] font-semibold tracking-tight text-slate-900">Users</h3>
      <section>
        <SectionHeader title="Users" count={members.length} className="mb-2" />
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="px-4 py-2">
                <KeyValue label="Name">{member.name}</KeyValue>
                <KeyValue label="Email">{member.email}</KeyValue>
                <KeyValue label="Role">{member.role === "admin" ? "Admin" : "User"}</KeyValue>
              </div>
              {member.id !== me && (
                <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-4 py-2.5">
                  <Button tone="quiet" size="sm" onClick={() => remove(member)}>Delete</Button>
                </div>
              )}
            </div>
          ))}
          <div className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
            <div className="px-4 py-2">
              <KeyValue label="Name">
                <input aria-label="New user name" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} className={field} />
              </KeyValue>
              <KeyValue label="Email">
                <input type="email" aria-label="New user email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => event.key === "Enter" && add()} className={field} />
              </KeyValue>
              <KeyValue label="Role">User</KeyValue>
            </div>
            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-4 py-2.5">
              <Button tone="fill" size="sm" disabled={!email.trim()} onClick={add}>Add</Button>
            </div>
          </div>
        </div>
        {error && <p className="mt-1 text-[12px] text-red-600">{error}</p>}
        {issued && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[12px] text-slate-500">{issued.email} 의 비밀번호. 이 창을 닫으면 다시 볼 수 없습니다.</div>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-2.5 py-1 font-mono text-[13px] text-slate-900 select-all">{issued.password}</code>
              <Button size="sm" onClick={copy}>Copy</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
