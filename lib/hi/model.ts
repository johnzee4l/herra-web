/* Real Herra crop-suitability model (XGBoost, exported as compact trees).

   The artefact is produced by herra-intelligence/03_train.py and copied here
   verbatim. Evaluation mirrors XGBoost: one tree per (tree, class) pair,
   margins start at base_scores and are combined with a softmax.

   Model: hi-xgb-20261107-1ea55688
   Crops: banana, cabbage, cassava, coconut, maize, rice
   Classes: NS, S1, S2, S3, S4
   Features: 13 environmental planes + one-hot crop (19 inputs total). */

import rawModel from "./model.compact.json";
import rawSupport from "./support.json";
import { MODEL_META } from "./model-meta";

export interface CompactTree {
  /** split feature index, -1 on a leaf */
  f: number[];
  /** split threshold */
  t: number[];
  /** left child index */
  l: number[];
  /** right child index */
  r: number[];
  /** 1 = missing value goes left, 0 = goes right */
  m: number[];
  /** leaf value (read at leaf indices) */
  v: number[];
}

export interface CompactModel {
  model_id: string;
  n_classes: number;
  base_score: number;
  base_scores: number[];
  num_features: number;
  feature_names: string[];
  feature_order: string[];
  crop_order: string[];
  class_names: string[];
  trees: CompactTree[];
  notes: string[];
}

export type ModelFeature =
  | "soil_ph"
  | "soil_clay"
  | "soil_sand"
  | "soil_soc"
  | "soil_cec"
  | "terrain_elev"
  | "terrain_slope"
  | "clim_precip_annual"
  | "clim_precip_cv"
  | "clim_dry_months"
  | "clim_temp_mean"
  | "clim_temp_warm"
  | "clim_temp_cool";

export type ModelFeatures = Partial<Record<ModelFeature, number | null>>;

export const MODEL = rawModel as unknown as CompactModel;

export const MODEL_CROPS = MODEL.crop_order;
export const MODEL_FEATURES = MODEL.feature_order as ModelFeature[];
export const MODEL_CLASSES = MODEL.class_names;
export const MODEL_ID = MODEL.model_id;

interface FeatureStat {
  min: number;
  p01: number;
  p05: number;
  p25: number;
  median: number;
  p75: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
  std: number;
  missing_pct: number;
}

interface SupportFile {
  model_id: string;
  dataset_id: string;
  grid_hash: string;
  n_training_samples: number;
  n_locations: number;
  feature_order: string[];
  feature_stats: Record<string, FeatureStat>;
}

export const SUPPORT = rawSupport as unknown as SupportFile;

function evaluateTree(tree: CompactTree, x: number[]): number {
  let i = 0;
  for (let guard = 0; guard < tree.f.length; guard++) {
    const feature = tree.f[i];
    if (feature < 0) return tree.v[i];
    const value = x[feature];
    const goLeft =
      value === null || value === undefined || Number.isNaN(value)
        ? tree.m[i] === 1
        : value < tree.t[i];
    i = goLeft ? tree.l[i] : tree.r[i];
  }
  return 0;
}

function softmax(margins: number[]): number[] {
  const max = Math.max(...margins);
  const exps = margins.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / total);
}

/** True when the crop is one the champion model was trained on. */
export function isModelledCrop(crop: string): boolean {
  return MODEL.crop_order.includes(crop);
}

/**
 * Run the real model for one crop.
 *
 * @returns probabilities keyed by class, or null when the crop is not in the
 *          champion's roster (the web tier must never score untrained crops).
 */
export function predict(
  features: ModelFeatures,
  crop: string
): Record<string, number> | null {
  const cropIndex = MODEL.crop_order.indexOf(crop);
  if (cropIndex < 0) return null;

  const x: number[] = MODEL.feature_order.map((name) => {
    const value = features[name as ModelFeature];
    return value === null || value === undefined || Number.isNaN(value)
      ? NaN
      : value;
  });
  // Crop one-hot, in the exact order used during training.
  for (let i = 0; i < MODEL.crop_order.length; i++) {
    x.push(i === cropIndex ? 1 : 0);
  }

  const margins = MODEL.base_scores.slice();
  for (let t = 0; t < MODEL.trees.length; t++) {
    margins[t % MODEL.n_classes] += evaluateTree(MODEL.trees[t], x);
  }

  const probabilities = softmax(margins);
  const out: Record<string, number> = {};
  MODEL.class_names.forEach((name, i) => {
    out[name] = probabilities[i];
  });
  return out;
}

export type FeatureSupport = "typical" | "unusual" | "atypical";

/**
 * How well the profile is represented by the training data. This describes
 * representation only; it is not an accuracy estimate.
 *
 * Uses training p01–p99 envelopes, plus the number of missing features.
 */
export function featureSupport(features: ModelFeatures): FeatureSupport {
  let outside = 0;
  let missing = 0;
  let present = 0;

  for (const name of MODEL.feature_order as ModelFeature[]) {
    const value = features[name];
    if (value === null || value === undefined || Number.isNaN(value)) {
      missing++;
      continue;
    }
    present++;
    const stat = SUPPORT.feature_stats[name];
    if (!stat) continue;
    if (value < stat.p01 || value > stat.p99) outside++;
  }

  if (present === 0) return "atypical";
  if (missing >= 7) return "atypical";
  if (outside >= 3) return "atypical";
  if (outside >= 1 || missing >= 4) return "unusual";
  return "typical";
}

/** Weighted expected suitability on a 0–1 scale, using class weights. */
export const CLASS_WEIGHT: Record<string, number> = {
  S1: 1,
  S2: 0.75,
  S3: 0.5,
  S4: 0.25,
  NS: 0,
};

export function expectedSuitability(
  probabilities: Record<string, number>
): number {
  return MODEL.class_names.reduce(
    (total, name) => total + (probabilities[name] ?? 0) * (CLASS_WEIGHT[name] ?? 0),
    0
  );
}

export function topClass(probabilities: Record<string, number>): string {
  return MODEL.class_names.reduce(
    (best, name) =>
      (probabilities[name] ?? 0) > (probabilities[best] ?? 0) ? name : best,
    MODEL.class_names[0]
  );
}

export const MODEL_INFO = MODEL_META;
