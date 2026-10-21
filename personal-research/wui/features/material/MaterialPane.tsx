"use client";

import { useEffect, useState } from "react";
import { api, type Material, type Rich } from "@/lib/api";
import { chatHtml } from "@/lib/markdown";
import Blocks from "@/features/blocks/Blocks";
import Skeleton from "@/ui/Skeleton";
import Body from "@/features/workbench/Body";
import Pane from "@/features/workbench/Pane";
import type { Group } from "@/lib/items";

const KIND: Record<string, string> = { lesson: "수업", note: "노트", log: "기록", plan: "목적" };

export default function MaterialPane({ group, id }: { group: Group; id: string }) {
  const [material, setMaterial] = useState<Material | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.material(id).then(setMaterial, (failure) => setError(failure.message || "자료를 찾을 수 없습니다."));
  }, [id]);

  return (
    <Pane group={group} name={material?.title || group.item.title || ""}>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Body>
          {error && <p className="text-[14px] text-slate-500">{error}</p>}
          {!material && !error && (
            <>
              <Skeleton className="mb-3 w-10" />
              <Skeleton className="mb-6 h-6 w-1/2" />
              <Skeleton lines={["w-full", "w-full", "w-11/12", "w-full", "w-3/5"]} className="mb-7" />
              <Skeleton lines={["w-full", "w-10/12", "w-2/3"]} />
            </>
          )}
          {material && (
            <div key={material.id} className="enter-fade">
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
            </div>
          )}
        </Body>
      </main>
    </Pane>
  );
}
