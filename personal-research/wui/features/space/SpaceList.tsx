"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SpaceItem } from "@/lib/api";
import { since } from "@/lib/time";
import Button from "@/ui/Button";
import NewSpaceModal from "./NewSpaceModal";

export default function SpaceList({ items, onCreated }: { items: SpaceItem[]; onCreated: () => void }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <div className="mb-10 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[40px] font-semibold tracking-tight text-slate-900" style={{ letterSpacing: "0.44px" }}>Space</h1>
          <p className="mt-1 text-[17px] font-light text-slate-500">무엇을 배울지 목적 하나가 space 하나입니다.</p>
        </div>
        <Button size="lg" onClick={() => setCreating(true)}>+ new</Button>
      </div>
      <div className="overflow-hidden rounded-2xl bg-white">
        {!items.length && <p className="px-5 py-10 text-center text-[15px] text-slate-500">아직 space 가 없습니다.</p>}
        {items.map((item, i) => (
          <div key={item.id} onClick={() => router.push(`/space?id=${encodeURIComponent(item.id)}`)} className="cursor-pointer pl-5 transition hover:bg-slate-50">
            <div className={`flex items-center gap-4 py-4 pr-5 ${i ? "border-t border-slate-100" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-semibold text-slate-900">{item.title}</div>
                <div className="mt-0.5 truncate text-[14px] text-slate-500">{item.purpose || "목적이 아직 없습니다"}</div>
              </div>
              <div className="w-20 shrink-0 text-right text-[14px] text-slate-600 tabular-nums">{since(item.updated_at)}</div>
              <Button tone="fill" href={`/collected?space=${encodeURIComponent(item.id)}`} onClick={(event) => event.stopPropagation()}>research</Button>
            </div>
          </div>
        ))}
      </div>
      <NewSpaceModal open={creating} onClose={() => setCreating(false)} onCreated={onCreated} />
    </>
  );
}
