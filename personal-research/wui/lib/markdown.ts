import { Marked, type Token } from "marked";

const chat = new Marked({ gfm: true, breaks: true });
const doc = new Marked({ gfm: true, breaks: false });

const BLOCKED = "script,iframe,frame,object,embed,style,link,meta,base,form,animate,set";
const UNSAFE = /^\s*(javascript|vbscript|data):/i;

function clean(html: string, base?: string): string {
  if (typeof document === "undefined") return html;
  const box = document.createElement("template");
  box.innerHTML = html;
  box.content.querySelectorAll(BLOCKED).forEach((node) => node.remove());
  box.content.querySelectorAll("img").forEach((image) => {
    image.setAttribute("src", located(image.getAttribute("src") || "", base));
    image.setAttribute("referrerpolicy", "no-referrer");
    image.setAttribute("loading", "lazy");
  });
  box.content.querySelectorAll("*").forEach((node) => {
    for (const { name, value } of [...node.attributes]) {
      const link = /^(href|src|xlink:href|action|formaction|srcdoc)$/.test(name);
      if (name.startsWith("on") || (link && UNSAFE.test(value) && !/^\s*data:image\//i.test(value))) node.removeAttribute(name);
    }
  });
  return box.innerHTML;
}

export function chatHtml(source: string): string {
  return clean((chat.parse(source || "") as string).replace(/<p>\s*<\/p>/g, ""));
}

export function docHtml(source: string, base?: string): string {
  return clean(doc.parse(source || "") as string, base);
}

function located(source: string, base?: string): string {
  let url: URL;
  try {
    url = new URL(source, base);
  } catch {
    return source;
  }
  const blob = url.host === "github.com" ? url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/) : null;

  return blob ? `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}` : url.href;
}

function blocks(source: string): Token[] {
  return doc.lexer(source || "").filter((token) => token.type !== "space");
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?]["')\]]*)\s+/).filter(Boolean);
}

function paired(a: Token | undefined, b: Token | undefined): [string[], string[]] | null {
  if (!a || !b || a.type !== "paragraph" || b.type !== "paragraph" || a.raw.trim() === b.raw.trim() || /\]\(|`/.test(a.raw + b.raw)) return null;
  const left = sentences(a.raw.trim());
  const right = sentences(b.raw.trim());
  return left.length === right.length ? [left, right] : null;
}

export function interleavedHtml(original: string, translation: string, base?: string): string {
  const a = blocks(original);
  const b = blocks(translation);
  let html = "";
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const pair = paired(a[i], b[i]);
    if (pair) {
      html += `<div class="pair">${pair[0].map((s, k) => `<p class="original">${doc.parseInline(s.trim())}</p><p class="translation">${doc.parseInline(pair[1][k].trim())}</p>`).join("")}</div>`;
      continue;
    }
    if (a[i]) html += `<div class="original-block">${doc.parser([a[i]])}</div>`;
    if (b[i] && (!a[i] || b[i].raw.trim() !== a[i].raw.trim())) html += `<div class="translation-block">${doc.parser([b[i]])}</div>`;
  }
  return clean(html, base);
}

export function bilingualMarkdown(original: string, translation: string): string {
  const a = blocks(original);
  const b = blocks(translation);
  const out: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const pair = paired(a[i], b[i]);
    if (pair) {
      out.push(pair[0].map((s, k) => `${s.trim()}\n${pair[1][k].trim()}`).join("\n\n"));
      continue;
    }
    if (a[i]) out.push(a[i].raw.trim());
    if (b[i] && (!a[i] || b[i].raw.trim() !== a[i].raw.trim())) out.push(b[i].raw.trim());
  }
  return `${out.join("\n\n")}\n`;
}
