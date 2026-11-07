/* Crop catalogue. Only crops the champion model was trained on appear here.
   The order matches the model's crop_order so UI lists and one-hot encoding
   stay aligned.

   Bands are trapezoids [hardLow, softLow, softHigh, hardHigh]: full fit
   between softLow and softHigh, tapering to the hard bounds. They drive
   readiness and health only. Model suitability comes from lib/hi. */

import type { Band, Crop, CropBands } from "@/lib/types";

const mk = (
  id: string,
  name: string,
  local: string,
  family: Crop["family"],
  prior: number,
  months: number[],
  water: Crop["water"],
  heat: number,
  wind: number,
  b: CropBands,
  extra: { ideal: number; sys: string }
): Crop => ({
  id,
  name,
  local,
  family,
  prior,
  months,
  water,
  heat,
  wind,
  b,
  ideal: extra.ideal,
  sys: extra.sys,
  tol: { ph: [b.ph[1], b.ph[2]], clay: [b.clay[1], b.clay[2]] },
});

const B = (a: [number, number, number, number]): Band => a;

export const CROPS: Record<string, Crop> = Object.fromEntries(
  [
    mk("banana", "Banana", "Saging", "fruit", 0.95, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "high", 36, 1,
      { ph: B([4.8, 5.8, 7.2, 8.2]), tmean: B([18, 23, 30, 36]), rain: B([1200, 1800, 3000, 4200]), drain: B([2, 3, 4, 5]), clay: B([10, 18, 40, 60]), slope: B([0, 0, 8, 22]), ece: B([0, 0, 1.5, 4]) },
      { ideal: 3.6, sys: "Suckers 3 × 3 m, stake against wind" }),
    mk("cabbage", "Cabbage", "Repolyo", "vegetable", 0.93, [10, 11, 12, 1, 2, 3], "moderate", 28, 1,
      { ph: B([5, 5.5, 6.8, 7.8]), tmean: B([8, 14, 24, 30]), rain: B([500, 900, 2500, 3500]), drain: B([2, 3, 4, 5]), clay: B([5, 15, 35, 50]), slope: B([0, 0, 10, 25]), ece: B([0, 0, 2, 4]) },
      { ideal: 3.2, sys: "Transplant 60 × 45 cm on raised beds" }),
    mk("cassava", "Cassava", "Kamoteng kahoy", "root", 0.97, [3, 4, 5, 10, 11], "low", 36, 0,
      { ph: B([4.2, 5.2, 7, 8.2]), tmean: B([18, 22, 29, 35]), rain: B([700, 1100, 2200, 3200]), drain: B([2, 3, 5, 5]), clay: B([5, 10, 35, 55]), slope: B([0, 0, 15, 30]), ece: B([0, 0, 2, 5]) },
      { ideal: 2.6, sys: "Cuttings 1 × 1 m, plant at 45°" }),
    mk("coconut", "Coconut", "Niyog", "plantation", 0.95, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "moderate", 36, 0,
      { ph: B([4.5, 5.5, 8, 8.8]), tmean: B([20, 24, 30, 36]), rain: B([1000, 1500, 2800, 4200]), drain: B([1, 2, 4, 5]), clay: B([3, 5, 30, 55]), slope: B([0, 0, 10, 28]), ece: B([0, 0, 6, 14]) },
      { ideal: 3, sys: "Seedlings 8 × 8 m" }),
    mk("maize", "Maize", "Mais", "cereal", 1, [10, 11, 12, 4, 5], "moderate", 35, 1,
      { ph: B([5, 5.8, 7.2, 8.2]), tmean: B([17, 21, 28, 34]), rain: B([500, 800, 1800, 3000]), drain: B([2, 3, 4, 5]), clay: B([5, 12, 35, 55]), slope: B([0, 0, 8, 22]), ece: B([0, 0, 1.7, 6]) },
      { ideal: 3, sys: "Row 75 × 25 cm, 1 seed per hill" }),
    mk("rice", "Rice", "Palay", "cereal", 1, [6, 7, 8, 11, 12, 1], "high", 35, 0,
      { ph: B([4.2, 5.3, 7.2, 8.2]), tmean: B([18, 23, 29, 35]), rain: B([900, 1500, 2800, 4200]), drain: B([1, 1, 3, 4]), clay: B([10, 30, 60, 80]), slope: B([0, 0, 3, 12]), ece: B([0, 0, 2, 6]) },
      { ideal: 4.4, sys: "Transplant 20×20 cm, keep 3–5 cm standing water" }),
  ].map((c) => [c.id, c])
);

export const CROP_IDS = Object.keys(CROPS);
