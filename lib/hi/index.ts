/* lib/hi — the model module.

   Blueprint section 10: server code imports assess(), readiness(), crops and
   modelInfo from here. This build evaluates the real champion model
   (hi-xgb-20261107-1ea55688) in-process from its compact tree export.

   The response shape is the contract and does not change. Suitability,
   class probabilities, confidence and reliability now come from the trained
   model. Reliability is rule-based over data completeness, input quality,
   training-data typicality and raw model confidence — never an accuracy
   estimate. */

import { CROPS, CROP_IDS } from "@/lib/spec/crops";
import {
  MODEL,
  MODEL_ID,
  MODEL_INFO,
  SUPPORT,
  expectedSuitability,
  featureSupport,
  isModelledCrop,
  predict,
  topClass,
  type FeatureSupport,
  type ModelFeature,
  type ModelFeatures,
} from "@/lib/hi/model";
import type { Crop, SuitClass, WeekDay } from "@/lib/types";
import { GRID_SAMPLE_SCHEMA_HASH } from "@/lib/env/grid-samples";

/** Environment grid feature-schema hash (matches grid-samples.ts). */
const GRID_SCHEMA_HASH = GRID_SAMPLE_SCHEMA_HASH;

/* ---------- environment profile (blueprint 9.1) ---------- */

export interface SoilLayer {
  ph: number | null;
  clay: number | null;
  sand: number | null;
  soc: number | null;
  cec: number | null;
  drain: number;
  ece: number;
  hetero: number;
}

export interface ClimateLayer {
  tmean: number | null;
  precip: number | null;
  precip_cv: number | null;
  dry_months: number | null;
  temp_warm: number | null;
  temp_cool: number | null;
}

export interface TerrainLayer {
  elev: number | null;
  slope: number | null;
}

export type LayerStatus = "ok" | "fallback" | "partial" | "failed";

export interface Profile {
  soil: SoilLayer;
  climate: ClimateLayer;
  terrain: TerrainLayer;
  q: { soil: LayerStatus; climate: LayerStatus; terrain: LayerStatus; weather: LayerStatus };
  /** spatial support from the sample lookup, 0–1 */
  ood: number;
  lat: number;
  lng?: number;
  grid_cells?: number;
  grid_distance_km?: number;
}

/* ---------- response contract (ML 14.4) ---------- */

export type HiStatus = "ok" | "degraded" | "abstained" | "failed";

export interface HiReliability {
  tier: "high" | "medium" | "low";
  components: {
    completeness: number;
    input_quality: number;
    feature_support: FeatureSupport;
    confidence: number;
  };
  validation_status: "not_validated";
  generalization: "holdout_evaluated";
}

export interface HiReason {
  group: string;
  text: string;
  impact: number;
  direction: "+" | "-";
  var: string;
}

export interface HiRankedCrop {
  crop: string;
  rank: number;
  match_pct: number;
  score: number;
  suitability_class: SuitClass;
  class_probabilities: Record<string, number>;
  confidence: number;
  suitability: number;
  readiness: number;
  blockers: HiReason[];
  explanations: { up: HiReason[]; down: HiReason[] };
  groups: Record<string, HiReason[]>;
  water_need: Crop["water"];
  season_fit: string;
  fit100: number;
}

export interface HiHealth {
  index: number;
  band: "Thriving" | "Steady" | "Watch" | "At risk";
  fit: number;
  water: number;
  thermal: number;
  soil: number;
}

export interface HiAdvisory {
  id: string;
  kind: string;
  severity: "info" | "warn" | "risk";
  text: string;
  impact: number;
  icon: string;
}

export interface HiDataQuality {
  layer: "soil" | "terrain" | "climate" | "weather";
  source: string;
  kind: "modeled" | "derived" | "reanalysis" | "forecast";
  status: LayerStatus;
  fetched_at: number;
  note: string;
  flags: string[];
}

export interface HiResponse {
  status: HiStatus;
  reliability: HiReliability;
  match: HiRankedCrop[];
  others?: HiRankedCrop[];
  current?: HiRankedCrop;
  top?: HiRankedCrop;
  health?: HiHealth;
  consider?: { crop: string; gain: number } | null;
  advisories: HiAdvisory[];
  week: WeekDay[];
  modeled: number;
  flags: string[];
  missing?: string[];
  data_quality: HiDataQuality[];
  model: { id: string; fsh: string; dsh: string };
}

export interface HiRequest {
  mode: "recommend" | "checkup";
  profile: Profile;
  week: WeekDay[];
  moisture: number;
  current_crop?: string;
  observed_at: number;
  weights: { fit: number; water: number; thermal: number; soil: number };
}

/* ---------- feature mapping ---------- */

/** Map the profile onto the 13 model planes. Nulls are preserved. */
export function modelFeatures(p: Profile): ModelFeatures {
  return {
    soil_ph: p.soil.ph,
    soil_clay: p.soil.clay,
    soil_sand: p.soil.sand,
    soil_soc: p.soil.soc,
    soil_cec: p.soil.cec,
    terrain_elev: p.terrain.elev,
    terrain_slope: p.terrain.slope,
    clim_precip_annual: p.climate.precip,
    clim_precip_cv: p.climate.precip_cv,
    clim_dry_months: p.climate.dry_months,
    clim_temp_mean: p.climate.tmean,
    clim_temp_warm: p.climate.temp_warm,
    clim_temp_cool: p.climate.temp_cool,
  };
}

const FEATURE_BOUNDS: Record<ModelFeature, [number, number]> = {
  soil_ph: [3, 10],
  soil_clay: [0, 100],
  soil_sand: [0, 100],
  soil_soc: [0, 600],
  soil_cec: [0, 200],
  terrain_elev: [-100, 3500],
  terrain_slope: [0, 200],
  clim_precip_annual: [0, 6000],
  clim_precip_cv: [0, 3],
  clim_dry_months: [0, 12],
  clim_temp_mean: [-10, 45],
  clim_temp_warm: [-10, 50],
  clim_temp_cool: [-20, 45],
};

const FEATURE_ORDER = MODEL.feature_order as ModelFeature[];

function profileStats(p: Profile) {
  const features = modelFeatures(p);
  let present = 0;
  let valid = 0;
  for (const name of FEATURE_ORDER) {
    const value = features[name];
    if (value === null || value === undefined || !Number.isFinite(value)) continue;
    present++;
    const [lo, hi] = FEATURE_BOUNDS[name];
    if (value >= lo && value <= hi) valid++;
  }
  return {
    features,
    present,
    completeness: present / FEATURE_ORDER.length,
    inputQuality: present ? valid / present : 0,
  };
}

/* ---------- scoring ---------- */

const CLASS_KEYS: SuitClass[] = ["S1", "S2", "S3", "S4", "NS"];
const CLASS_W: Record<SuitClass, number> = { S1: 1, S2: 0.75, S3: 0.5, S4: 0.25, NS: 0 };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** Weights used only to rank the narrative factors, never the model score. */
const WEIGHTS: Record<string, number> = {
  ph: 0.22,
  tmean: 0.25,
  rain: 0.25,
  clay: 0.16,
  slope: 0.12,
};

/** Trapezoid membership: 1 between the soft bounds, 0 outside the hard ones. */
function trap(v: number, b: [number, number, number, number]) {
  const [lo, slo, shi, hi] = b;
  if (v <= lo || v >= hi) return 0;
  if (v >= slo && v <= shi) return 1;
  if (v < slo) return (v - lo) / (slo - lo);
  return (hi - v) / (hi - shi);
}

interface BandEval {
  v: number;
  fit: number;
  band: [number, number];
  st: "in" | "low" | "high";
  missing: boolean;
}

function bandEval(p: Profile, crop: Crop): Record<string, BandEval> {
  const vals: Record<string, number | null> = {
    ph: p.soil.ph,
    tmean: p.climate.tmean,
    rain: p.climate.precip,
    drain: p.soil.drain,
    clay: p.soil.clay,
    slope: p.terrain.slope,
    ece: p.soil.ece,
  };
  const out: Record<string, BandEval> = {};
  for (const k of Object.keys(crop.b)) {
    const raw = vals[k];
    const b = crop.b[k as keyof typeof crop.b];
    if (raw === null || raw === undefined || !Number.isFinite(raw)) {
      out[k] = { v: NaN, fit: 0.06, band: [b[1], b[2]], st: "in", missing: true };
      continue;
    }
    const v = raw;
    let fit: number;
    if (k === "ece" || k === "slope") {
      fit = v <= b[2] ? 1 : clamp((b[3] - v) / (b[3] - b[2]), 0, 1);
    } else if (k === "drain") {
      fit =
        v >= b[1] && v <= b[2]
          ? 1
          : v < b[1]
          ? clamp(1 - (b[1] - v) * 0.45, 0, 1)
          : clamp(1 - (v - b[2]) * 0.6, 0, 1);
    } else {
      fit = trap(v, b);
    }
    fit = 0.06 + 0.94 * Math.pow(fit, 0.85);
    out[k] = {
      v,
      fit,
      band: [b[1], b[2]],
      st:
        k === "ece" || k === "slope"
          ? v <= b[2]
            ? "in"
            : "high"
          : v < b[1]
          ? "low"
          : v > b[2]
          ? "high"
          : "in",
      missing: false,
    };
  }
  return out;
}

function seasonFit(crop: Crop, month: number) {
  const m = crop.months;
  if (m.includes(month)) return { f: 1, l: "good" };
  if (m.includes((month % 12) + 1) || m.includes(((month + 10) % 12) + 1)) return { f: 0.94, l: "fair" };
  return { f: 0.82, l: "off" };
}

function relTier(
  comp: number,
  input: number,
  sup: FeatureSupport,
  conf: number,
  degraded: boolean
): HiReliability["tier"] {
  let tier: HiReliability["tier"] = "low";
  // ML 14.6: High needs every feature, clean inputs, typical support and
  // confidence 0.60+. Medium needs 80% completeness, support not atypical
  // and confidence 0.40+. Everything else is Low.
  if (comp >= 1 && input >= 1 && sup === "typical" && conf >= 0.6) tier = "high";
  else if (comp >= 0.8 && sup !== "atypical" && conf >= 0.4) tier = "medium";
  // Web blueprint 11.5: a degraded response is capped at Medium.
  if (degraded && tier === "high") tier = "medium";
  return tier;
}

/* ---------- conditions (readiness) ---------- */

function conditions(p: Profile, week: WeekDay[], moisture: number, crop: Crop) {
  const notes: { k: string; t: string; s: number }[] = [];
  let pen = 0;

  // No forecast means no readiness adjustment. The suitability score still
  // comes from the model; the response is marked degraded elsewhere.
  if (!week.length) {
    return {
      mod: 1,
      notes: [{ k: "weather", t: "The 7-day forecast is unavailable; readiness is not adjusted.", s: 0 }],
      rain7: 0,
      workable: 0,
    };
  }
  const rain7 = sum(week.map((d) => d.rain));
  const need = { low: [0, 45], moderate: [20, 85], high: [55, 160] }[crop.water];

  if (rain7 < need[0]) {
    const x = clamp(((need[0] - rain7) / need[0]) * 0.12, 0, 0.12);
    pen += x;
    notes.push({
      k: "water",
      t: `7-day rain ${rain7.toFixed(0)} mm is light for ${crop.name} (needs ${need[0]}+ mm) — plan irrigation.`,
      s: -x,
    });
  } else if (rain7 > need[1]) {
    const x = clamp(((rain7 - need[1]) / need[1]) * 0.1, 0, 0.1);
    pen += x;
    notes.push({
      k: "water",
      t: `${rain7.toFixed(0)} mm of rain expected — more than ${crop.name} likes (${need[1]} mm). Waterlogging risk.`,
      s: -x,
    });
  } else {
    notes.push({
      k: "water",
      t: `Forecast rain ${rain7.toFixed(0)} mm suits ${crop.name}'s water need (${crop.water}).`,
      s: 0.02,
    });
  }

  const md = Math.abs(moisture - crop.ideal);
  const mp = clamp(md * 0.035, 0, 0.08);
  pen += mp;
  notes.push({
    k: "moisture",
    t:
      md <= 0.8
        ? `Reported moisture is in ${crop.name}'s sweet spot.`
        : `Reported moisture is ${moisture < crop.ideal ? "drier" : "wetter"} than ${crop.name} prefers.`,
    s: md <= 0.8 ? 0.02 : -mp,
  });

  const hot = week.filter((d) => d.hi >= crop.heat - 2).length;
  const hp = Math.min(hot * 0.03, 0.09);
  pen += hp;
  if (hot)
    notes.push({
      k: "heat",
      t: `${hot} day${hot > 1 ? "s" : ""} near ${crop.name}'s heat threshold (${crop.heat}°C).`,
      s: -hp,
    });

  const wd = week.filter((d) => d.wind >= 34).length * crop.wind;
  const wp = Math.min(wd * 0.04, 0.08);
  pen += wp;
  if (wd)
    notes.push({
      k: "wind",
      t: `Strong gusts forecast on ${wd} day${wd > 1 ? "s" : ""}; ${crop.name} is wind-sensitive.`,
      s: -wp,
    });

  const wk = week.filter((d) => d.workable).length;
  if (wk < 3) {
    pen += 0.03;
    notes.push({ k: "window", t: `Only ${wk} workable day${wk === 1 ? "" : "s"} this week.`, s: -0.03 });
  }

  return { mod: +clamp(1 - pen, 0.7, 1).toFixed(3), notes, rain7, workable: wk };
}

/* ---------- explanations ---------- */

const VAR_META: Record<string, { g: string; l: string; u: string; d: number; bd: number }> = {
  ph: { g: "soil", l: "Soil pH", u: "", d: 1, bd: 1 },
  tmean: { g: "climate", l: "Mean temperature", u: " °C", d: 1, bd: 0 },
  rain: { g: "climate", l: "Rainfall", u: " mm", d: 0, bd: 0 },
  clay: { g: "soil", l: "Clay", u: "%", d: 0, bd: 0 },
  slope: { g: "terrain", l: "Slope", u: "%", d: 0, bd: 0 },
};

/** Format a value with thousands separators and fixed decimals. */
function fmtNum(v: number, d: number) {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

interface Scored {
  crop: string;
  rank: number;
  match_pct: number;
  score: number;
  cls: SuitClass;
  p: Record<string, number>;
  conf: number;
  suit: number;
  readiness: number;
  be: Record<string, BandEval>;
  sf: { l: string };
  cond: ReturnType<typeof conditions>;
}

function decorate(crop: Crop, c: Scored): HiRankedCrop {
  const reasons: HiReason[] = [];
  const blockers: HiReason[] = [];

  for (const k of Object.keys(c.be)) {
    if (!WEIGHTS[k]) continue;
    const b = c.be[k];
    const meta = VAR_META[k];
    if (!meta || b.missing) continue;
    const w = WEIGHTS[k];
    const value = `${meta.l} ${fmtNum(b.v, meta.d)}${meta.u}`;
    const range = `${fmtNum(b.band[0], meta.bd)}–${fmtNum(b.band[1], meta.bd)}${meta.u}`;
    if (b.st === "in") {
      const impact = +(w * (0.4 + 0.6 * b.fit)).toFixed(2);
      reasons.push({
        group: meta.g,
        text: `${value} — within ${range}`,
        impact,
        direction: "+",
        var: k,
      });
    } else {
      const dir = b.st === "low" ? "below" : "above";
      const impact = -(w * (1 - b.fit) * 1.1);
      blockers.push({
        group: meta.g,
        text: `${value} — ${dir} ${range}`,
        impact: +impact.toFixed(2),
        direction: "-",
        var: k,
      });
    }
  }

  c.cond.notes.forEach((n) =>
    reasons.push({
      group: n.k === "moisture" || n.k === "water" ? "moisture" : "climate",
      text: n.t,
      impact: +n.s.toFixed(2),
      direction: n.s >= 0 ? "+" : "-",
      var: n.k,
    })
  );

  const every = [...reasons, ...blockers];
  const groups: Record<string, HiReason[]> = {};
  every.forEach((r) => {
    (groups[r.group] = groups[r.group] || []).push(r);
  });

  return {
    crop: c.crop,
    rank: c.rank,
    match_pct: c.match_pct,
    score: c.score,
    suitability_class: c.cls,
    class_probabilities: c.p,
    confidence: c.conf,
    suitability: c.suit,
    readiness: c.readiness,
    blockers,
    explanations: {
      up: every.filter((r) => r.direction === "+").sort((a, b) => b.impact - a.impact).slice(0, 3),
      down: every.filter((r) => r.direction === "-").sort((a, b) => a.impact - b.impact).slice(0, 3),
    },
    groups,
    water_need: crop.water,
    season_fit: c.sf.l,
    fit100: c.match_pct,
  };
}

/* ---------- advisories ---------- */

function advise(req: HiRequest, res: HiResponse, subject: HiRankedCrop): HiAdvisory[] {
  const crop = CROPS[subject.crop];
  const week = res.week;
  const out: HiAdvisory[] = [];
  if (!week.length) {
    return [
      {
        id: "tip.moisture_recheck",
        kind: "data",
        severity: "info",
        text: "The forecast is unavailable, so weather advisories and workable days are hidden for this assessment.",
        impact: 0.4,
        icon: "Info",
      },
    ];
  }
  const be = bandEval(req.profile, crop);
  const wk = week.filter((d) => d.workable);
  const dn = (d: WeekDay) =>
    new Date(d.ts).toLocaleString("en-US", { timeZone: "Asia/Manila", weekday: "short" });
  const rain7 = sum(week.map((d) => d.rain));
  const phValue = req.profile.soil.ph;

  if (!be.ph.missing && phValue !== null && be.ph.st === "low") {
    out.push({
      id: "tip.soil_ph_low",
      kind: "soil_amendment",
      severity: "warn",
      text: `Soil pH ${phValue.toFixed(1)} is below ${crop.name}'s range — apply agricultural lime (about ${(
        1.2 +
        (be.ph.band[0] - phValue) * 1.6
      ).toFixed(1)} t/ha) 3–4 weeks before planting.`,
      impact: 0.8,
      icon: "Mountains",
    });
  }
  if (!be.ph.missing && phValue !== null && be.ph.st === "high") {
    out.push({
      id: "tip.soil_ph_high",
      kind: "soil_amendment",
      severity: "warn",
      text: `Soil pH ${phValue.toFixed(1)} is above ${crop.name}'s range — add compost or elemental sulfur to bring it toward ${be.ph.band[1]}.`,
      impact: 0.7,
      icon: "Mountains",
    });
  }

  const dry = week.filter((d) => d.pop < 25).length;
  if (dry >= 4 && req.moisture <= 2) {
    out.push({
      id: "tip.dry_spell",
      kind: "water",
      severity: "warn",
      text: `Dry spell ahead (${dry} days under 25% rain chance) and soil is dry — irrigate early morning, mulch to hold water.`,
      impact: 0.85,
      icon: "Drop",
    });
  }
  if (rain7 > 110) {
    out.push({
      id: "tip.heavy_rain",
      kind: "water",
      severity: "warn",
      text: `${rain7.toFixed(0)} mm of rain expected this week — hold fertilizer until after ${dn(
        week.filter((d) => d.pop > 60).pop() || week[3]
      )} and keep drainage clear.`,
      impact: 0.75,
      icon: "CloudRain",
    });
  }

  const hot = week.filter((d) => d.hi >= crop.heat - 2).length;
  if (hot >= 2) {
    out.push({
      id: "tip.heat",
      kind: "heat",
      severity: "warn",
      text: `${hot} hot days near ${crop.heat}°C — water in the evening and consider light shade.`,
      impact: 0.6,
      icon: "ThermometerHot",
    });
  }

  if (wk.length) {
    out.push({
      id: "tip.planting_window",
      kind: "planting_window",
      severity: "info",
      text:
        req.mode === "recommend"
          ? `Best days to plant: ${wk.slice(0, 3).map(dn).join(", ")}. ${wk.length} workable day${
              wk.length > 1 ? "s" : ""
            } in the next 7.`
          : `Best days for field work: ${wk.slice(0, 3).map(dn).join(", ")}.`,
      impact: 0.5,
      icon: "CalendarCheck",
    });
  } else {
    out.push({
      id: "tip.planting_window",
      kind: "planting_window",
      severity: "warn",
      text: "No workable day in the next 7 — hold seeds and fertilizer until conditions improve.",
      impact: 0.7,
      icon: "CalendarCheck",
    });
  }

  if (req.profile.soil.hetero > 0.4) {
    out.push({
      id: "tip.field_split",
      kind: "field_split",
      severity: "warn",
      text: `This field varies a lot (${Math.round(
        req.profile.soil.hetero * 100
      )}% of its area is a different soil). Consider splitting it into two fields for sharper advice.`,
      impact: 0.65,
      icon: "Polygon",
    });
  }

  if (res.flags.includes("moisture_mismatch")) {
    out.push({
      id: "tip.moisture_recheck",
      kind: "data",
      severity: "info",
      text: "Your moisture reading differs from modeled soil moisture. Recheck at 10 cm depth — we kept your value but widened the uncertainty.",
      impact: 0.4,
      icon: "Info",
    });
  }

  if (crop.wind && week.some((d) => d.wind >= 34)) {
    out.push({
      id: "tip.wind",
      kind: "weather",
      severity: "info",
      text: `Gusts above 34 km/h forecast — stake ${crop.name.toLowerCase()} and avoid spraying on those days.`,
      impact: 0.45,
      icon: "Wind",
    });
  }

  if (req.mode === "recommend") {
    out.push({
      id: "tip.spacing",
      kind: "spacing",
      severity: "info",
      text: `${crop.name} spacing: ${crop.sys}.`,
      impact: 0.3,
      icon: "Ruler",
    });
  }

  if (req.mode === "checkup" && res.health) {
    if (res.health.water < 55) {
      out.push({
        id: "tip.health_water",
        kind: "water",
        severity: "warn",
        text: `Water score is ${res.health.water}. ${
          req.moisture <= 2
            ? `Soil is drier than ${crop.name} prefers — irrigate within 2 days.`
            : `Soil is wetter than ${crop.name} prefers — improve drainage and skip irrigation.`
        }`,
        impact: 0.9,
        icon: "Drop",
      });
    }
    if (res.health.thermal < 70) {
      out.push({
        id: "tip.health_thermal",
        kind: "heat",
        severity: "warn",
        text: `Thermal stress is building (${res.health.thermal}/100). Mulch around plants and water at dawn.`,
        impact: 0.7,
        icon: "ThermometerHot",
      });
    }
    if (res.consider) {
      out.push({
        id: "tip.consider_crop",
        kind: "crop_switch",
        severity: "info",
        text: `${CROPS[res.consider.crop].name} fits this field ${res.consider.gain} points better than ${crop.name}. Worth considering next season.`,
        impact: 0.55,
        icon: "ArrowsLeftRight",
      });
    }
  }

  const score = (a: HiAdvisory) => ({ risk: 3, warn: 2, info: 1 }[a.severity] || 0) * a.impact;
  return out.sort((a, b) => score(b) - score(a)).slice(0, 7);
}

/* ---------- data quality ---------- */

function dataQuality(p: Profile, fetchedAt: number): HiDataQuality[] {
  const D = 864e5;
  const HR = 36e5;
  const soilCount = [p.soil.ph, p.soil.clay, p.soil.sand, p.soil.soc, p.soil.cec].filter(
    (v) => v !== null
  ).length;
  const elev = p.terrain.elev;
  const slope = p.terrain.slope;

  return [
    {
      layer: "soil",
      source: "Environment Grid · SoilGrids 2.0",
      kind: "modeled",
      status: p.q.soil,
      fetched_at: fetchedAt - 3 * D,
      note:
        p.q.soil === "failed"
          ? "SoilGrids has no data for this cell. Soil features are missing; the model handles them natively."
          : p.q.soil === "partial"
          ? `Only ${soilCount} of 5 soil features are available for this cell.`
          : "~1 km cell · 0–30 cm · pH, clay, sand, organic carbon, CEC",
      flags: [],
    },
    {
      layer: "terrain",
      source: "Environment Grid · AWS Terrain Tiles",
      kind: "derived",
      status: p.q.terrain,
      fetched_at: fetchedAt - 40 * D,
      note:
        elev === null || slope === null
          ? "Terrain is unavailable for this cell."
          : `${Math.round(elev)} m · slope ${slope.toFixed(1)}% · ~30 m source`,
      flags: [],
    },
    {
      layer: "climate",
      source: "Environment Grid · WorldClim 2.1",
      kind: "reanalysis",
      status: p.q.climate,
      fetched_at: fetchedAt - 9 * D,
      note:
        p.q.climate === "failed"
          ? "No WorldClim normals for this cell."
          : "1970–2000 monthly normals · annual rain, seasonality, dry months, temperature",
      flags: [],
    },
    {
      layer: "weather",
      source: "Open-Meteo forecast",
      kind: "forecast",
      status: p.q.weather,
      fetched_at: fetchedAt - 2 * HR,
      note: "7-day forecast · used for readiness only, never as a model feature",
      flags: [],
    },
  ];
}

/* ---------- the entry point ---------- */

export function assess(req: HiRequest): HiResponse {
  const p = req.profile;
  const month = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      month: "numeric",
    }).format(new Date(req.observed_at))
  );

  const stats = profileStats(p);
  const comp = +stats.completeness.toFixed(2);
  const inputQuality = +stats.inputQuality.toFixed(2);

  let sup: FeatureSupport = featureSupport(stats.features);
  if (p.ood < 0.6 && sup === "typical") sup = "unusual";
  if (p.ood < 0.3) sup = "atypical";

  const modeled = req.week.length ? clamp(Math.round(req.week[0].rain / 10), 1, 5) : req.moisture;
  const flags: string[] = [];
  if (Math.abs(modeled - req.moisture) >= 2) flags.push("moisture_mismatch");

  const missing = (Object.keys(p.q) as (keyof typeof p.q)[]).filter((k) => p.q[k] !== "ok");
  const model = { id: MODEL_ID, fsh: GRID_SCHEMA_HASH, dsh: SUPPORT.dataset_id };

  /* Abstain when the profile cannot carry a ranking (blueprint 11.5). */
  if (comp < 0.4 || stats.present === 0) {
    return {
      status: "abstained",
      reliability: {
        tier: "low",
        components: {
          completeness: comp,
          input_quality: inputQuality,
          feature_support: sup,
          confidence: 0,
        },
        validation_status: "not_validated",
        generalization: "holdout_evaluated",
      },
      match: [],
      advisories: [],
      week: req.week,
      modeled,
      flags,
      missing,
      data_quality: dataQuality(p, req.observed_at),
      model,
    };
  }

  const all: Scored[] = [];
  for (const id of CROP_IDS) {
    if (!isModelledCrop(id)) continue;
    const probabilities = predict(stats.features, id);
    if (!probabilities) continue;

    const crop = CROPS[id];
    const score = +expectedSuitability(probabilities).toFixed(4);
    const confidence = +Math.max(...CLASS_KEYS.map((k) => probabilities[k] ?? 0)).toFixed(4);
    const cls = topClass(probabilities) as SuitClass;
    const rounded: Record<string, number> = {};
    for (const k of CLASS_KEYS) rounded[k] = +(probabilities[k] ?? 0).toFixed(4);

    const cond = conditions(p, req.week, req.moisture, crop);
    all.push({
      crop: id,
      score,
      p: rounded,
      cls,
      conf: confidence,
      suit: score,
      readiness: cond.mod,
      match_pct: Math.round(score * 100),
      be: bandEval(p, crop),
      sf: seasonFit(crop, month),
      cond,
      rank: 0,
    });
  }

  all.sort((a, b) => b.score - a.score || b.conf - a.conf || a.crop.localeCompare(b.crop));
  all.forEach((c, i) => {
    c.rank = i + 1;
  });

  const confTop = all[0]?.conf ?? 0;
  const degraded =
    comp < 0.999 || sup !== "typical" || missing.length > 0 || flags.length > 0;
  const tier = relTier(comp, inputQuality, sup, confTop, degraded);

  const reliability: HiReliability = {
    tier,
    components: {
      completeness: comp,
      input_quality: inputQuality,
      feature_support: sup,
      confidence: confTop,
    },
    validation_status: "not_validated",
    generalization: "holdout_evaluated",
  };

  const res: HiResponse = {
    status: degraded ? "degraded" : "ok",
    reliability,
    match: [],
    advisories: [],
    week: req.week,
    modeled,
    flags,
    missing,
    data_quality: dataQuality(p, req.observed_at),
    model,
  };

  if (req.mode === "recommend") {
    // The roster has six crops; show the whole trained roster, never a
    // fallback crop the model was not trained on.
    res.match = all.map((c) => decorate(CROPS[c.crop], c));
    res.others = [];
    res.advisories = advise(req, res, res.match[0]);
  } else {
    const cur = all.find((c) => c.crop === req.current_crop) || all[0];
    const crop = CROPS[cur.crop];
    const cd = cur.cond;
    const fit = Math.round(cur.score * 100);

    const idealD = Math.abs(req.moisture - crop.ideal);
    const water = Math.round(
      clamp(
        100 -
          idealD * 17 -
          (cd.rain7 < 20 && crop.water === "high" ? 18 : 0) -
          (cd.rain7 > 150 ? 14 : 0) +
          (cd.workable > 0 ? 4 : 0),
        12,
        100
      )
    );
    const hot = req.week.filter((d) => d.hi >= crop.heat).length;
    const cold = req.week.filter((d) => d.lo <= crop.b.tmean[0]).length;
    const thermal = req.week.length
      ? Math.round(clamp(100 * (1 - (hot + cold) / req.week.length), 0, 100))
      : 0;

    const ck = (v: number | null, [a, b]: [number, number]) =>
      v === null ? null : v >= a && v <= b ? 1 : v >= a - 1 && v <= b + 1 ? 0.5 : 0;
    const soilChecks = [ck(p.soil.ph, crop.tol.ph), ck(p.soil.clay, crop.tol.clay)].filter(
      (v): v is number => v !== null
    );
    const soil = Math.round(
      100 * (soilChecks.length ? soilChecks.reduce((a, b) => a + b, 0) / soilChecks.length : 0.5)
    );

    const W = req.weights;
    const hi = Math.round(W.fit * fit + W.water * water + W.thermal * thermal + W.soil * soil);
    const band = hi >= 80 ? "Thriving" : hi >= 60 ? "Steady" : hi >= 40 ? "Watch" : "At risk";

    const best = all.find((c) => c.crop !== cur.crop);
    const gain = best ? Math.round((best.score - cur.score) * 100) : 0;
    const consider = best && gain >= 14 && reliability.tier !== "low" ? { crop: best.crop, gain } : null;

    res.current = decorate(crop, cur);
    if (req.week.length) {
      res.health = { index: hi, band, fit, water, thermal, soil };
      res.consider = consider;
    } else {
      res.consider = null;
    }
    res.top = decorate(CROPS[all[0].crop], all[0]);
    res.advisories = advise(req, res, res.current);
  }

  return res;
}

/* ---------- readiness only (blueprint 13, weather alerts) ---------- */

export function readiness(req: { profile: Profile; week: WeekDay[]; moisture: number; crop: string }) {
  const crop = CROPS[req.crop];
  if (!crop) return { unavailable: true as const };
  const c = conditions(req.profile, req.week, req.moisture, crop);
  return {
    unavailable: false as const,
    modifier: c.mod,
    workable_days: c.workable,
    rain7: c.rain7,
    notes: c.notes,
  };
}

export const crops = CROPS;
export const cropIds = CROP_IDS;
export const modelInfo = () => MODEL_INFO;
