"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { load, save } from "@/lib/storage";
import { toast } from "@/ui/Toaster";
import { itemKey, legacy, LIMIT, type Group, type Item, type Side } from "./items";

type Doc = { id: string; path: string };
type Quote = { target: string; text: string; path: string; id: string; nonce: number };

type Value = {
  groups: Group[];
  focus: number;
  ready: boolean;
  open: (item: Item, options?: { group?: number; beside?: string }) => void;
  split: (item: Item, index: number, side: Side) => void;
  close: (group: string) => void;
  move: (from: string, to: string, side: Side) => void;
  focusGroup: (group: string) => void;
  replace: (group: string, item: Item) => void;
  doc: Doc | null;
  viewDoc: (doc: Doc) => void;
  quote: Quote | null;
  sendQuote: (quote: Omit<Quote, "target" | "nonce">) => void;
  activeKey: string;
  activeSpace: string | null;
};

const Context = createContext<Value | null>(null);

export function useWorkbench(): Value {
  const value = useContext(Context);
  if (!value) throw new Error("WorkbenchProvider is missing");
  return value;
}

const fresh = () => Math.random().toString(36).slice(2, 10);

export default function WorkbenchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [groups, setGroups] = useState<Group[]>([]);
  const [focus, setFocus] = useState(0);
  const [ready, setReady] = useState(false);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const lastChat = useRef<string | null>(null);

  useEffect(() => {
    const saved = load<{ focus?: number } | null>("workbench", null);
    const restored = legacy(saved);
    setGroups(restored);
    setFocus(Math.min(saved?.focus || 0, Math.max(restored.length - 1, 0)));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) save("workbench", { groups, focus });
  }, [groups, focus, ready]);

  useEffect(() => {
    const focused = groups[focus];
    if (focused && (focused.item.kind === "chat" || focused.item.kind === "agent")) lastChat.current = focused.id;
  }, [groups, focus]);

  const show = useCallback(() => {
    if (pathname !== "/collected") router.push("/collected");
  }, [pathname, router]);

  const split = useCallback((item: Item, index: number, side: Side) => {
    setGroups((current) => {
      if (current.length >= LIMIT || side === "center") {
        const at = Math.min(Math.max(index, 0), current.length - 1);
        setFocus(Math.max(at, 0));
        return current.length ? current.map((g, i) => (i === at ? { ...g, item } : g)) : [{ id: fresh(), item }];
      }
      const at = side === "left" ? index : index + 1;
      setFocus(at);
      return [...current.slice(0, at), { id: fresh(), item }, ...current.slice(at)];
    });
    show();
  }, [show]);

  const open = useCallback((item: Item, options: { group?: number; beside?: string } = {}) => {
    setGroups((current) => {
      if (options.beside) {
        const from = current.findIndex((g) => g.id === options.beside);
        if (current.length < 2) {
          const at = Math.max(from, 0) + 1;
          setFocus(at);
          return [...current.slice(0, at), { id: fresh(), item }, ...current.slice(at)];
        }
        const at = from === current.length - 1 ? from - 1 : from + 1;
        setFocus(at);
        return current.map((g, i) => (i === at ? { ...g, item } : g));
      }
      if (!current.length) {
        setFocus(0);
        return [{ id: fresh(), item }];
      }
      const at = Math.min(Math.max(options.group ?? focus, 0), current.length - 1);
      setFocus(at);
      return current.map((g, i) => (i === at ? { ...g, item } : g));
    });
    show();
  }, [focus, show]);

  const close = useCallback((group: string) => {
    setGroups((current) => {
      const next = current.filter((g) => g.id !== group);
      setFocus((f) => Math.min(f, Math.max(next.length - 1, 0)));
      return next;
    });
  }, []);

  const move = useCallback((from: string, to: string, side: Side) => {
    setGroups((current) => {
      const source = current.find((g) => g.id === from);
      if (!source || (from === to && (side === "center" || current.length === 1))) return current;
      const rest = current.filter((g) => g.id !== from);
      const target = rest.findIndex((g) => g.id === to);
      if (side === "center") {
        setFocus(target);
        return rest.map((g) => (g.id === to ? { ...g, item: source.item } : g));
      }
      const at = target < 0 ? rest.length : side === "left" ? target : target + 1;
      setFocus(at);
      return [...rest.slice(0, at), source, ...rest.slice(at)];
    });
  }, []);

  const focusGroup = useCallback((group: string) => {
    setFocus((f) => {
      const at = groups.findIndex((g) => g.id === group);
      return at < 0 ? f : at;
    });
  }, [groups]);

  const replace = useCallback((group: string, item: Item) => {
    setGroups((current) => current.map((g) => (g.id === group ? { ...g, item } : g)));
  }, []);

  const sendQuote = useCallback((detail: Omit<Quote, "target" | "nonce">) => {
    const chats = groups.filter((g) => g.item.kind === "chat" || g.item.kind === "agent");
    const target = chats.find((g) => g.id === lastChat.current) || chats[0];
    if (!target) return toast("인용을 받을 대화를 먼저 여세요");
    setFocus(groups.indexOf(target));
    setQuote({ ...detail, target: target.id, nonce: Date.now() });
  }, [groups]);

  const focused = groups[focus];
  const value = useMemo<Value>(() => ({
    groups,
    focus,
    ready,
    open,
    split,
    close,
    move,
    focusGroup,
    replace,
    doc,
    viewDoc: setDoc,
    quote,
    sendQuote,
    activeKey: focused ? itemKey(focused.item) : "",
    activeSpace: focused?.item.kind === "chat" ? focused.item.space : null,
  }), [groups, focus, ready, open, split, close, move, focusGroup, replace, doc, quote, sendQuote, focused]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
