"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { api } from "@/lib/api";
import { bilingualMarkdown } from "@/lib/markdown";
import { load, save } from "@/lib/storage";
import Button from "@/ui/Button";
import IconButton from "@/ui/IconButton";
import Menu from "@/ui/Menu";
import SectionHeader from "@/ui/SectionHeader";
import Segmented from "@/ui/Segmented";
import { toast } from "@/ui/Toaster";
import useEscape from "@/ui/useEscape";
import useOutside from "@/ui/useOutside";
import type { Lang } from "./DocPane";

type Props = {
  id: string;
  path: string;
  paired: boolean;
  html: boolean;
  lang: Lang;
  texts: { orig: string | null; trans: string | null };
  content: RefObject<HTMLElement | null>;
  onLang: (lang: Lang) => void;
};

export default function Download({ id, path, paired, html, lang, texts, content, onLang }: Props) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Lang>("orig");
  const [format, setFormat] = useState<"md" | "pdf">("md");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setFormat(load<"md" | "pdf">("dlFmt", "md")), []);

  useEffect(() => {
    if (open) setChoice(paired ? lang : "orig");
  }, [open, paired, lang]);

  const close = useCallback(() => setOpen(false), []);
  useOutside(box, close, open);
  useEscape(close, { when: open });

  const name = path.split("/").pop() || "document";
  const base = name.replace(/\.[^.]+$/, "");
  const output = html && format === "pdf" ? "md" : format;

  const run = async () => {
    setOpen(false);
    if (output === "pdf") {
      const popup = window.open("", "_blank");
      if (!popup) return toast("Could not open the print window. Allow pop-ups.");
      if (paired && choice !== lang) onLang(choice);
      setTimeout(() => print(popup, base, content.current), 150);
      return;
    }
    if (choice === "both" && paired) {
      const translation = texts.trans ?? (await api.file(id, "kor").then((d) => d.content).catch(() => null));
      if (translation === null || texts.orig === null) return toast("Could not load the translation");
      const url = URL.createObjectURL(new Blob([bilingualMarkdown(texts.orig, translation)], { type: "text/markdown;charset=utf-8" }));
      trigger(url, `${base}-bilingual.md`);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return toast(`${base}-bilingual.md downloaded`);
    }
    trigger(api.rawUrl(id, choice === "trans" && paired ? "kor" : "eng"), name);
    toast(`${name} downloaded`);
  };

  return (
    <div ref={box} className="relative flex">
      <IconButton icon="download" size="sm" label="Download" active={open} aria-expanded={open} onClick={() => setOpen(!open)} />
      {open && (
        <Menu label="Download" className="absolute top-full right-0 mt-1 w-64 p-3">
          <SectionHeader title="Language" size="sm" />
          <Segmented
            label="Language"
            value={choice}
            onChange={setChoice}
            className="mb-2 self-start"
            options={[
              { value: "orig", label: "Eng" },
              { value: "trans", label: "Korean", disabled: !paired, title: paired ? "" : "This document has no translation" },
              { value: "both", label: "Line by line", disabled: !paired, title: paired ? "" : "This document has no translation" },
            ]}
          />
          <SectionHeader title="Format" size="sm" />
          <Segmented
            label="Format"
            value={output}
            onChange={(next) => {
              setFormat(next);
              save("dlFmt", next);
            }}
            className="mb-2 self-start"
            options={[
              { value: "md", label: html ? "HTML" : "Markdown" },
              { value: "pdf", label: "PDF", disabled: html, title: html ? "Open the original and print from the new tab" : "" },
            ]}
          />
          <Button tone="fill" className="w-full" onClick={run}>Download</Button>
        </Menu>
      )}
    </div>
  );
}

function trigger(href: string, name: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function print(popup: Window, title: string, article: HTMLElement | null) {
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((node) => node.outerHTML).join("\n");
  const zoom = getComputedStyle(document.documentElement).getPropertyValue("--doc-zoom").trim() || "1";
  popup.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><base href="${location.origin}/"><title>${title.replace(/</g, "&lt;")}</title>${styles}
<style>html,body{height:auto;overflow:visible;background:#fff;margin:0}.doc-print{--doc-zoom:${zoom};padding:14mm 0}@page{margin:0 18mm}@media print{.prose-doc h1,.prose-doc h2,.prose-doc h3{break-after:avoid}.prose-doc pre,.prose-doc table,.prose-doc img,.prose-doc blockquote,.pair{break-inside:avoid}.prose-doc pre{white-space:pre-wrap;word-break:break-word}}</style>
</head><body class="font-sans antialiased bg-white text-slate-900"><article class="doc-print">${(article?.innerHTML || "").replace(/\benter-fade\b/g, "")}</article></body></html>`);
  popup.document.close();
  toast("In the print dialog, set the destination to Save as PDF");
  const go = () => {
    popup.focus();
    popup.print();
  };
  if (popup.document.readyState === "complete") setTimeout(go, 300);
  else popup.addEventListener("load", go);
}
