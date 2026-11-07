/* Assessment orchestration (blueprint 9.2).

   In the product this is one server action: validate, build the profile and
   forecast, assemble the payload, call assess(), store the row. Here it runs
   in the browser against the demo store, but the steps and the stored shape
   are the same, so moving it server-side is a transport change.

   The result is mapped from the lib/hi response contract into the UI's
   EntryResult shape. Raw codes are never surfaced (blueprint 11.1). */

import { assess, type HiResponse } from "@/lib/hi";
import { forecastFor, profileFor } from "@/lib/env/profile";
import { CROPS } from "@/lib/spec/crops";
import type {
  Advisory,
  DataQuality,
  Entry,
  EntryResult,
  Field,
  HealthResult,
  RankedCrop,
  Reliability,
} from "@/lib/types";
import { uid } from "@/lib/utils";

/** Health weights. Admin-editable in the product; defaults from ML blueprint 14.7. */
export const HEALTH_WEIGHTS = { fit: 0.45, water: 0.25, thermal: 0.15, soil: 0.15 };

function toReliability(r: HiResponse["reliability"]): Reliability {
  return {
    tier: r.tier,
    score: r.components.confidence,
    comps: {
      completeness: r.components.completeness,
      input_quality: r.components.input_quality,
      feature_support: r.components.feature_support,
      confidence: r.components.confidence,
    },
  };
}

function toRanked(c: HiResponse["match"][number]): RankedCrop {
  return {
    crop: c.crop,
    class: c.suitability_class,
    match_pct: c.match_pct,
    up: c.explanations.up.map((r) => ({ feature: r.var, label: r.text, value: r.impact })),
    down: c.explanations.down.map((r) => ({ feature: r.var, label: r.text, value: r.impact })),
    warnings: c.blockers.map((b) => b.text),
  };
}

function toDataQuality(d: HiResponse["data_quality"]): DataQuality[] {
  return d.map((x) => ({
    layer: x.layer,
    status: x.status,
    source: x.source,
    kind: x.kind,
    fetched_at: x.fetched_at,
    note: x.note,
    flags: x.flags,
  }));
}

function toAdvisories(a: HiResponse["advisories"]): Advisory[] {
  return a.map((x) => ({ severity: x.severity, icon: x.icon, text: x.text, kind: x.kind }));
}

const LAYER_WARNING: Record<string, string> = {
  soil: "Soil data is incomplete for this cell.",
  climate: "Climate normals are incomplete for this cell.",
  terrain: "Terrain data is incomplete for this cell.",
  weather: "The weather forecast is unavailable; readiness is hidden.",
};

function toWarnings(res: HiResponse): string[] {
  const out: string[] = [];
  for (const layer of res.missing ?? []) {
    if (LAYER_WARNING[layer]) out.push(LAYER_WARNING[layer]);
  }
  if (res.flags.includes("moisture_mismatch")) {
    out.push("Your moisture reading differs from modeled soil moisture; we kept your value.");
  }
  return out;
}

export interface RunInput {
  field: Field;
  mode: "recommend" | "checkup";
  moisture: number;
  currentCrop?: string;
  photo: Entry["photo"];
  outsideGrid?: boolean;
}

/** Run one assessment and return the entry ready to store. */
export async function runAssessment(input: RunInput): Promise<Entry> {
  const { field, mode, moisture, currentCrop, photo } = input;
  const observed_at = Date.now();
  const profile = await profileFor(field);
  const week = await forecastFor(field);

  const res = assess({
    mode,
    profile,
    week,
    moisture,
    current_crop: currentCrop,
    observed_at,
    weights: HEALTH_WEIGHTS,
  });

  const result: EntryResult = {
    status: res.status === "failed" ? "failed" : res.status,
    reliability: toReliability(res.reliability),
    data_quality: toDataQuality(res.data_quality),
    flags: res.flags,
    warnings: toWarnings(res),
    week: res.week,
    advisories: toAdvisories(res.advisories),
  };

  if (res.status !== "abstained" && res.status !== "failed") {
    if (mode === "recommend") {
      result.match = res.match.map(toRanked);
    } else {
      const h = res.health!;
      const health: HealthResult = {
        index: h.index,
        band: h.band,
        drivers: [
          { key: "fit", label: "Fit", value: h.fit },
          { key: "water", label: "Water", value: h.water },
          { key: "thermal", label: "Thermal", value: h.thermal },
          { key: "soil", label: "Soil", value: h.soil },
        ],
        consider_instead: res.consider
          ? {
              crop: res.consider.crop,
              index: Math.min(100, h.fit + res.consider.gain),
              reason: `${CROPS[res.consider.crop].name} scores ${res.consider.gain} points higher on this field's profile.`,
            }
          : undefined,
      };
      result.health = health;
      result.current = res.current ? toRanked(res.current) : undefined;
    }
  }

  return {
    id: uid("e"),
    fieldId: field.id,
    spaceId: field.spaceId,
    authorId: field.ownerId,
    kind: mode,
    status: res.status === "failed" ? "failed" : "ready",
    observed_at,
    moisture,
    currentCrop: mode === "checkup" ? currentCrop : undefined,
    photo,
    result,
  };
}
