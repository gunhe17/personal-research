"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type Material, type Rich, type Space } from "@/lib/api";
import { emit } from "@/lib/events";
import { chatHtml } from "@/lib/markdown";
import { since } from "@/lib/time";
import Button from "@/ui/Button";
import SectionHeader from "@/ui/SectionHeader";
import { toast } from "@/ui/Toaster";
import Blocks from "@/features/blocks/Blocks";

const KIND: Record<string, string> = { lesson: "수업", note: "노트", log: "기록" };
const ROW = "flex w-full items-baseline justify-between gap-4 px-2 py-3.5 text-left transition hover:bg-white";

export default function SpaceDetail({ space, onChanged }: { space: Space; onChanged: () => void }) {
  const [saved, setSaved] = useState("");
  const [editing, setEditing] = useState<Material | "new" | null>(null);
  const chat = (extra: string) => `/collected?space=${encodeURIComponent(space.id)}${extra}`;

  const save = async (values: { title?: string; purpose?: string }) => {
    try {
      await api.editSpace(space.id, values);
      setSaved("저장됨");
      if (values.title) emit("spaces");
    } catch {
      setSaved("저장하지 못했습니다");
    }
  };

  return (
    <>
      <Link href="/space" className="text-[13px] text-apple-link hover:underline">← Space</Link>
      <input
        defaultValue={space.title}
        aria-label="Space 이름"
        onBlur={(event) => event.target.value.trim() && event.target.value.trim() !== space.title && save({ title: event.target.value.trim() })}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        className="-mx-1 mt-3 w-full rounded-xl bg-transparent px-1 text-[40px] font-semibold tracking-tight text-slate-900 focus:ring-2 focus:ring-apple/30 focus:outline-none"
        style={{ letterSpacing: "0.44px" }}
      />
      <section className="mt-8">
        <SectionHeader title="목적" className="mb-2"><span className="text-[12px] text-slate-400">{saved}</span></SectionHeader>
        <textarea
          defaultValue={space.purpose}
          rows={5}
          onBlur={(event) => event.target.value !== space.purpose && save({ purpose: event.target.value })}
          placeholder="무엇을, 어떤 순서로, 어디까지 배울지 적어 두면 튜터가 매 질문마다 읽습니다."
          className="w-full resize-y rounded-xl bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-800 ring-1 ring-slate-200 focus:ring-2 focus:ring-apple/30 focus:outline-none"
        />
      </section>
      <section className="mt-10">
        <SectionHeader title="자료" count={space.materials.length} className="mb-3">
          <Button onClick={() => setEditing("new")}>새 노트</Button>
        </SectionHeader>
        {editing && (
          <NoteForm
            space={space.id}
            note={editing === "new" ? null : editing}
            onDone={(changed) => {
              setEditing(null);
              if (changed) onChanged();
            }}
          />
        )}
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {!space.materials.length && <p className="px-2 py-6 text-[14px] text-slate-500">수업, 노트, 옛 기록이 여기에 모입니다.</p>}
          {space.materials.map((m) => <MaterialRow key={m.id} id={m.id} kind={m.kind} title={m.title} updated={m.updated_at} onEdit={setEditing} onChanged={onChanged} />)}
        </div>
      </section>
      <section className="mt-10">
        <SectionHeader title="대화" count={space.conversations.length} className="mb-3">
          <Button href={chat("&new=1")}>새 대화</Button>
        </SectionHeader>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {!space.conversations.length && <p className="px-2 py-6 text-[14px] text-slate-500">아직 대화가 없습니다.</p>}
          {space.conversations.map((c) => (
            <Link key={c.id} href={chat(`&conversation=${encodeURIComponent(c.id)}`)} className={ROW}>
              <span className="truncate text-[15px] text-slate-900">{c.title}</span>
              <span className="shrink-0 text-[12px] text-slate-400">메시지 {c.message_count} · {since(c.updated_at)}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-10">
        <SectionHeader title="수집물" count={space.collected.length} className="mb-3" />
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {!space.collected.length && <p className="px-2 py-6 text-[14px] text-slate-500">대화에서 문서를 자료로 두면 여기에 모입니다.</p>}
          {space.collected.map((d) => (
            <Link key={d.id} href={chat(`&conversation=${encodeURIComponent(space.conversations.find((c) => c.collected_id === d.id)?.id || "")}&doc=${encodeURIComponent(d.id)}`)} className="block px-2 py-3.5 transition hover:bg-white">
              <span className="block truncate font-mono text-[13px] text-slate-900">{d.path}</span>
              <span className="mt-0.5 block text-[12px] text-slate-400">대화 {d.conversation_count}{d.document_count > 1 ? ` · 문서 ${d.document_count}` : ""}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function MaterialRow({ id, kind, title, updated, onEdit, onChanged }: { id: string; kind: string; title: string; updated: string; onEdit: (m: Material) => void; onChanged: () => void }) {
  const [material, setMaterial] = useState<Material | null>(null);
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);

  const toggle = async () => {
    setOpen(!open);
    if (!material) setMaterial(await api.material(id).catch(() => null));
  };

  const remove = async () => {
    if (!armed) return setArmed(true);
    await api.removeMaterial(id).catch(() => null);
    onChanged();
  };

  return (
    <div>
      <button type="button" onClick={toggle} className={ROW}>
        <span className="min-w-0 truncate text-[15px] text-slate-900">
          <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{KIND[kind] || kind}</span>
          {title}
        </span>
        <span className="shrink-0 text-[12px] text-slate-400">{since(updated)}</span>
      </button>
      {open && (
        <div className="px-2 pb-6">
          {!material ? (
            <p className="text-[13px] text-slate-400">Loading…</p>
          ) : (
            <div className="article">
              {material.kind === "lesson" ? <Blocks rich={material.content as Rich} id={material.id} /> : <div className="md-chat" dangerouslySetInnerHTML={{ __html: chatHtml(material.content as string) }} />}
            </div>
          )}
          {material?.kind === "note" && (
            <div className="mt-4 flex gap-4">
              <Button tone="link" onClick={() => onEdit(material)}>고치기</Button>
              <button type="button" onClick={remove} className="text-[12px] text-slate-500 hover:underline">{armed ? "한 번 더 누르면 삭제" : "삭제"}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NoteForm({ space, note, onDone }: { space: string; note: Material | null; onDone: (changed: boolean) => void }) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState((note?.content as string) || "");
  const store = async () => {
    try {
      if (note) await api.editNote(note.id, title.trim(), content);
      else await api.createNote(space, title.trim(), content);
      onDone(true);
    } catch (error) {
      toast((error as Error).message || "Could not save");
    }
  };
  return (
    <div className="mb-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목" className="w-full bg-transparent text-[17px] font-semibold text-slate-900 focus:outline-none" />
      <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={8} placeholder="마크다운으로 씁니다" className="mt-2 w-full resize-y bg-transparent text-[15px] leading-relaxed text-slate-800 focus:outline-none" />
      <div className="mt-2 flex justify-end gap-2">
        <Button tone="quiet" onClick={() => onDone(false)}>취소</Button>
        <Button tone="fill" onClick={store}>저장</Button>
      </div>
    </div>
  );
}
