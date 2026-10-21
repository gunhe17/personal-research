import { useEffect, useState } from "react";
import { EXIT } from "./usePresence";

export type Entry<T> = { item: T; key: string; leaving: boolean; entering: boolean };

export default function useLeaving<T>(items: T[] | null, keyOf: (item: T) => string): Entry<T>[] {
  const [source, setSource] = useState(items);
  const [rows, setRows] = useState<Entry<T>[]>(() => (items || []).map((item) => ({ item, key: keyOf(item), leaving: false, entering: false })));

  if (items !== source) {
    const still = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const before = new Set(rows.filter((row) => !row.leaving).map((row) => row.key));
    const next: Entry<T>[] = (items || []).map((item) => {
      const key = keyOf(item);
      return { item, key, leaving: false, entering: !still && source !== null && !before.has(key) };
    });
    if (!still) {
      const present = new Set(next.map((row) => row.key));
      rows.forEach((row, index) => {
        if (!present.has(row.key)) next.splice(Math.min(index, next.length), 0, { ...row, leaving: true, entering: false });
      });
    }
    setSource(items);
    setRows(next);
  }

  useEffect(() => {
    if (rows.some((row) => row.entering)) {
      const frame = requestAnimationFrame(() => setRows((all) => all.map((row) => (row.entering ? { ...row, entering: false } : row))));
      return () => cancelAnimationFrame(frame);
    }
    if (rows.some((row) => row.leaving)) {
      const timer = setTimeout(() => setRows((all) => all.filter((row) => !row.leaving)), EXIT);
      return () => clearTimeout(timer);
    }
  }, [rows]);

  return rows;
}
