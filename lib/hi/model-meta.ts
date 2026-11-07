/* Champion model metadata only.

   This file deliberately contains no trees. Admin screens and copy that only
   need the model identity, metrics and hashes import it, so they do not pull
   the 1.5 MB compact model into their bundle. The evaluator in model.ts is
   the only consumer of model.compact.json.

   Source: herra-intelligence/data/models/hi-xgb-20261107-1ea55688
   (manifest.json, report.json, model.compact.json). */

export const MODEL_META = {
  id: "hi-xgb-20261107-1ea55688",
  status: "champion" as const,
  dataset_id: "ds-philippines-20261107-026b61c5b9ac878e",
  grid_hash:
    "sha256:af1f84c773e56544550fa03a0dcf9368013a0268c34cdbc60355cb121de0596d",
  feature_schema_hash: "sha256:23574559a5e5",
  config_hash: "026b61c5b9ac878e",
  trained_at: "2026-11-07T04:10:44.971124Z",
  n_training_samples: 34518,
  n_locations: 5753,
  n_trees: 1250,
  n_features: 19,
  crops: ["banana", "cabbage", "cassava", "coconut", "maize", "rice"],
  classes: ["NS", "S1", "S2", "S3", "S4"],
  metrics: {
    accuracy: 0.7085106382978723,
    balanced_accuracy: 0.5647072803052641,
    macro_f1: 0.5768501020046308,
    weighted_f1: 0.709837130059411,
  },
  baseline_macro_f1: 0.2,
  labels: "GAEZ reference classifications",
  note:
    "Holdout-evaluated against GAEZ reference labels. Not validated against field outcomes.",
} as const;
