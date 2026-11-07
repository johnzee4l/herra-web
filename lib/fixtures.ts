/* Fixture data and helper functions for development
   This bridges the frontend to the real Supabase backend */

import type { User, Space, Member, Field, Entry, WeekDay } from "@/lib/types";

// Mock current user (will be replaced with real auth)
export const ME: User = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Test Farmer",
  email: "farmer@example.com",
  role: "farmer",
  status: "active",
  active: Date.now(),
  joined: Date.now() - 30 * 24 * 60 * 60 * 1000,
};

// Mock users
export const USERS: User[] = [
  ME,
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    status: "active",
    active: Date.now(),
    joined: Date.now() - 60 * 24 * 60 * 60 * 1000,
  },
];

// Mock spaces
export const SPACES: Space[] = [
  {
    id: "space-1",
    name: "Demo Cooperative",
    desc: "A sample cooperative space for testing",
    center: [14.5995, 120.9842] as [number, number],
    boundary: [
      [14.5995, 120.9842],
      [14.6095, 120.9842],
      [14.6095, 120.9942],
      [14.5995, 120.9942],
    ] as [number, number][],
    place: { municipality: "Manila", province: "Metro Manila" },
    status: "ok",
    crop_focus: ["rice", "maize", "cabbage"],
  },
];

// Mock members
export const MEMBERS: Member[] = [
  {
    spaceId: "space-1",
    userId: ME.id,
    joinedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
  },
];

// Mock fields
export const FIELDS: Field[] = [
  {
    id: "field-1",
    spaceId: "space-1",
    ownerId: ME.id,
    name: "Demo Field",
    geom: [
      [14.5995, 120.9842],
      [14.6005, 120.9842],
      [14.6005, 120.9852],
      [14.5995, 120.9852],
    ] as [number, number][],
    area: 1.2,
    centroid: [14.6, 120.985] as [number, number],
    place: { municipality: "Manila", province: "Metro Manila" },
    current_crop: "rice",
    archived: false,
    thumb: "",
  },
];

// Mock entries
export const ENTRIES: Entry[] = [];

/* Helper functions */

export function mySpaces(userId: string): Space[] {
  const memberSpaceIds = MEMBERS.filter(m => m.userId === userId).map(m => m.spaceId);
  return SPACES.filter(s => memberSpaceIds.includes(s.id));
}

export function myFields(userId: string, spaceId?: string): Field[] {
  // Will be implemented with real data
  return [];
}

export function membersOf(spaceId: string): Array<Member & { user?: User }> {
  return MEMBERS.filter(m => m.spaceId === spaceId).map(m => ({
    ...m,
    user: getUser(m.userId),
  }));
}

export function getUser(userId: string): User | undefined {
  return USERS.find(u => u.id === userId);
}

export function getSpace(spaceId: string): Space | undefined {
  return SPACES.find(s => s.id === spaceId);
}

export function topOf<T>(arr: T[], n: number): T[];
export function topOf(entry: Entry): import("@/lib/types").RankedCrop | null;
export function topOf<T>(arrOrEntry: T[] | Entry, n?: number): T[] | import("@/lib/types").RankedCrop | null {
  if (Array.isArray(arrOrEntry)) {
    return arrOrEntry.slice(0, n!);
  }
  // Get top crop from entry
  const entry = arrOrEntry as Entry;
  if (entry.result?.match && entry.result.match.length > 0) {
    return entry.result.match[0];
  }
  if (entry.result?.current) {
    return entry.result.current;
  }
  return null;
}

export function weekFor(fieldId: string): WeekDay[] {
  // Mock 7-day forecast
  const today = Date.now();
  return Array.from({ length: 7 }, (_, i) => ({
    ts: today + i * 24 * 60 * 60 * 1000,
    code: "partly" as const,
    hi: 32,
    lo: 24,
    pop: 30,
    rain: 2,
    wind: 15,
    et0: 4.5,
    workable: true,
    score: 0.8,
  }));
}

export function unreadCount(userId: string): number {
  // Will be implemented with real notifications
  return 0;
}

/* Geometry utilities for thumbnail generation */
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
  const k = Math.cos(poly.reduce((sum, p) => sum + p[0], 0) / poly.length * (Math.PI / 180)) * MLAT;
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [y1, x1] = poly[i];
    const [y2, x2] = poly[(i + 1) % poly.length];
    a += x1 * k * y2 * MLAT - x2 * k * y1 * MLAT;
  }
  return Math.abs(a) / 2 / 1e4; // hectares
}

export function calculateCentroid(poly: [number, number][]): [number, number] {
  const latSum = poly.reduce((sum, p) => sum + p[0], 0);
  const lngSum = poly.reduce((sum, p) => sum + p[1], 0);
  return [latSum / poly.length, lngSum / poly.length];
}
