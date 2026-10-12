import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Space, type SpaceItem } from "@/lib/api";
import { listen } from "@/lib/events";

export function useSpaces(wanted: (space: SpaceItem) => boolean) {
  const [spaces, setSpaces] = useState<SpaceItem[] | null>(null);
  const [details, setDetails] = useState<Record<string, Space>>({});
  const requested = useRef(new Set<string>());

  const refresh = useCallback(() => {
    api.spaces().then((data) => setSpaces(data.items), () => setSpaces([]));
    requested.current.clear();
    setDetails({});
  }, []);

  useEffect(() => {
    refresh();
    return listen("spaces", refresh);
  }, [refresh]);

  useEffect(() => {
    for (const space of spaces || []) {
      if (wanted(space) && !requested.current.has(space.id)) {
        requested.current.add(space.id);
        api.space(space.id).then((detail) => setDetails((all) => ({ ...all, [space.id]: detail })), () => {});
      }
    }
  });

  return { spaces, details };
}
