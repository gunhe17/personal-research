"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, type Space, type SpaceItem } from "@/lib/api";
import SpaceDetail from "./SpaceDetail";
import SpaceList from "./SpaceList";

export default function SpacePage() {
  const id = useSearchParams().get("id");
  const [items, setItems] = useState<SpaceItem[] | null>(null);
  const [space, setSpace] = useState<Space | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    setError("");
    if (id) api.space(id).then(setSpace, (failure) => setError(failure.message));
    else api.spaces().then((data) => setItems(data.items), (failure) => setError(failure.message));
  }, [id, version]);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        {error && <p className="text-sm text-slate-500">Could not load: {error}</p>}
        {!error && id && space?.id === id && <SpaceDetail key={`${space.id}:${version}`} space={space} onChanged={reload} />}
        {!error && !id && items && <SpaceList items={items} onCreated={reload} />}
      </div>
    </main>
  );
}
