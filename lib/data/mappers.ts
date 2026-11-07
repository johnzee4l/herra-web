/* Data mappers (Blueprint section 5)
   Convert Supabase rows to domain types */

import type {
  Announcement,
  Entry,
  Field,
  Member,
  Notification,
  Space,
  User,
  EntryResult,
  RankedCrop,
  HealthResult,
  Reliability,
  Advisory,
  DataQuality,
} from "@/lib/types";

export function toUser(row: any): User {
  return {
    id: row.id,
    name: row.display_name,
    email: row.email,
    role: row.role,
    settings: row.settings,
    status: "active",
    active: new Date(row.updated_at).getTime(),
    joined: new Date(row.created_at).getTime(),
  };
}

export function toSpace(row: any): Space {
  // Parse GeoJSON boundary
  const boundaryGeoJson = typeof row.boundary_geojson === "string" 
    ? JSON.parse(row.boundary_geojson) 
    : row.boundary_geojson;
  
  const coords = boundaryGeoJson.coordinates[0].map(([lng, lat]: number[]) => 
    [lat, lng] as [number, number]
  );

  // Calculate center from boundary
  const lats = coords.map((c: [number, number]) => c[0]);
  const lngs = coords.map((c: [number, number]) => c[1]);
  const center: [number, number] = [
    lats.reduce((a: number, b: number) => a + b, 0) / lats.length,
    lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length,
  ];

  return {
    id: row.id,
    name: row.name,
    desc: row.description || "",
    center,
    boundary: coords,
    place: row.place || { municipality: "", province: "" },
    status: row.status,
    crop_focus: row.crop_focus || [],
  };
}

export function toMember(row: any): Member {
  return {
    spaceId: row.space_id,
    userId: row.user_id,
    joinedAt: new Date(row.joined_at).getTime(),
  };
}

export function toField(row: any): Field {
  // Parse GeoJSON geometry
  const geomGeoJson = typeof row.geom_geojson === "string"
    ? JSON.parse(row.geom_geojson)
    : row.geom_geojson;
  
  const coords = geomGeoJson.coordinates[0].map(([lng, lat]: number[]) =>
    [lat, lng] as [number, number]
  );

  // Parse centroid if available
  let centroid: [number, number];
  if (row.centroid_geojson) {
    const centroidGeoJson = typeof row.centroid_geojson === "string"
      ? JSON.parse(row.centroid_geojson)
      : row.centroid_geojson;
    centroid = [centroidGeoJson.coordinates[1], centroidGeoJson.coordinates[0]];
  } else {
    // Calculate from coords
    const lats = coords.map((c: [number, number]) => c[0]);
    const lngs = coords.map((c: [number, number]) => c[1]);
    centroid = [
      lats.reduce((a: number, b: number) => a + b, 0) / lats.length,
      lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length,
    ];
  }

  return {
    id: row.id,
    spaceId: row.space_id,
    ownerId: row.owner_id,
    name: row.name,
    geom: coords,
    area: parseFloat(row.area_ha),
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
  // Map response to EntryResult
  let result: EntryResult | undefined;
  
  if (row.response) {
    const res = row.response;
    
    result = {
      status: row.status,
      reliability: {
        tier: res.reliability.tier,
        score: res.reliability.components.confidence,
        comps: {
          completeness: res.reliability.components.completeness,
          input_quality: res.reliability.components.input_quality,
          feature_support: res.reliability.components.feature_support,
          confidence: res.reliability.components.confidence,
        },
      },
      data_quality: res.data_quality.map((d: any) => ({
        layer: d.layer,
        status: d.status,
        source: d.source,
        kind: d.kind,
        fetched_at: d.fetched_at,
        note: d.note,
        flags: d.flags,
      })),
      flags: res.flags || [],
      warnings: warningsFromResponse(res),
      week: res.week,
      advisories: res.advisories.map((a: any) => ({
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
          consider_instead: res.consider ? {
            crop: res.consider.crop,
            index: res.health.index + res.consider.gain,
            reason: `Would score ${res.consider.gain} points higher`,
          } : undefined,
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
    status: row.status === "failed" ? "failed" : "ready",
    observed_at: new Date(row.created_at).getTime(),
    moisture: row.moisture,
    currentCrop: row.current_crop,
    photo: row.photo_path ? { url: row.photo_path } : { url: "" },
    result,
    rerun_of: row.rerun_of,
  };
}

function toRankedCrop(c: any): RankedCrop {
  return {
    crop: c.crop,
    class: c.suitability_class,
    match_pct: c.match_pct,
    up: c.explanations.up.map((r: any) => ({
      feature: r.var,
      label: r.text,
      value: r.impact,
    })),
    down: c.explanations.down.map((r: any) => ({
      feature: r.var,
      label: r.text,
      value: r.impact,
    })),
    warnings: c.blockers.map((b: any) => b.text),
  };
}

export function toNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title_key,
    body: row.params?.body || "",
    route: row.route || "",
    read: !!row.read_at,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function toAnnouncement(row: any): Announcement {
  return {
    id: row.id,
    spaceId: row.space_id,
    title: row.title,
    body: row.body,
    by: row.created_by,
    created: new Date(row.created_at).getTime(),
  };
}
