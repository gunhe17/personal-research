"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api, type DeletedMember, type Trash } from "@/lib/api";
import { emit } from "@/lib/events";
import { since } from "@/lib/time";
import Button from "@/ui/Button";
import SectionHeader from "@/ui/SectionHeader";
import SettingsPage from "./SettingsPage";

export default function TrashPane({ admin }: { admin: boolean }) {
  const [trash, setTrash] = useState<Trash | null>(null);
  const [members, setMembers] = useState<DeletedMember[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.trash().then(setTrash, (failure) => setError(failure.message));
    if (admin) api.deletedUsers().then((data) => setMembers(data.items), (failure) => setError(failure.message));
  }, [admin]);

  const run = async (restore: () => Promise<unknown>, after: () => void) => {
    try {
      await restore();
      setError("");
      after();
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  const spaces = trash?.spaces || [];
  const conversations = trash?.conversations || [];
  const empty = trash !== null && !spaces.length && !conversations.length && !members.length;

  return (
    <SettingsPage title="Trash">
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      {empty && <p className="text-[13px] text-slate-500">휴지통이 비어 있습니다.</p>}
      {spaces.length > 0 && (
        <Section title="Spaces" count={spaces.length}>
          {spaces.map((space) => (
            <Row
              key={space.id}
              title={space.title}
              meta={[counted(space.conversation_count, "conversation"), counted(space.material_count, "material"), since(space.deleted_at)]}
              onRestore={() =>
                run(
                  () => api.restoreSpace(space.id),
                  () => {
                    setTrash((all) => all && { ...all, spaces: all.spaces.filter((s) => s.id !== space.id) });
                    api.trash().then(setTrash, () => {});
                    emit("spaces");
                  },
                )
              }
            />
          ))}
        </Section>
      )}
      {conversations.length > 0 && (
        <Section title="Conversations" count={conversations.length}>
          {conversations.map((conversation) => (
            <Row
              key={`${conversation.domain}:${conversation.id}`}
              title={conversation.title}
              meta={[conversation.domain === "agent" ? "Agent" : conversation.space_title, since(conversation.deleted_at)]}
              onRestore={() =>
                run(
                  () => api.restoreConversation(conversation.domain, conversation.id),
                  () => {
                    setTrash((all) => all && { ...all, conversations: all.conversations.filter((c) => c.id !== conversation.id) });
                    emit(conversation.domain === "agent" ? "agents" : "spaces");
                  },
                )
              }
            />
          ))}
        </Section>
      )}
      {members.length > 0 && (
        <Section title="Users" count={members.length}>
          {members.map((member) => (
            <Row
              key={member.id}
              title={member.name}
              meta={[member.email, since(member.deleted_at)]}
              onRestore={() => run(() => api.restoreUser(member.id), () => setMembers((all) => all.filter((m) => m.id !== member.id)))}
            />
          ))}
        </Section>
      )}
    </SettingsPage>
  );
}

function counted(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <SectionHeader title={title} count={count} className="mb-2" />
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">{children}</div>
    </section>
  );
}

function Row({ title, meta, onRestore }: { title: string; meta: string[]; onRestore: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-slate-800">{title}</div>
        <div className="truncate text-[12px] text-slate-500">{meta.filter(Boolean).join(" · ")}</div>
      </div>
      <Button tone="line" size="sm" onClick={onRestore}>Restore</Button>
    </div>
  );
}
