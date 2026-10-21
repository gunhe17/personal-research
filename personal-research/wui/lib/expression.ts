type Node = (x: number) => number;

const FUNCTIONS: Record<string, (...values: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log,
  log2: Math.log2,
  log10: Math.log10,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  sigmoid: (v) => 1 / (1 + Math.exp(-v)),
  relu: (v) => Math.max(0, v),
  gelu: (v) => 0.5 * v * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (v + 0.044715 * v ** 3))),
  softplus: (v) => Math.log1p(Math.exp(v)),
  max: Math.max,
  min: Math.min,
  pow: Math.pow,
};
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

export function compile(source: string): Node | null {
  const tokens = source.replace(/\*\*/g, "^").match(/\d*\.?\d+(?:e[+-]?\d+)?|[a-z_][a-z0-9_]*|[-+*/^(),]/gi);
  if (!tokens || tokens.join("") !== source.replace(/\*\*/g, "^").replace(/\s+/g, "")) return null;
  let at = 0;
  const peek = () => tokens[at];
  const take = (expected?: string) => {
    const token = tokens[at];
    if (expected !== undefined && token !== expected) throw new Error(expected);
    at += 1;
    return token;
  };

  const sum = (): Node => {
    let left = product();
    while (peek() === "+" || peek() === "-") {
      const operator = take();
      const right = product();
      const before = left;
      left = operator === "+" ? (x) => before(x) + right(x) : (x) => before(x) - right(x);
    }
    return left;
  };
  const product = (): Node => {
    let left = unary();
    while (peek() === "*" || peek() === "/" || (peek() !== undefined && /^[\d.a-z_(]/i.test(peek()))) {
      const operator = peek() === "*" || peek() === "/" ? take() : "*";
      const right = unary();
      const before = left;
      left = operator === "/" ? (x) => before(x) / right(x) : (x) => before(x) * right(x);
    }
    return left;
  };
  const unary = (): Node => {
    if (peek() === "-") {
      take();
      const inner = unary();
      return (x) => -inner(x);
    }
    if (peek() === "+") take();
    return power();
  };
  const power = (): Node => {
    const base = atom();
    if (peek() !== "^") return base;
    take();
    const exponent = unary();
    return (x) => base(x) ** exponent(x);
  };
  const atom = (): Node => {
    const token = take();
    if (token === undefined) throw new Error("end");
    if (token === "(") {
      const inner = sum();
      take(")");
      return inner;
    }
    if (/^\d|^\./.test(token)) {
      const value = Number(token);
      return () => value;
    }
    const name = token.toLowerCase();
    if (name === "x") return (x) => x;
    if (Object.hasOwn(CONSTANTS, name)) {
      const value = CONSTANTS[name];
      return () => value;
    }
    if (!Object.hasOwn(FUNCTIONS, name)) throw new Error(name);
    const fn = FUNCTIONS[name];
    take("(");
    const args = [sum()];
    while (peek() === ",") {
      take();
      args.push(sum());
    }
    take(")");
    return (x) => fn(...args.map((arg) => arg(x)));
  };

  try {
    const compiled = sum();
    return at === tokens.length ? compiled : null;
  } catch {
    return null;
  }
}
