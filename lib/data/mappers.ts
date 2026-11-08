/* Data mappers (Blueprint section 5)
   Convert Supabase rows to domain types. Rows may be partial: the mapper never
   invents a value for a missing column. */

import type {
  Announcement,
  Entry,
  EntryResult,
  EntryStatus,
  Field,
  Member,
  Notification,
  Space,
  User,
} from "@/lib/types";
import { normalizeSettings } from "@/lib/types";

export function toUser(row: any): User {
  return {
    id: row.id,
    name: row.display_name ?? "",
    email: row.email ?? "",
    role: row.role ?? "farmer",
    settings: normalizeSettings(row.settings),
    status: row.status ?? "active",
    active: row.updated_at ? Date.parse(row.updated_at) : undefined,
    joined: row.created_at ? Date.parse(row.created_at) : undefined,
  };
}

function ringFromGeoJson(value: unknown): [number, number][] {
  if (!value) return [];
  const geo = typeof value === "string" ? JSON.parse(value) : value;
  const ring = geo?.coordinates?.[0];
  if (!Array.isArray(ring)) return [];
  return ring.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
}

export function toSpace(row: any): Space {
  const boundary = ringFromGeoJson(row.boundary_geojson);
  const center: [number, number] = boundary.length
    ? [
        boundary.reduce((a, p) => a + p[0], 0) / boundary.length,
        boundary.reduce((a, p) => a + p[1], 0) / boundary.length,
      ]
    : [0, 0];

  return {
    id: row.id,
    name: row.name,
    desc: row.description || "",
    center,
    boundary,
    place: row.place || { municipality: "", province: "" },
    status: row.status === "attention" ? "attention" : "ok",
    crop_focus: row.crop_focus || [],
  };
}

export function toMember(row: any): Member {
  return {
    spaceId: row.space_id,
    userId: row.user_id,
    joinedAt: Date.parse(row.joined_at) || 0,
  };
}

export function toField(row: any): Field {
  const geom = ringFromGeoJson(row.geom_geojson);
  const centroidGeo = row.centroid_geojson
    ? typeof row.centroid_geojson === "string"
      ? JSON.parse(row.centroid_geojson)
      : row.centroid_geojson
    : null;
  const centroid: [number, number] = centroidGeo?.coordinates
    ? [centroidGeo.coordinates[1], centroidGeo.coordinates[0]]
    : geom.length
    ? [
        geom.reduce((a, p) => a + p[0], 0) / geom.length,
        geom.reduce((a, p) => a + p[1], 0) / geom.length,
      ]
    : [0, 0];

  return {
    id: row.id,
    spaceId: row.space_id,
    ownerId: row.owner_id,
    name: row.name,
    geom,
    area: Number(row.area_ha ?? 0),
    centroid,
    place: row.place || { municipality: "", province: "" },
    current_crop: row.current_crop || "",
    archived: !!row.archived_at,
    thumb: row.thumb || "",
  };
}

const LAYER_WARNING: Record<string, string> = {
  soil: "Soil data is incomplete for this cell.",
  climate: "Climate normals are incomplete for this cell.",
  terrain: "Terrain data is incomplete for this cell.",
  weather: "The weather forecast is unavailable; readiness is hidden.",
};

function warningsFromResponse(res: any): string[] {
  const out: string[] = [];
  for (const layer of res.missing || []) {
    if (LAYER_WARNING[layer]) out.push(LAYER_WARNING[layer]);
  }
  if ((res.flags || []).includes("moisture_mismatch")) {
    out.push("The farmer's moisture reading differs from modeled soil moisture.");
  }
  return out;
}

export function toEntry(row: any): Entry {
  let result: EntryResult | undefined;

  if (row.response) {
    const res = row.response;
    const components = res.reliability?.components ?? {};
    result = {
      status: row.status,
      reliability: {
        tier: res.reliability?.tier ?? "low",
        score: components.confidence ?? 0,
        comps: {
          completeness: components.completeness ?? 0,
          input_quality: components.input_quality ?? 0,
          feature_support: components.feature_support ?? "atypical",
          confidence: components.confidence ?? 0,
        },
      },
      data_quality: (res.data_quality ?? []).map((d: any) => ({
        layer: d.layer,
        status: d.status,
        source: d.source,
        kind: d.kind,
        fetched_at: d.fetched_at,
        note: d.note,
        flags: d.flags ?? [],
      })),
      flags: res.flags ?? [],
      warnings: warningsFromResponse(res),
      week: res.week ?? [],
      advisories: (res.advisories ?? []).map((a: any) => ({
        severity: a.severity,
        icon: a.icon,
        text: a.text,
        kind: a.kind,
      })),
    };

    if (row.mode === "recommend" && res.match) {
      result.match = res.match.map((c: any) => toRankedCrop(c));
    } else if (row.mode === "checkup" && res.current) {
      result.current = toRankedCrop(res.current);
      if (res.health) {
        result.health = {
          index: res.health.index,
          band: res.health.band,
          drivers: [
            { key: "fit", label: "Fit", value: res.health.fit },
            { key: "water", label: "Water", value: res.health.water },
            { key: "thermal", label: "Thermal", value: res.health.thermal },
            { key: "soil", label: "Soil", value: res.health.soil },
          ],
          consider_instead: res.consider
            ? {
                crop: res.consider.crop,
                index: res.health.index + res.consider.gain,
                reason: `Would score ${res.consider.gain} points higher`,
              }
            : undefined,
        };
      }
    }
  }

  return {
    id: row.id,
    fieldId: row.field_id,
    spaceId: row.space_id || "",
    authorId: row.user_id,
    kind: row.mode,
    status: row.status as EntryStatus,
    observed_at: Date.parse(row.created_at) || 0,
    moisture: row.moisture,
    currentCrop: row.current_crop ?? undefined,
    photo: row.photo_path ? { url: row.photo_path } : { url: "" },
    result,
    rerun_of: row.rerun_of ?? undefined,
  };
}

function toRankedCrop(c: any): import("@/lib/types").RankedCrop {
  const explain = c.explanations ?? { up: [], down: [] };
  return {
    crop: c.crop,
    class: c.suitability_class,
    match_pct: c.match_pct,
    up: (explain.up ?? []).map((r: any) => ({
      feature: r.var,
      label: r.text,
      value: r.impact,
    })),
    down: (explain.down ?? []).map((r: any) => ({
      feature: r.var,
      label: r.text,
      value: r.impact,
    })),
    warnings: (c.blockers ?? []).map((b: any) => b.text),
  };
}

export function toNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.params?.title ?? row.title_key,
    body: row.params?.body ?? "",
    route: row.route || "",
    read: !!row.read_at,
    createdAt: Date.parse(row.created_at) || 0,
  };
}

export function toAnnouncement(row: any): Announcement {
  return {
    id: row.id,
    spaceId: row.space_id,
    title: row.title,
    body: row.body,
    by: row.created_by ?? "",
    created: Date.parse(row.created_at) || 0,
  };
}
