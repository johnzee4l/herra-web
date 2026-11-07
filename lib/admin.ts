/* Admin console data. The mockup kept models, datasets, sources, advisory
   rules and the audit log inside its in-memory store; the product reads them
   from Supabase (blueprint section 5: hi_models, hi_datasets, advisory_rules,
   audit_log, app_settings). Shapes are kept identical so the screens are a
   data-layer swap, not a UI change.

   Everything here is deterministic: the same seed always produces the same
   confusion matrix, so a screenshot is reproducible. */

import { CROPS, CROP_IDS } from "@/lib/spec/crops";
import { sum } from "@/lib/utils";

/* ---------- suitability classes ---------- */

export const CLASS_KEYS = ["S1", "S2", "S3", "S4", "NS"] as const;
export type ClassKey = (typeof CLASS_KEYS)[number];

/** Class support in the test blocks. Fixed so metrics are stable. */
const SUPPORT = [7200, 25800, 18600, 8400, 15600];

/** Per-class recall. The matrix is generated from these, so the diagonal is
 *  exactly the recall and every metric below is reproducible. */
type Recalls = [number, number, number, number, number];

function confusion(recalls: Recalls): number[][] {
  return recalls.map((r, i) => {
    const row = [0, 0, 0, 0, 0];
    row[i] = Math.round(SUPPORT[i] * r);
    const rest = SUPPORT[i] - row[i];
    const near = [i - 1, i + 1].filter((j) => j >= 0 && j < 5);
    const far = [0, 1, 2, 3, 4].filter((j) => j !== i && !near.includes(j));
    near.forEach((j) => {
      row[j] = Math.round((rest * 0.6) / near.length);
    });
    far.forEach((j) => {
      row[j] = Math.round((rest * 0.4) / far.length);
    });
    // Absorb rounding drift into the nearest neighbour.
    row[near[0]] += SUPPORT[i] - sum(row);
    return row;
  });
}

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

export function cmMetrics(cm: number[][]): CmMetrics {
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
    acc: sum(diag) / tot,
    bacc: sum(per.map((x) => x.r)) / K,
    mf1: sum(per.map((x) => x.f)) / K,
    wf1: sum(per.map((x) => x.f * x.s)) / tot,
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
  cm: number[][];
  dataset: string;
  validation: "passed" | "failed";
  holdout: "complete" | "missing";
  parity: "pass" | "fail";
  feature_schema_hash: string;
  fingerprint: string;
  params: string;
  prevChampion?: string;
  trained: number;
}

const DAY = 864e5;
const T0 = Date.parse("2026-11-02T02:00:00+08:00");

export const MODELS: Model[] = [
  {
    id: "hi-xgb-20261103-4c9e1a7f",
    name: "XGBoost 2026-11-03",
    status: "candidate",
    cm: confusion([0.86, 0.74, 0.71, 0.63, 0.88]),
    dataset: "ds_ph_v7_20261028",
    validation: "passed",
    holdout: "complete",
    parity: "pass",
    feature_schema_hash: "sha256:9f2c41ab7d05",
    fingerprint: "fp_4c9e1a7f",
    params: "n_estimators=620 · max_depth=6 · learning_rate=0.045 · subsample=0.85 · colsample_bytree=0.8 · min_child_weight=3",
    trained: T0,
  },
  {
    id: "hi-xgb-20261012-1b7d3e02",
    name: "XGBoost 2026-10-12",
    status: "champion",
    cm: confusion([0.83, 0.7, 0.67, 0.58, 0.85]),
    dataset: "ds_ph_v6_20261005",
    validation: "passed",
    holdout: "complete",
    parity: "pass",
    feature_schema_hash: "sha256:9f2c41ab7d05",
    fingerprint: "fp_1b7d3e02",
    params: "n_estimators=540 · max_depth=6 · learning_rate=0.05 · subsample=0.85 · colsample_bytree=0.8 · min_child_weight=3",
    trained: T0 - 22 * DAY,
  },
  {
    id: "hi-xgb-20260920-7a2f5c11",
    name: "XGBoost 2026-09-20",
    status: "retired",
    cm: confusion([0.79, 0.66, 0.62, 0.51, 0.81]),
    dataset: "ds_ph_v5_20260910",
    validation: "passed",
    holdout: "complete",
    parity: "pass",
    feature_schema_hash: "sha256:1d80bb3f9a41",
    fingerprint: "fp_7a2f5c11",
    params: "n_estimators=480 · max_depth=5 · learning_rate=0.06 · subsample=0.8 · colsample_bytree=0.8 · min_child_weight=3",
    trained: T0 - 44 * DAY,
  },
];

export const CROP_PRIOR_CM = confusion([0.58, 0.44, 0.4, 0.3, 0.62]);

export const champion = () => MODELS.find((m) => m.status === "champion");

/* ---------- promotion gates (blueprint 14) ---------- */

export interface Gate {
  id: string;
  label: string;
  value: string;
  pass: boolean;
}

export function gatesOf(m: Model): Gate[] {
  const prior = cmMetrics(CROP_PRIOR_CM);
  const d = cmMetrics(m.cm);
  const ch = MODELS.find((x) => x.status === "champion" && x.id !== m.id);
  const chF1 = ch ? cmMetrics(ch.cm).mf1 : null;
  const g3 = d.mf1 - prior.mf1 >= 0.05 && (chF1 == null || d.mf1 - chF1 >= 0);
  return [
    {
      id: "G1",
      label: "Dataset and splits are valid",
      value: m.validation === "passed" ? "passed" : "failed",
      pass: m.validation === "passed",
    },
    {
      id: "G2",
      label: "Training, evaluation and holdout evaluation complete",
      value: m.holdout === "missing" ? "missing" : "complete",
      pass: m.holdout !== "missing",
    },
    {
      id: "G3",
      label: "Macro-F1 above crop prior by 0.05, and not below champion",
      value:
        "+" +
        (d.mf1 - prior.mf1).toFixed(3) +
        " vs prior" +
        (chF1 == null ? "" : " · " + (d.mf1 - chF1 >= 0 ? "+" : "") + (d.mf1 - chF1).toFixed(3) + " vs champion"),
      pass: g3,
    },
    {
      id: "G4",
      label: "Artefacts load and 25 fixed feature payloads infer",
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
  (cmMetrics(m.cm)[k] * 100).toFixed(1) + "%";

/* Feature importance, mean |contribution|. */
export const FEATURES: [string, number, string, string][] = [
  ["crop_id", 0.31, "Crop", "var(--vegetable)"],
  ["clim_precip_annual", 0.27, "Annual rainfall", "var(--heat)"],
  ["clim_temp_mean", 0.22, "Mean temperature", "var(--heat)"],
  ["soil_ph", 0.19, "Soil pH", "var(--soil)"],
  ["clim_dry_months", 0.15, "Dry months", "var(--heat)"],
  ["soil_clay", 0.14, "Clay", "var(--soil)"],
  ["terrain_elev", 0.12, "Elevation", "var(--sky)"],
  ["terrain_slope", 0.1, "Slope", "var(--sky)"],
  ["clim_precip_cv", 0.09, "Rainfall variability", "var(--heat)"],
  ["soil_sand", 0.08, "Sand", "var(--soil)"],
];

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

export const DATASETS: Dataset[] = [
  {
    id: "ds_ph_v7_20261028",
    name: "Philippines v7",
    rows: 128400,
    rejected: 0.031,
    blocks: { train: 62, val: 14, test: 18 },
    guard: 6,
    sources: [
      { name: "SoilGrids 2.0 (ISRIC)", version: "2.0", licence: "CC BY 4.0" },
      { name: "ERA5-Land normals 1991–2020", version: "1991–2020", licence: "Copernicus licence" },
      { name: "Copernicus DEM GLO-30", version: "GLO-30", licence: "Copernicus DEM licence" },
    ],
    hash: "sha256:5e1c9a0f3b27",
    created: T0 - 5 * DAY,
  },
  {
    id: "ds_ph_v6_20261005",
    name: "Philippines v6",
    rows: 121900,
    rejected: 0.034,
    blocks: { train: 60, val: 14, test: 18 },
    guard: 6,
    sources: [
      { name: "SoilGrids 2.0 (ISRIC)", version: "2.0", licence: "CC BY 4.0" },
      { name: "ERA5-Land normals 1991–2020", version: "1991–2020", licence: "Copernicus licence" },
      { name: "Copernicus DEM GLO-30", version: "GLO-30", licence: "Copernicus DEM licence" },
    ],
    hash: "sha256:8a4410cc91de",
    created: T0 - 28 * DAY,
  },
  {
    id: "ds_ph_v5_20260910",
    name: "Philippines v5",
    rows: 114600,
    rejected: 0.039,
    blocks: { train: 58, val: 14, test: 18 },
    guard: 6,
    sources: [
      { name: "SoilGrids 2.0 (ISRIC)", version: "2.0", licence: "CC BY 4.0" },
      { name: "ERA5-Land normals 1991–2020", version: "1991–2020", licence: "Copernicus licence" },
      { name: "Copernicus DEM GLO-30", version: "GLO-30", licence: "Copernicus DEM licence" },
    ],
    hash: "sha256:c02b7e1d4f38",
    created: T0 - 53 * DAY,
  },
];

export const datasetById = (id: string) => DATASETS.find((d) => d.id === id);

/* ---------- environment grid + providers ---------- */

export const GRID = {
  hash: "sha256:af1f84c773e56544550fa03a0dcf9368013a0268c34cdbc60355cb121de0596d",
  schema: "sha256:23574559a5e5",
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

export const PROVIDERS: [string, string, string][] = [
  ["open_meteo", "Open-Meteo forecast", "Readiness and weather alerts"],
  ["photon", "Photon place names", "Reverse geocoding for field names"],
];

/* ---------- advisory rules and health weights ---------- */

export interface Rule {
  id: string;
  kind: string;
  severity: "info" | "warn" | "risk";
  desc: string;
  active: boolean;
}

export const RULES: Rule[] = [
  { id: "tip.soil_ph_low", kind: "explain.down:soil_ph", severity: "warn", desc: "Soil pH below the crop's preferred band", active: true },
  { id: "tip.rain_low", kind: "explain.down:rain", severity: "warn", desc: "Annual rainfall below the crop's preferred band", active: true },
  { id: "tip.heat_high", kind: "explain.down:tmean", severity: "risk", desc: "Mean temperature above the crop's heat limit", active: true },
  { id: "tip.drain_poor", kind: "explain.down:drain", severity: "risk", desc: "Poor drainage on a low-lying field", active: true },
  { id: "tip.slope_high", kind: "explain.down:slope", severity: "warn", desc: "Slope steep enough to need contour work", active: true },
  { id: "tip.moisture_dry", kind: "checkup:moisture", severity: "info", desc: "Moisture reading is dry for the current crop", active: true },
  { id: "tip.moisture_wet", kind: "checkup:moisture", severity: "warn", desc: "Moisture reading is waterlogged", active: false },
  { id: "tip.season_fit", kind: "explain:months", severity: "info", desc: "Crop is outside its planting months", active: true },
];

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

export const AUDIT_SEED: AuditRow[] = [
  { id: "au_1", actor: "u_aileen", action: "promote_model", type: "model", target: "hi-xgb-20261012-1b7d3e02", meta: "Macro-F1 gain over prior", ts: T0 - 22 * DAY },
  { id: "au_2", actor: "u_aileen", action: "create_space", type: "space", target: "sp_socorro", meta: "Socorro Upland Farmers", ts: T0 - 18 * DAY },
  { id: "au_3", actor: "u_aileen", action: "rotate_code", type: "access_code", target: "sp_victoria", meta: "", ts: T0 - 12 * DAY },
  { id: "au_4", actor: "u_aileen", action: "update_crop_thresholds", type: "crop", target: "rice", meta: "v7", ts: T0 - 10 * DAY },
  { id: "au_5", actor: "u_aileen", action: "update_weights", type: "advisory_rule", target: "health_index", meta: "", ts: T0 - 9 * DAY },
  { id: "au_6", actor: "u_aileen", action: "broadcast", type: "announcement", target: "an_1", meta: "sp_victoria", ts: T0 - 6 * DAY },
  { id: "au_7", actor: "u_aileen", action: "review_outcome", type: "outcome", target: "o_1", meta: "", ts: T0 - 4 * DAY },
  { id: "au_8", actor: "u_aileen", action: "spectate", type: "user", target: "u_rodel", meta: "", ts: T0 - 3 * DAY },
  { id: "au_9", actor: "u_aileen", action: "revoke_code", type: "access_code", target: "sp_socorro", meta: "", ts: T0 - 2 * DAY },
  { id: "au_10", actor: "u_aileen", action: "update_rule", type: "advisory_rule", target: "tip.moisture_wet", meta: "disabled", ts: T0 - 1 * DAY },
];

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

/** Cold limit is not stored on the crop; the band's lower bound is the limit. */
export const coldLimit = (id: string) => CROPS[id].b.tmean[0];
