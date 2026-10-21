"use client";

import { useEffect, useRef, useState } from "react";
import { api, type Meta, type TreeNode } from "@/lib/api";
import { docHtml, interleavedHtml } from "@/lib/markdown";
import { load, save } from "@/lib/storage";
import Button from "@/ui/Button";
import Segmented from "@/ui/Segmented";
import Skeleton from "@/ui/Skeleton";
import { toast } from "@/ui/Toaster";
import Body from "@/features/workbench/Body";
import Pane from "@/features/workbench/Pane";
import type { Group } from "@/lib/items";
import { useWorkbench } from "@/features/workbench/WorkbenchProvider";
import Download from "./Download";
import SelectionBar from "./SelectionBar";

export type Lang = "orig" | "trans" | "both";
type File = Extract<TreeNode, { type: "file" }>;

let files: Promise<Map<string, File>> | null = null;

function lookup(id: string): Promise<File | undefined> {
  files ||= api.tree().then((data) => {
    const found = new Map<string, File>();
    const walk = (nodes: TreeNode[]) => nodes.forEach((n) => (n.type === "dir" ? walk(n.children) : found.set(n.id, n)));
    walk(data.tree);
    return found;
  }).catch(() => {
    files = null;
    return new Map();
  });
  return files.then((map) => {
    if (map.has(id)) return map.get(id);
    files = null;
    return undefined;
  });
}

const LANGS: { value: Lang; label: string }[] = [
  { value: "orig", label: "Eng" },
  { value: "trans", label: "Korean" },
  { value: "both", label: "Line by line" },
];

export default function DocPane({ group, id }: { group: Group; id: string }) {
  const workbench = useWorkbench();
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [texts, setTexts] = useState<{ orig: string | null; trans: string | null }>({ orig: null, trans: null });
  const [lang, setLang] = useState<Lang>("orig");
  const [error, setError] = useState("");
  const content = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLElement>(null);
  const markdown = /\.(md|markdown|mdx)$/i.test(file?.path || "");
  const html = /\.html?$/i.test(file?.path || "");
  const paired = markdown && Boolean(file?.languages.includes("kor"));
  const shown = paired ? lang : "orig";

  useEffect(() => {
    setLang(load<Lang>("docLang", "orig"));
    (async () => {
      const node = await lookup(id);
      const [english, details] = await Promise.all([api.file(id, "eng"), api.meta(id).catch(() => null)]);
      setFile(node || { type: "file", id, name: details?.path?.split("/").pop() || id, path: details?.path || id, ext: "", languages: ["eng"], published: null });
      setMeta(details);
      setTexts({ orig: english.content, trans: null });
      api.markOpened(id).catch(() => {});
    })().catch(() => setError("Could not load the document"));
  }, [id]);

  const { viewDoc } = workbench;
  useEffect(() => {
    if (file) viewDoc({ id, path: file.path });
  }, [file, id, viewDoc]);

  useEffect(() => {
    if (shown === "orig" || texts.trans !== null || !file) return;
    api.file(id, "kor").then((korean) => setTexts((t) => ({ ...t, trans: korean.content })), () => {
      toast("Could not load the translation");
      setLang("orig");
    });
  }, [shown, texts.trans, file, id]);

  useEffect(() => {
    if (!file || !texts.orig || !scroller.current) return;
    const y = Number(load(`docScroll:${file.path}`, 0, true)) || 0;
    if (y) scroller.current.scrollTop = y;
  }, [file, texts.orig]);

  const choose = (next: Lang) => {
    setLang(next);
    save("docLang", next);
  };

  const body = () => {
    if (error) return <p className="enter-fade py-24 text-center text-[14px] text-slate-400">{error}</p>;
    if (texts.orig === null || !file) return <ArticleSkeleton title />;
    if (html) {
      return (
        <div key={file.id} className="enter-fade py-24 text-center">
          <p className="px-6 text-[21px] font-semibold tracking-tight break-all text-slate-800">{file.name}</p>
          <p className="mt-2 text-[14px] font-light text-slate-500">An HTML document with its original typesetting. Opens as is in a new tab.</p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button tone="fill" size="lg" onClick={() => window.open(api.rawUrl(id, "eng"), "_blank", "noopener")}>Open original</Button>
            {file.languages.includes("kor") && <Button size="lg" onClick={() => window.open(api.rawUrl(id, "kor"), "_blank", "noopener")}>Open Korean</Button>}
          </div>
        </div>
      );
    }
    if (!markdown) return <pre key={file.id} className="enter-fade rounded-xl bg-white p-4 font-mono text-[0.92em] whitespace-pre-wrap text-slate-800">{texts.orig}</pre>;
    if (shown !== "orig" && texts.trans === null) return <ArticleSkeleton />;
    const base = meta?.url;
    const source = shown === "trans" ? docHtml(texts.trans!, base) : shown === "both" ? interleavedHtml(texts.orig, texts.trans!, base) : docHtml(texts.orig, base);
    return <div key={`${file.id}:${shown}`} className="prose-doc enter-fade" dangerouslySetInnerHTML={{ __html: source }} />;
  };

  return (
    <Pane
      group={group}
      name={file?.name || group.item.title || ""}
      title={file?.path}
      actions={file && <Download id={id} path={file.path} paired={paired} html={html} lang={shown} texts={texts} content={content} onLang={choose} />}
    >
      <main
        ref={scroller}
        onScroll={(event) => file && save(`docScroll:${file.path}`, Math.round(event.currentTarget.scrollTop), true)}
        className="relative min-h-0 flex-1 overflow-y-auto select-text"
      >
        {paired && (
          <div className="pointer-events-none sticky top-0 z-10">
            <div className="mx-auto flex max-w-3xl justify-end px-6 pt-1 sm:px-10">
              <Segmented label="Document language" options={LANGS} value={shown} onChange={choose} className="pointer-events-auto bg-slate-100/90 backdrop-blur" />
            </div>
          </div>
        )}
        <Body ref={content}>
          {meta?.url && (
            <p key={meta.url} className="enter-fade mb-4 text-[12px] break-all text-slate-500">
              Source <a href={meta.url} target="_blank" rel="noopener" className="text-apple-link hover:underline">{meta.url}</a>
            </p>
          )}
          {body()}
        </Body>
        <SelectionBar scope={content} onQuote={(text) => (file ? workbench.sendQuote({ text, path: file.path, id }) : false)} />
      </main>
    </Pane>
  );
}

const PARAGRAPHS = [
  ["w-full", "w-full", "w-11/12", "w-3/5"],
  ["w-full", "w-full", "w-full", "w-10/12", "w-2/5"],
  ["w-full", "w-11/12", "w-4/5"],
];

function ArticleSkeleton({ title }: { title?: boolean }) {
  return (
    <div>
      {title && <Skeleton className="mb-8 h-7 w-3/5" />}
      {PARAGRAPHS.map((lines, index) => <Skeleton key={index} lines={lines} className="mb-7" />)}
    </div>
  );
}
