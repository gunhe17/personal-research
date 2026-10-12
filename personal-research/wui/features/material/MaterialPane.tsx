"use client";

import { useEffect, useState } from "react";
import { api, type Material, type Rich } from "@/lib/api";
import { chatHtml } from "@/lib/markdown";
import Blocks from "@/features/blocks/Blocks";
import PaneBar from "@/features/workbench/PaneBar";
import type { Group } from "@/lib/items";

const KIND: Record<string, string> = { lesson: "수업", note: "노트", log: "기록", plan: "목적" };

export default function MaterialPane({ group, id }: { group: Group; id: string }) {
  const [material, setMaterial] = useState<Material | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.material(id).then(setMaterial, (failure) => setError(failure.message || "자료를 찾을 수 없습니다."));
  }, [id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <PaneBar group={group} name={material?.title || group.item.title || ""} />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <article className="mx-auto max-w-3xl px-6 py-8 pb-16 sm:px-10">
          {error && <p className="text-[14px] text-slate-500">{error}</p>}
          {material && (
            <>
              <p className="mb-2 text-[12px] text-slate-400">{KIND[material.kind] || material.kind}</p>
              <div className="article">
                {material.kind === "lesson" ? (
                  <Blocks rich={material.content as Rich} id={material.id} />
                ) : (
                  <>
                    <h2>{material.title}</h2>
                    <div className="md-chat" dangerouslySetInnerHTML={{ __html: chatHtml(material.content as string) }} />
                  </>
                )}
              </div>
            </>
          )}
        </article>
      </main>
    </div>
  );
}
