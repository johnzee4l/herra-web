/* Environment profile from the corrected Herra Environment Grid.

   The full 13-plane binary grid is 72 MB uncompressed, so the web tier ships
   a compact, representative extract: every GAEZ sample cell used to train the
   champion model (5,753 locations x 13 features, Float32). For a field we
   aggregate the sample cells whose centres fall inside its polygon (capped
   at 400), or fall back to the nearest sample cell at the centroid.

   Every value is a real grid value. Missing SoilGrids cells stay null; the
   model handles them natively. */

import type { Field } from "@/lib/types";
import type { Profile, LayerStatus } from "@/lib/hi";
import { hashStr } from "@/lib/utils";
import {
  GRID_SAMPLE_COUNT,
  GRID_SAMPLE_EXTENT,
  GRID_SAMPLE_FEATURES,
  GRID_SAMPLE_GRID_HASH,
  GRID_SAMPLE_RESOLUTION_DEG,
  GRID_SAMPLE_SCHEMA_HASH,
  GRID_SAMPLES_B64,
} from "@/lib/env/grid-samples";

const STRIDE = 15;
const MAX_CELLS = 400;

let decoded: Float32Array | null = null;

/** Decode the base64 Float32 sample block once per instance. */
function samples(): Float32Array {
  if (decoded) return decoded;
  const binary = atob(GRID_SAMPLES_B64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  decoded = new Float32Array(bytes.buffer);
  return decoded;
}

function inGrid(lat: number, lng: number) {
  return (
    lat >= GRID_SAMPLE_EXTENT.lat_min &&
    lat <= GRID_SAMPLE_EXTENT.lat_max &&
    lng >= GRID_SAMPLE_EXTENT.lon_min &&
    lng <= GRID_SAMPLE_EXTENT.lon_max
  );
}

/** Ray casting on [lat, lng] rings. */
function pointInPolygon(lat: number, lng: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function nearestSample(lat: number, lng: number) {
  const data = samples();
  const kx = Math.cos((lat * Math.PI) / 180);
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < GRID_SAMPLE_COUNT; i++) {
    const o = i * STRIDE;
    const dLat = data[o] - lat;
    const dLng = (data[o + 1] - lng) * kx;
    const d = dLat * dLat + dLng * dLng;
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return { offset: best, distanceKm: Math.sqrt(bestD) * 111.32 };
}

function cellValues(data: Float32Array, offset: number): (number | null)[] {
  const values: (number | null)[] = [];
  for (let f = 0; f < GRID_SAMPLE_FEATURES.length; f++) {
    const v = data[offset + 2 + f];
    values.push(Number.isFinite(v) ? v : null);
  }
  return values;
}

function meanValues(rows: (number | null)[][]): (number | null)[] {
  return GRID_SAMPLE_FEATURES.map((_, f) => {
    let total = 0;
    let count = 0;
    for (const row of rows) {
      const v = row[f];
      if (v !== null) {
        total += v;
        count++;
      }
    }
    return count ? total / count : null;
  });
}

function layerStatus(present: number, total: number): LayerStatus {
  if (present === total) return "ok";
  if (present === 0) return "failed";
  return "partial";
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Build the environmental profile for a field from grid samples.
 *
 * Blueprint 9.1: aggregate cells inside the polygon (capped at 400), with the
 * centroid cell as fallback; mean of non-null values; null out-of-grid.
 */
export function buildProfile(field: Field): Profile {
  const [lat, lng] = field.centroid;
  const data = samples();

  const covered = inGrid(lat, lng);
  let values: (number | null)[] = GRID_SAMPLE_FEATURES.map(() => null);
  let used = 0;
  let distanceKm = 0;
  let heterogeneity = 0;

  if (covered) {
    const inside: number[] = [];
    for (let i = 0; i < GRID_SAMPLE_COUNT; i++) {
      const o = i * STRIDE;
      if (pointInPolygon(data[o], data[o + 1], field.geom)) inside.push(o);
    }

    if (inside.length) {
      const step = Math.max(1, Math.ceil(inside.length / MAX_CELLS));
      const chosen = inside.filter((_, i) => i % step === 0).slice(0, MAX_CELLS);
      values = meanValues(chosen.map((o) => cellValues(data, o)));
      used = chosen.length;

      // Heterogeneity across the field, from real sample spread.
      if (chosen.length > 1) {
        const rows = chosen.map((o) => cellValues(data, o));
        const spread = (f: number) => {
          const xs = rows.map((r) => r[f]).filter((v): v is number => v !== null);
          if (xs.length < 2) return 0;
          const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
          const sd = Math.sqrt(
            xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length
          );
          return sd;
        };
        heterogeneity = clamp(
          spread(ModelFeatureIndex.soil_ph) / 2 +
            spread(ModelFeatureIndex.terrain_slope) / 20,
          0.02,
          0.9
        );
      } else {
        heterogeneity = 0.05;
      }
    } else {
      const near = nearestSample(lat, lng);
      values = cellValues(data, near.offset);
      distanceKm = near.distanceKm;
      used = 1;
      heterogeneity = 0.12;
    }
  } else {
    heterogeneity = 0;
  }

  const soil = values.slice(0, 5);
  const terrain = values.slice(5, 7);
  const climate = values.slice(7, 13);

  const present = (xs: (number | null)[]) => xs.filter((v) => v !== null).length;

  const ph = soil[0];
  const clay = soil[1];
  const sand = soil[2];
  const soc = soil[3];
  const cec = soil[4];
  const elev = terrain[0];
  const slope = terrain[1];

  // Drainage and salinity are not model features. They are derived for the
  // readiness/health copy only, from real slope and clay.
  const drain = Math.round(
    clamp(3 + (slope ?? 8) / 30 - ((clay ?? 35) - 30) / 22, 1, 5)
  );
  const ece = +clamp(0.15 + (clay ?? 30) / 110, 0.1, 2.4).toFixed(1);

  const soilStatus = layerStatus(present(soil), 5);
  const terrainStatus = layerStatus(present(terrain), 2);
  const climateStatus = layerStatus(present(climate), 6);

  // Spatial support: 1 when the polygon contains sample cells. A nearest-cell
  // fallback decays with distance (60 km ≈ atypical). Outside the grid there
  // is no support at all.
  const ood = !covered
    ? 0
    : used && !distanceKm
    ? 1
    : clamp(1 - distanceKm / 60, 0.2, 0.95);

  return {
    soil: {
      ph,
      clay,
      sand,
      soc,
      cec,
      drain,
      ece,
      hetero: +heterogeneity.toFixed(2),
    },
    climate: {
      tmean: climate[4],
      precip: climate[0],
      precip_cv: climate[1],
      dry_months: climate[2],
      temp_warm: climate[3],
      temp_cool: climate[5],
    },
    terrain: { elev, slope },
    q: {
      soil: soilStatus,
      climate: climateStatus,
      terrain: terrainStatus,
      weather: "ok",
    },
    ood,
    lat,
    lng,
    grid_cells: used,
    grid_distance_km: +distanceKm.toFixed(1),
  };
}

/** Stable profile ID from feature values + schema hash (blueprint 9.1). */
export function generateProfileId(profile: Profile): string {
  const payload = JSON.stringify([
    profile.soil,
    profile.climate,
    profile.terrain,
    GRID_SAMPLE_SCHEMA_HASH,
  ]);
  return "p_" + hashStr(payload).toString(16);
}

/** Decode the sample block once per instance (used by data-health checks). */
export function loadGrid(): void {
  samples();
}

export function getGridManifest(): Record<string, any> {
  return {
    sources: ["SoilGrids 2.0", "AWS Terrain Tiles", "WorldClim 2.1"],
    grid_hash: GRID_SAMPLE_GRID_HASH,
    feature_schema_hash: GRID_SAMPLE_SCHEMA_HASH,
    coverage: "Philippines · 5,753 GAEZ sample cells",
    resolution: `${GRID_SAMPLE_RESOLUTION_DEG}° (~1 km)`,
    last_updated: "2026-11-07",
  };
}

/** Feature indices in the sample record (kept in sync with grid-samples.ts). */
const ModelFeatureIndex = {
  soil_ph: 0,
  soil_clay: 1,
  soil_sand: 2,
  soil_soc: 3,
  soil_cec: 4,
  terrain_elev: 5,
  terrain_slope: 6,
  clim_precip_annual: 7,
  clim_precip_cv: 8,
  clim_dry_months: 9,
  clim_temp_mean: 10,
  clim_temp_warm: 11,
  clim_temp_cool: 12,
} as const;
