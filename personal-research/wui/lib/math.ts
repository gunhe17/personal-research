import katex from "katex";

const PATTERN = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$(?!\s)((?:\\\$|[^$\n])+?)(?<!\s)\$(?!\d)/g;

export type Piece = { math: false; text: string } | { math: true; html: string; display: boolean };

export function mathHtml(source: string, display: boolean): string {
  return katex.renderToString(source, { displayMode: display, throwOnError: false, strict: "ignore", trust: false, maxSize: 20, maxExpand: 200 });
}

export function pieces(text: string): Piece[] {
  const found: Piece[] = [];
  let last = 0;
  for (const match of text.matchAll(PATTERN)) {
    if (match.index > last) found.push({ math: false, text: text.slice(last, match.index) });
    const display = match[1] !== undefined || match[2] !== undefined;
    found.push({ math: true, html: mathHtml((match[1] ?? match[2] ?? match[3] ?? match[4]).trim(), display), display });
    last = match.index + match[0].length;
  }
  if (last < text.length) found.push({ math: false, text: text.slice(last) });
  return found;
}

const SYMBOLS: Record<string, string> = {
  cdot: "·", times: "×", to: "→", rightarrow: "→", leftarrow: "←", approx: "≈", le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", infty: "∞", sum: "Σ", prod: "Π", sqrt: "√", partial: "∂", nabla: "∇", top: "ᵀ",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", eta: "η", theta: "θ", lambda: "λ", mu: "μ", pi: "π", sigma: "σ", tau: "τ", phi: "φ", omega: "ω", Delta: "Δ", Sigma: "Σ",
};

export function plain(text: string): string {
  if (!/[$\\]/.test(text)) return text;
  return text
    .replace(/\\\(|\\\)|\\\[|\\\]|\$/g, "")
    .replace(/\\(?:mathrm|text|mathbf|operatorname)\{([^}]*)\}/g, "$1")
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)")
    .replace(/\\([A-Za-z]+)/g, (whole, name: string) => SYMBOLS[name] ?? name)
    .replace(/[{}]/g, "");
}
