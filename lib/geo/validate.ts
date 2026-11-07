/* Geometry helpers (blueprint section 8). Turf is used where it is already a
   dependency; the small predicates are local so the validation rules are
   readable in one place.

   The database is the authority (blueprint 5.1). This module exists so the
   client can give feedback before the server ever sees the polygon. */

export type Pt = [number, number]; // [lat, lng]

const MLAT = 111320;
const R = 6378137;

export function polyAreaHa(pts: Pt[]) {
  if (pts.length < 3) return 0;
  // Spherical excess, adequate at field scale.
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [y1, x1] = pts[i];
    const [y2, x2] = pts[(i + 1) % pts.length];
    a +=
      ((x2 - x1) * Math.PI) / 180 *
      (2 + Math.sin((y1 * Math.PI) / 180) + Math.sin((y2 * Math.PI) / 180));
  }
  return Math.abs((a * R * R) / 2) / 1e4;
}

export function perimM(pts: Pt[]) {
  let d = 0;
  for (let i = 0; i < pts.length; i++) {
    const [y1, x1] = pts[i];
    const [y2, x2] = pts[(i + 1) % pts.length];
    const dy = (y2 - y1) * MLAT;
    const dx = (x2 - x1) * MLAT * Math.cos((((y1 + y2) / 2) * Math.PI) / 180);
    d += Math.hypot(dx, dy);
  }
  return d;
}

export function centroidOf(pts: Pt[]): Pt {
  const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [lat, lng];
}

/* Segment intersection, used to reject crossing edges. */
function segInt(a: Pt, b: Pt, c: Pt, d: Pt) {
  const o = (p: Pt, q: Pt, r: Pt) => {
    const v = (q[1] - p[1]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[1] - p[1]);
    return Math.abs(v) < 1e-12 ? 0 : v > 0 ? 1 : 2;
  };
  const onSeg = (p: Pt, q: Pt, r: Pt) =>
    q[1] <= Math.max(p[1], r[1]) &&
    q[1] >= Math.min(p[1], r[1]) &&
    q[0] <= Math.max(p[0], r[0]) &&
    q[0] >= Math.min(p[0], r[0]);

  const o1 = o(a, b, c);
  const o2 = o(a, b, d);
  const o3 = o(c, d, a);
  const o4 = o(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSeg(a, c, b)) return true;
  if (o2 === 0 && onSeg(a, d, b)) return true;
  if (o3 === 0 && onSeg(c, a, d)) return true;
  if (o4 === 0 && onSeg(c, b, d)) return true;
  return false;
}

export function selfX(pts: Pt[]) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (i === j) continue;
      if ((i + 1) % n === j || (j + 1) % n === i) continue;
      if (segInt(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return true;
    }
  }
  return false;
}

/* Point in polygon, ray casting. */
export function pip(p: Pt, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if (yi > p[0] !== yj > p[0] && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export interface Measure {
  pts: Pt[];
  areaHa: number;
  perim: number;
  centroid: Pt | null;
  ok: boolean;
  reason: string;
  live?: boolean;
}

/** The drawing rules from blueprint section 8, in one place. */
export function validatePoly(
  pts: Pt[],
  bound: Pt[] | undefined,
  kind: "field" | "space" = "field",
  bname?: string
): Measure {
  const n = pts.length;
  const areaHa = n >= 3 ? polyAreaHa(pts) : 0;
  const perim = n >= 3 ? perimM(pts) : 0;
  const o: Measure = {
    pts,
    areaHa,
    perim,
    centroid: n ? centroidOf(pts) : null,
    ok: true,
    reason: "",
  };

  if (n < 3) {
    o.ok = false;
    o.reason = "Add at least 3 corners";
    return o;
  }
  if (selfX(pts)) {
    o.ok = false;
    o.reason = "Edges cross each other — drag a corner to fix";
    return o;
  }
  const min = kind === "space" ? 2 : 0.03;
  if (areaHa < min) {
    o.ok = false;
    o.reason = kind === "space" ? "Space must be at least 2 ha" : "Too small — minimum 0.03 ha";
    return o;
  }
  if (kind === "field" && areaHa > 500) {
    o.ok = false;
    o.reason = "Too large — maximum 500 ha";
    return o;
  }
  if (bound) {
    let inside = pts.every((p) => pip(p, bound));
    if (inside) {
      for (let i = 0; i < n && inside; i++) {
        for (let j = 0; j < bound.length; j++) {
          if (segInt(pts[i], pts[(i + 1) % n], bound[j], bound[(j + 1) % bound.length])) {
            inside = false;
            break;
          }
        }
      }
    }
    if (!inside) {
      o.ok = false;
      o.reason = "Outside the " + (bname || "space") + " boundary";
      return o;
    }
  }
  return o;
}

/* Tile styles. Free, no key, attribution always visible (blueprint 3.1). */
export const TILES = {
  light: [
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    "© OpenStreetMap contributors © CARTO",
  ],
  dark: [
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    "© OpenStreetMap contributors © CARTO",
  ],
  sat: [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    "Esri, Maxar, Earthstar Geographics",
  ],
} as const;

export type MapStyle = keyof typeof TILES;

export const mapColors = (st: MapStyle) =>
  st === "light" ? { pri: "#5F7C10", fld: "#101612" } : { pri: "#C6F135", fld: "#FFFFFF" };
