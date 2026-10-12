const NAMES = ["spaces", "settings", "zoom", "agents", "auth"] as const;

export type Signal = (typeof NAMES)[number];

export function emit(name: Signal): void {
  window.dispatchEvent(new Event(`research:${name}`));
}

export function listen(name: Signal, run: () => void): () => void {
  window.addEventListener(`research:${name}`, run);
  return () => window.removeEventListener(`research:${name}`, run);
}
