/* Small shared utilities, ported from the mockup runtime (tokens 16.1).
   RNG/mulberry/pick served the mockup's seed data only and are not ported. */

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const hashStr = (s: string) => {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
};

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const uid = (p = "id") => p + "_" + Math.random().toString(36).slice(2, 9);
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
export const avg = (a: number[]) => (a.length ? sum(a) / a.length : 0);

export const MIN = 6e4;
export const HR = 36e5;
export const DAY = 864e5;

export const fnum = (n: number, d = 0) =>
  Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
