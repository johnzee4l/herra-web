/* Read helpers over the hydrated store.

   These keep the names the screens already use, but every value comes from
   Supabase rows loaded by the parent layout. */

import { db } from "@/lib/store";
import type { Entry, Field, Member, Space, User, WeekDay } from "@/lib/types";

/* Stable aliases to the hydrated arrays. DataBridge fills these arrays in
   place before the screen renders, so components that import them see real
   rows without a second data path. */
export const SPACES: Space[] = db.spaces;
export const FIELDS: Field[] = db.fields;
export const ENTRIES: Entry[] = db.entries;
export const MEMBERS: Member[] = db.members;
export const USERS: User[] = db.users;

export function mySpaces(userId: string): Space[] {
  const user = db.users.find((u) => u.id === userId);
  if (user?.role === "admin") return db.spaces;
  const ids = new Set(db.members.filter((m) => m.userId === userId).map((m) => m.spaceId));
  return db.spaces.filter((s) => ids.has(s.id));
}

export function myFields(userId: string, spaceId?: string): Field[] {
  return db.fields.filter(
    (f) => f.ownerId === userId && !f.archived && (!spaceId || f.spaceId === spaceId)
  );
}

export function membersOf(spaceId: string): Array<Member & { user?: User }> {
  return db.members
    .filter((m) => m.spaceId === spaceId)
    .map((m) => ({ ...m, user: getUser(m.userId) }));
}

export function getUser(userId: string): User | undefined {
  return db.users.find((u) => u.id === userId);
}

export function getSpace(spaceId: string): Space | undefined {
  return db.spaces.find((s) => s.id === spaceId);
}

export function topOf<T>(arr: T[], n: number): T[];
export function topOf(entry: Entry): import("@/lib/types").RankedCrop | null;
export function topOf<T>(
  arrOrEntry: T[] | Entry,
  n?: number
): T[] | import("@/lib/types").RankedCrop | null {
  if (Array.isArray(arrOrEntry)) return arrOrEntry.slice(0, n!);
  const entry = arrOrEntry as Entry;
  if (entry.result?.match?.length) return entry.result.match[0];
  if (entry.result?.current) return entry.result.current;
  return null;
}

/** The week stored with the field's latest ready assessment. No synthetic
 *  forecast: a field with no assessment yet has no week. */
export function weekFor(fieldId: string): WeekDay[] {
  return (
    db.entries
      .filter((e) => e.fieldId === fieldId && e.result?.week?.length)
      .sort((a, b) => b.observed_at - a.observed_at)[0]?.result?.week ?? []
  );
}

export function unreadCount(userId: string): number {
  return db.notifications.filter((n) => n.userId === userId && !n.read).length;
}

/* Geometry utilities for thumbnail generation. */
const MLAT = 111320;

export function polyThumb(poly: [number, number][], fill = "#C6F135", stroke = "#C6F135"): string {
  const w = 200;
  const hh = 200;
  const lats = poly.map((p) => p[0]);
  const lngs = poly.map((p) => p[1]);
  const a = Math.min(...lats);
  const b = Math.max(...lats);
  const l = Math.min(...lngs);
  const r = Math.max(...lngs);
  const kx = Math.cos(((a + b) / 2) * (Math.PI / 180));
  const sx = Math.max((r - l) * kx, 1e-6);
  const sy = Math.max(b - a, 1e-6);
  const pad = 0.14;
  const sc = Math.min((w * (1 - 2 * pad)) / sx, (hh * (1 - 2 * pad)) / sy);
  const ox = (w - sx * sc) / 2;
  const oy = (hh - sy * sc) / 2;
  const d =
    poly
      .map((p, i) => {
        const x = ox + (p[1] - l) * kx * sc;
        const y = oy + (b - p[0]) * sc;
        return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      })
      .join(" ") + " Z";
  const THUMB_GROUND = "#17201b";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hh}"><rect width="${w}" height="${hh}" fill="${THUMB_GROUND}"/><path d="${d}" fill="${fill}" fill-opacity="0.38" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export function calculateArea(poly: [number, number][]): number {
  const k =
    Math.cos(
      (poly.reduce((sum, p) => sum + p[0], 0) / poly.length) * (Math.PI / 180)
    ) * MLAT;
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [y1, x1] = poly[i];
    const [y2, x2] = poly[(i + 1) % poly.length];
    a += x1 * k * y2 * MLAT - x2 * k * y1 * MLAT;
  }
  return Math.abs(a) / 2 / 1e4;
}

export function calculateCentroid(poly: [number, number][]): [number, number] {
  const latSum = poly.reduce((sum, p) => sum + p[0], 0);
  const lngSum = poly.reduce((sum, p) => sum + p[1], 0);
  return [latSum / poly.length, lngSum / poly.length];
}
