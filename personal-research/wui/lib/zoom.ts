import { emit } from "@/lib/events";
import { load, save } from "@/lib/storage";

export type Zoom = "docZoom" | "chatZoom";

const VARIABLE: Record<Zoom, string> = { docZoom: "--doc-zoom", chatZoom: "--chat-zoom" };

export const MIN = 0.8;
export const MAX = 1.75;

export function readZoom(key: Zoom): number {
  return clamp(Number(load(key, 1)) || 1);
}

export function applyZoom(key: Zoom, value: number): number {
  const next = clamp(value);
  document.documentElement.style.setProperty(VARIABLE[key], String(next));
  save(key, next);
  emit("zoom");
  return next;
}

function clamp(value: number): number {
  return Math.min(MAX, Math.max(MIN, Math.round(value * 100) / 100));
}
