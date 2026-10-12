const area = (session: boolean) => (session ? sessionStorage : localStorage);

export function load<T>(key: string, fallback: T, session = false): T {
  let raw: string | null = null;
  try {
    raw = area(session).getItem(key);
  } catch {
    return fallback;
  }
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return typeof fallback === "string" ? (raw as T) : fallback;
  }
}

export function save(key: string, value: unknown, session = false): void {
  try {
    area(session).setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch {}
}
