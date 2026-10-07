"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { emit } from "@/lib/events";
import Button from "@/ui/Button";
import IconButton from "@/ui/IconButton";
import Modal from "@/ui/Modal";

const FIELD = "mt-1.5 w-full rounded-xl bg-slate-50 px-3.5 py-2.5 text-[15px] text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-apple/30 focus:outline-none";

export default function NewSpaceModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState("");
  const name = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPurpose("");
    setError("");
    setTimeout(() => name.current?.focus(), 50);
  }, [open]);

  const create = async () => {
    if (!title.trim()) {
      setError("이름을 적어 주세요.");
      name.current?.focus();
      return;
    }
    try {
      await api.createSpace(title.trim(), purpose);
      emit("spaces");
      onClose();
      onCreated();
    } catch (failure) {
      setError((failure as Error).message || "만들지 못했습니다.");
    }
  };

  return (
    <Modal open={open} onClose={onClose} label="새 space" className="flex max-w-md flex-col">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <h3 className="flex-1 text-[17px] font-semibold text-slate-900">새 space</h3>
        <IconButton icon="close" label="Close" onClick={onClose} />
      </div>
      <div className="space-y-4 px-5 py-3">
        <label className="block">
          <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">이름</span>
          <input
            ref={name}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && !event.nativeEvent.isComposing && create()}
            placeholder="예: 트랜스포머 학습"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">목적</span>
          <textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={4} placeholder="무엇을, 어떤 순서로, 어디까지 배울지. 나중에 고칠 수 있습니다." className={`${FIELD} resize-y leading-relaxed`} />
        </label>
        {error && <p className="text-[13px] text-red-600">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
        <Button tone="quiet" size="lg" onClick={onClose}>Cancel</Button>
        <Button tone="fill" size="lg" onClick={create}>Create</Button>
      </div>
    </Modal>
  );
}
