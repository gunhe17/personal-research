"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api, type DeletedMember, type Trash } from "@/lib/api";
import { emit } from "@/lib/events";
import { since } from "@/lib/time";
import { cx } from "@/lib/cx";
import Button from "@/ui/Button";
import Fold from "@/ui/Fold";
import FoldList from "@/ui/FoldList";
import usePresence from "@/ui/usePresence";
import SectionHeader from "@/ui/SectionHeader";
import Skeleton from "@/ui/Skeleton";
import SettingsPage from "./SettingsPage";

export default function TrashPane({ admin }: { admin: boolean }) {
  const [trash, setTrash] = useState<Trash | null>(null);
  const [members, setMembers] = useState<DeletedMember[] | null>(admin ? null : []);
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
  const deleted = members || [];
  const loading = !error && (trash === null || members === null);
  const failure = usePresence(Boolean(error), error);
  const empty = !loading && trash !== null && !spaces.length && !conversations.length && !deleted.length;

  return (
    <SettingsPage title="Trash">
      {failure.mounted && <p className={cx("text-[12px] text-red-600", failure.leaving ? "exit-fade" : "enter-fade")}>{failure.content}</p>}
      {loading && (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {["w-2/5", "w-1/2", "w-1/3"].map((width) => (
            <div key={width} className="flex items-center gap-3 px-4 py-2.5">
              <Skeleton lines={[width, "w-3/5"]} className="min-w-0 flex-1 gap-2 py-0.5" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      )}
      {empty && <p className="enter-fade text-[13px] text-slate-500">휴지통이 비어 있습니다.</p>}
      {!loading && (
        <Section title="Spaces" count={spaces.length}>
          <FoldList items={trash && trash.spaces} keyOf={(space) => space.id}>
            {(space) => (
              <Row
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
            )}
          </FoldList>
        </Section>
      )}
      {!loading && (
        <Section title="Conversations" count={conversations.length}>
          <FoldList items={trash && trash.conversations} keyOf={(conversation) => `${conversation.domain}:${conversation.id}`}>
            {(conversation) => (
              <Row
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
            )}
          </FoldList>
        </Section>
      )}
      {!loading && (
        <Section title="Users" count={deleted.length}>
          <FoldList items={members} keyOf={(member) => member.id}>
            {(member) => (
              <Row
                title={member.name}
                meta={[member.email, since(member.deleted_at)]}
                onRestore={() => run(() => api.restoreUser(member.id), () => setMembers((all) => all && all.filter((m) => m.id !== member.id)))}
              />
            )}
          </FoldList>
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
    <Fold open={count > 0}>
      <section className="enter-fade">
        <SectionHeader title={title} count={count} className="mb-2" />
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">{children}</div>
      </section>
    </Fold>
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
