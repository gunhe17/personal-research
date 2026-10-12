export function format(n: number, digits = 4): string {
  const value = Math.abs(n) < 1e-10 ? 0 : n;
  return Number(value.toFixed(digits)).toLocaleString("en-US", { maximumFractionDigits: digits }).replace("-", "−");
}
