export class ApiError extends Error {}

export type TreeNode =
  | { type: "dir"; name: string; path: string; children: TreeNode[] }
  | { type: "file"; id: string; name: string; path: string; ext: string; languages: string[]; published: string | null };

export type SpaceItem = {
  id: string;
  title: string;
  purpose: string;
  created_at: string;
  updated_at: string;
  conversation_count: number;
  collected_count: number;
};

export type ConversationItem = {
  id: string;
  title: string;
  collected_id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
};

export type MaterialItem = { id: string; kind: string; title: string; created_at: string; updated_at: string };

export type CollectedItem = {
  id: string;
  path: string;
  url: string;
  conversation_count: number;
  updated_at: string;
  document_count: number;
  documents: { id: string; path: string; url: string }[];
};

export type Space = {
  id: string;
  title: string;
  purpose: string;
  created_at: string;
  updated_at: string;
  materials: MaterialItem[];
  conversations: ConversationItem[];
  collected: CollectedItem[];
};

export type Block = {
  kind: "paragraph" | "heading" | "formula" | "bullet" | "code" | "playground";
  text: string;
  playground: PlaygroundConfig | null;
};

export type PlaygroundConfig = { mode: "loss" | "rate" | "derivative" | "descent"; x: number; y: number; w: number; h: number; learning_rate: number };

export type Rich = { title: string; blocks: Block[]; follow_up: string; learning_note?: string; via?: string };

export type Material = { id: string; space_id: string; kind: string; title: string; content: string | Rich; created_at: string; updated_at: string };

export type Annotation = { id: string; source_id: string; start: number; end: number; text: string; comment: string };

export type MessageContext = {
  model?: { provider: string; model: string };
  selected_text?: string;
  source_path?: string;
  source_answer_id?: string;
  annotations?: Annotation[];
  citations?: { text: string }[];
  w?: number;
  h?: number;
  x?: number;
  y?: number;
  mode?: string;
  learning_rate?: number;
  view?: string;
  key?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  kind: string | null;
  content: string;
  context: MessageContext | null;
  rich: Rich | null;
  sources: { id: string; path: string }[] | null;
  question_id: string | null;
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | null;
  error: string | null;
  created_at: string;
};

export type Domain = "space" | "agent";

export type Conversation = {
  id: string;
  space_id?: string;
  collected_id?: string;
  title: string;
  domain: Domain;
  messages: Message[];
  codex_available: boolean;
};

export type ModelCatalog = {
  default: { provider: string; model: string };
  providers: { id: string; label: string; model: string; models: { id: string; label: string }[] }[];
};

export type Method = {
  id: string;
  enabled: boolean;
  type: "plan_key" | "api_key";
  label: string;
  secret: string;
  saved: string;
  usage: { month: number; last: string };
};

export type Provider = { id: string; label: string; cli: string; methods: Method[]; models: { id: string; label: string }[] };

export type Login = {
  logged_in: boolean;
  detail: string;
  pending: { url: string; code: string; needs_code: boolean; error: string } | null;
};

export type Meta = { url?: string; path?: string };

export type Skill = { name: string; description: string };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new ApiError("서버에 연결하지 못했습니다.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error || "요청을 처리하지 못했습니다.");
  return body as T;
}

function send<T>(url: string, payload: unknown, method = "POST"): Promise<T> {
  return request<T>(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

const query = (values: Record<string, string>) => new URLSearchParams(values).toString();

export const api = {
  tree: () => request<{ tree: TreeNode[] }>("/api/tree"),
  meta: (id: string) => request<Meta>(`/api/meta?${query({ id })}`),
  file: (id: string, language: string) => request<{ content: string }>(`/api/file?${query({ id, language })}`),
  raw: (id: string, language: string) => `/api/raw?${query({ id, language })}`,
  opened: (id: string) => send<{ id: string }>("/api/opened", { id }),

  spaces: () => request<{ items: SpaceItem[] }>("/api/spaces"),
  space: (id: string) => request<Space>(`/api/spaces/${encodeURIComponent(id)}`),
  createSpace: (title: string, purpose: string) => send<{ id: string }>("/api/spaces", { title, purpose }),

  material: (id: string) => request<Material>(`/api/materials/${encodeURIComponent(id)}`),

  conversation: (domain: Domain, id: string) => request<Conversation>(`/api/${domain}/conversations/${encodeURIComponent(id)}`),
  startAgent: (question: string) => send<{ id: string }>("/api/agent/conversations", { question, client_id: crypto.randomUUID() }),
  startSpace: (space: string, collected: string) => send<{ id: string }>("/api/space/conversations", { space_id: space, collected_id: collected }),
  ask: (domain: Domain, id: string, payload: unknown) => send<Message>(`/api/${domain}/conversations/${encodeURIComponent(id)}/messages`, payload),
  act: (domain: Domain, id: string, action: "retry" | "cancel", message: string) =>
    send<unknown>(`/api/${domain}/conversations/${encodeURIComponent(id)}/${action}`, { message_id: message }),

  models: () => request<ModelCatalog>("/api/models"),
  skills: () => request<{ items: Skill[] }>("/api/skills"),
  settings: () => request<{ providers: Provider[] }>("/api/settings"),
  editProvider: (id: string, values: Record<string, unknown>) => send<{ providers: Provider[] }>("/api/settings", { providers: { [id]: values } }, "PUT"),
  login: (provider: string, method: string) => request<Login>(`/api/login?${query({ provider, method })}`),
  startLogin: (provider: string, method: string) => send<Login>("/api/login", { provider, method }),
  submitLogin: (provider: string, method: string, code: string) => send<Login>("/api/login", { provider, method, code }),
  cancelLogin: (provider: string, method: string) => request<{ ok: boolean }>(`/api/login?${query({ provider, method })}`, { method: "DELETE" }),
  logout: (provider: string, method: string) => request<Login>(`/api/login?${query({ provider, method, signout: "1" })}`, { method: "DELETE" }),
};

export type CollectEvent =
  | { type: "step"; key: string; text: string; state?: string }
  | { type: "terms"; terms: string[] }
  | { type: "collected"; id: string; path: string }
  | { type: "delta"; text: string }
  | { type: "done"; text?: string; id?: string }
  | { type: "error"; error: string }
  | { type: "conversation"; domain: string; id: string };

export async function collect(input: string, onEvent: (event: CollectEvent) => void): Promise<void> {
  const response = await fetch("/api/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }) });
  if (!response.ok || !response.body) throw new ApiError(await response.text());
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (raw === "[DONE]") continue;
      try {
        onEvent(JSON.parse(raw) as CollectEvent);
      } catch {}
    }
  }
}
