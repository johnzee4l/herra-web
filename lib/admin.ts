/* Admin console data types and helpers.

   The rows themselves come from the ML registry (hi_models, hi_datasets,
   hi_config) and the web tables (advisory_rules, audit_log) and are hydrated
   by lib/data/bootstrap.ts. Nothing here invents a model, a metric or an
   audit entry. The arrays are mutable only so DataBridge can fill them once
   per request. */

import { CROPS, CROP_IDS } from "@/lib/spec/crops";
import type { Band, Crop } from "@/lib/types";
import { sum } from "@/lib/utils";
import { GRID_SAMPLE_GRID_HASH, GRID_SAMPLE_SCHEMA_HASH } from "@/lib/env/grid-samples";

/* ---------- suitability classes ---------- */

export const CLASS_KEYS = ["S1", "S2", "S3", "S4", "NS"] as const;
export type ClassKey = (typeof CLASS_KEYS)[number];

export interface ClassMetric {
  k: ClassKey;
  p: number;
  r: number;
  f: number;
  s: number;
}

export interface CmMetrics {
  acc: number;
  bacc: number;
  mf1: number;
  wf1: number;
  per: ClassMetric[];
  tot: number;
}

/** Metrics from a stored confusion matrix. Returns empty per-class rows when
 *  the registry row has no matrix instead of fabricating one. */
export function cmMetrics(cm: number[][] | null | undefined): CmMetrics {
  if (!cm || cm.length === 0) {
    return { acc: 0, bacc: 0, mf1: 0, wf1: 0, per: [], tot: 0 };
  }
  const K = cm.length;
  const rows = cm.map((r) => sum(r));
  const cols = cm.map((_, j) => sum(cm.map((r) => r[j])));
  const tot = sum(rows);
  const diag = cm.map((r, i) => r[i]);
  const per: ClassMetric[] = CLASS_KEYS.map((k, i) => {
    const p = cols[i] ? diag[i] / cols[i] : 0;
    const r = rows[i] ? diag[i] / rows[i] : 0;
    const f = p + r ? (2 * p * r) / (p + r) : 0;
    return { k, p, r, f, s: rows[i] };
  });
  return {
    acc: tot ? sum(diag) / tot : 0,
    bacc: sum(per.map((x) => x.r)) / K,
    mf1: sum(per.map((x) => x.f)) / K,
    wf1: tot ? sum(per.map((x) => x.f * x.s)) / tot : 0,
    per,
    tot,
  };
}

/* ---------- models ---------- */

export type ModelStatus = "champion" | "candidate" | "retired";

export interface Model {
  id: string;
  name: string;
  status: ModelStatus;
  /** Held-out confusion matrix from the registry, when the run stored one. */
  cm: number[][] | null;
  metrics: { acc: number; bacc: number; mf1: number; wf1: number };
  dataset: string;
  validation: "passed" | "failed";
  holdout: "complete" | "missing";
  parity: "pass" | "fail";
  feature_schema_hash: string;
  grid_hash?: string;
  holdout_acc?: number;
  fingerprint: string;
  params: string;
  prevChampion?: string;
  trained: number;
  gate?: Record<string, boolean>;
  gates?: Gate[];
  gate_pass?: boolean;
  parity_pass?: boolean;
  rows?: number;
  locations?: number;
}

export const MODELS: Model[] = [];

/** True champion rows, in the order the registry returned them. */
export const champion = () => MODELS.find((m) => m.status === "champion");

export function metricsOf(m: Model): CmMetrics {
  if (m.cm && m.cm.length) return cmMetrics(m.cm);
  return {
    acc: m.metrics.acc,
    bacc: m.metrics.bacc,
    mf1: m.metrics.mf1,
    wf1: m.metrics.wf1,
    per: [],
    tot: 0,
  };
}

/* ---------- promotion gates (blueprint 14) ---------- */

export interface Gate {
  id: string;
  label: string;
  value: string;
  pass: boolean;
}

export function gatesOf(m: Model): Gate[] {
  if (m.gates?.length) return m.gates;
  const validation = m.validation === "passed";
  const holdout = m.holdout !== "missing";
  return [
    { id: "G1", label: "Dataset and splits are valid", value: validation ? "passed" : "failed", pass: validation },
    {
      id: "G2",
      label: "Training, evaluation and holdout evaluation complete",
      value: holdout ? "complete" : "missing",
      pass: holdout,
    },
    {
      id: "G3",
      label: "Macro-F1 above the crop prior by the required margin",
      value: m.gate?.G3 ? "above prior" : "below prior",
      pass: Boolean(m.gate?.G3),
    },
    {
      id: "G4",
      label: "Artefacts load and the golden vectors infer",
      value: m.parity === "pass" ? "match" : "mismatch",
      pass: m.parity === "pass",
    },
  ];
}

export const allGatesPass = (m: Model) => gatesOf(m).every((g) => g.pass);

export const STAT_TONE: Record<ModelStatus, string> = {
  champion: "growth",
  candidate: "heat",
  retired: "",
};

export const MET_ROWS: [keyof CmMetrics, string][] = [
  ["acc", "Accuracy"],
  ["bacc", "Balanced accuracy"],
  ["mf1", "Macro-F1"],
  ["wf1", "Weighted F1"],
];

/** Metric as a percentage string, e.g. "78.4%". */
export const fmtMetric = (m: Model, k: "acc" | "bacc" | "mf1" | "wf1") =>
  ((m.metrics[k] ?? 0) * 100).toFixed(1) + "%";

/* Feature importance, from the training report when the run recorded it. */
export const FEATURES: [string, number, string, string][] = [];

/* ---------- datasets ---------- */

export interface Dataset {
  id: string;
  name: string;
  rows: number;
  rejected: number;
  blocks: { train: number; val: number; test: number };
  guard: number;
  sources: { name: string; version: string; licence: string }[];
  hash: string;
  created: number;
}

export const DATASETS: Dataset[] = [];

export const datasetById = (id: string) => DATASETS.find((d) => d.id === id);

/* ---------- environment grid + providers ---------- */

export const GRID = {
  hash: GRID_SAMPLE_GRID_HASH,
  schema: GRID_SAMPLE_SCHEMA_HASH,
  cells: "2,772,000",
  res: "0.0083° (~1 km)",
  coverage: "Philippines · 4–21.5°N, 116–127°E",
  built: Date.parse("2026-11-07T04:09:13.487581Z"),
  run: "run-20261107T040913Z",
  sources: [
    ["SoilGrids 2.0 (ISRIC)", "2.0", "CC BY 4.0", "2026-11-07"],
    ["AWS Terrain Tiles (Terrarium)", "zoom 9", "Public domain", "2026-11-07"],
    ["WorldClim 2.1", "2.1", "CC BY 4.0", "2026-11-07"],
  ] as [string, string, string, string][],
};

/** The four checks the Data health screen runs against the live tier. */
export const PROVIDERS: [string, string, string][] = [
  ["supabase", "Supabase", "Postgres, Auth and Storage"],
  ["open_meteo", "Open-Meteo forecast", "Readiness and weather alerts"],
  ["photon", "Photon place names", "Reverse geocoding for field names"],
  ["model", "Champion model", "Registry status and golden-vector parity"],
];

/* ---------- advisory rules and health weights ---------- */

export interface Rule {
  id: string;
  kind: string;
  severity: "info" | "warn" | "risk";
  desc: string;
  active: boolean;
}

export const RULES: Rule[] = [];

export const WEIGHTS: Record<string, number> = {
  fit: 0.45,
  water: 0.25,
  thermal: 0.15,
  soil: 0.15,
};

export const WEIGHT_LABEL: Record<string, string> = {
  fit: "Fit",
  water: "Water",
  thermal: "Thermal",
  soil: "Soil",
};

export const WEIGHT_COLOR: Record<string, string> = {
  fit: "var(--growth)",
  water: "var(--water)",
  thermal: "var(--heat)",
  soil: "var(--soil)",
};

/* ---------- audit log ---------- */

export interface AuditRow {
  id: string;
  actor: string;
  action: string;
  type: string;
  target: string;
  meta: string;
  ts: number;
}

export interface AccessCode {
  id: string;
  spaceId: string;
  hint: string;
  expiresAt: number | null;
  maxUses: number;
  uses: number;
  revokedAt: number | null;
  created: number;
}

export const ACCESS_CODES: AccessCode[] = [];

export const AUDIT_SEED: AuditRow[] = [];

export const AUDIT_ICON: Record<string, string> = {
  create_space: "PenNib",
  promote_model: "Medal",
  rollback_model: "ArrowCounterClockwise",
  rotate_code: "ArrowsClockwise",
  revoke_code: "Prohibit",
  reveal_code: "Eye",
  copy_code: "Copy",
  spectate: "Eye",
  review_outcome: "ShieldCheck",
  reject_outcome: "Prohibit",
  broadcast: "Megaphone",
  update_crop_thresholds: "Plant",
  update_rule: "ListChecks",
  update_weights: "Sliders",
  change_role: "Users",
  join_space: "Key",
  remove_member: "UserMinus",
  update_space: "Stack",
  delete_space: "Trash",
  update_code: "Key",
};

/* ---------- crop catalogue helpers ---------- */

export const CROP_FAMILIES = ["all", ...new Set(CROP_IDS.map((c) => CROPS[c].family))];

/** A readable label for a stored advisory key: advisory.soil_ph_low →
    "Soil pH low". Rows keep the key so copy can be translated later; the
    console still needs a label while there is no en table for these keys. */
export function ruleLabel(key: string): string {
  const words = key.replace(/^advisory\./, "").replace(/_/g, " ").replace(/\bph\b/gi, "pH");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Readiness thresholds the admin console may edit. The spec in
    lib/spec/crops.ts seeds them; a saved change lives in hi_config.crop_overrides
    and is hydrated per request. */
export interface CropOverrides {
  water?: Crop["water"];
  heat?: number;
  cold?: number;
  wind?: number;
  ideal?: number;
  ph?: [number, number];
  clay?: [number, number];
}

export const CROP_OVERRIDES: Record<string, CropOverrides> = {};

/** Catalogue revision. Every saved threshold change increments it. */
export const CATALOGUE = { version: 7 };

/** The crop as it stands now: spec bands with the saved overrides on top. */
export function cropConfig(id: string): Crop {
  const c = CROPS[id];
  const o = CROP_OVERRIDES[id] ?? {};
  return {
    ...c,
    water: o.water ?? c.water,
    heat: o.heat ?? c.heat,
    wind: o.wind ?? c.wind,
    ideal: o.ideal ?? c.ideal,
    tol: { ph: o.ph ?? c.tol.ph, clay: o.clay ?? c.tol.clay },
    b:
      o.cold == null
        ? c.b
        : { ...c.b, tmean: [o.cold, c.b.tmean[1], c.b.tmean[2], c.b.tmean[3]] as Band },
  };
}

/** Optimistic local echo of a saved edit, before the next bootstrap read. */
export function mergeCropOverrides(id: string, patch: CropOverrides) {
  CROP_OVERRIDES[id] = { ...CROP_OVERRIDES[id], ...patch };
}

/** Cold limit is not stored on the crop; the band's lower bound is the limit. */
export const coldLimit = (id: string) => cropConfig(id).b.tmean[0];

/* ---------- hydration ---------- */

export interface AdminHydration {
  models: Model[];
  datasets: Dataset[];
  rules: Rule[];
  audit: AuditRow[];
  accessCodes?: Record<string, unknown>[];
  crops?: Record<string, CropOverrides>;
  catalogueVersion?: number;
}

export function hydrateAdmin(data: AdminHydration) {
  MODELS.splice(0, MODELS.length, ...data.models);
  DATASETS.splice(0, DATASETS.length, ...data.datasets);
  RULES.splice(0, RULES.length, ...data.rules);
  AUDIT_SEED.splice(0, AUDIT_SEED.length, ...data.audit);
  for (const key of Object.keys(CROP_OVERRIDES)) delete CROP_OVERRIDES[key];
  Object.assign(CROP_OVERRIDES, data.crops ?? {});
  if (typeof data.catalogueVersion === "number" && data.catalogueVersion > 0) {
    CATALOGUE.version = data.catalogueVersion;
  }
  ACCESS_CODES.splice(
    0,
    ACCESS_CODES.length,
    ...(data.accessCodes ?? []).map((row) => ({
      id: String(row.id),
      spaceId: String(row.space_id),
      hint: String(row.code_hint ?? ""),
      expiresAt: row.expires_at ? Date.parse(String(row.expires_at)) || null : null,
      maxUses: Number(row.max_uses ?? 0),
      uses: Number(row.uses ?? 0),
      revokedAt: row.revoked_at ? Date.parse(String(row.revoked_at)) || null : null,
      created: Date.parse(String(row.created_at ?? "")) || 0,
    }))
  );
}
