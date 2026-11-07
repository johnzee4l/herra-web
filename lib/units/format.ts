/* Formatters. Units convert for display only here (R12).
   The Filipino locale branch in the mockup's fdate is dropped (English only). */

import type { Settings } from "@/lib/types";
import { fnum } from "@/lib/utils";

export const TZ = "Asia/Manila";

export const fdate = (ts: number, o: Intl.DateTimeFormatOptions) =>
  new Date(ts).toLocaleString("en-US", Object.assign({ timeZone: TZ }, o));

export const fDay = (ts: number) => fdate(ts, { month: "short", day: "numeric" });
export const fTime = (ts: number) =>
  fdate(ts, { hour: "2-digit", minute: "2-digit", hour12: false });
export const fDT = (ts: number) => fDay(ts) + " · " + fTime(ts);
export const fLong = (ts: number) =>
  fdate(ts, { weekday: "long", month: "long", day: "numeric" });
export const dayKey = (ts: number) =>
  fdate(ts, { year: "numeric", month: "2-digit", day: "2-digit" });

export const ago = (ts: number) => {
  const d = Date.now() - ts;
  if (d < 60e3) return "just now";
  if (d < 3.6e6) return Math.floor(d / 6e4) + " min ago";
  if (d < 864e5) return Math.floor(d / 36e5) + " h ago";
  return Math.floor(d / 864e5) + " d ago";
};

export const fT = (c: number, s: Settings, d = 0) =>
  s.temp === "F" ? fnum((c * 9) / 5 + 32, d) + "°F" : fnum(c, d) + "°C";

export const fTn = (c: number, s: Settings) =>
  Math.round(s.temp === "F" ? (c * 9) / 5 + 32 : c);

export const fA = (ha: number, s: Settings, d = 1) =>
  s.area === "ac" ? fnum(ha * 2.4711, d) + " ac" : fnum(ha, d) + " ha";

export const fR = (mm: number, s: Settings, d = 0) =>
  s.units === "imperial" ? fnum(mm / 25.4, 1) + " in" : fnum(mm, d) + " mm";

export const fL = (m: number, s: Settings) =>
  s.units === "imperial" ? fnum(m * 3.28084, 0) + " ft" : fnum(m, 0) + " m";

export const fCoord = (lat: number, lng: number) =>
  `${Math.abs(lat).toFixed(5)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lng).toFixed(5)}°${
    lng >= 0 ? "E" : "W"
  }`;

export const copy = async (txt: string) => {
  try {
    await navigator.clipboard.writeText(txt);
    return true;
  } catch {
    return false;
  }
};
