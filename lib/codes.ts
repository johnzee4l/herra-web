/* Result copy and tone constants (tokens section 15, 16.1).
   Raw code strings are never shown to users (blueprint 11.1). */

import type { ReliabilityTier } from "@/lib/types";

export const CLASS_L: Record<string, string> = {
  S1: "Very suitable",
  S2: "Suitable",
  S3: "Moderately suitable",
  S4: "Marginally suitable",
  NS: "Not suitable",
};

export const RELI: Record<
  ReliabilityTier,
  { tone: string; icon: string; l: string }
> = {
  high: { tone: "growth", icon: "ShieldCheck", l: "High" },
  medium: { tone: "heat", icon: "ShieldWarning", l: "Medium" },
  low: { tone: "risk", icon: "ShieldSlash", l: "Low" },
};

export const SUP_LBL: Record<string, string> = {
  typical: "Typical for the training data",
  unusual: "Unusual compared with the training data",
  atypical: "Atypical: unlike most of the training data",
};

export const PROV_LBL: Record<string, string> = {
  modeled: "Modeled",
  derived: "Derived",
  reanalysis: "Reanalysis",
  forecast: "Forecast",
  observed: "Measured",
};

export const PROV_TONE: Record<string, string> = {
  modeled: "soil",
  derived: "sky",
  reanalysis: "heat",
  forecast: "water",
  observed: "growth",
};

export const FLAG_LBL: Record<string, string> = {
  moisture_mismatch: "Moisture differs from model",
  photo_off_site: "Photo off-site",
};

export const WX: Record<string, { i: string; l: string }> = {
  sun: { i: "Sun", l: "Clear" },
  partly: { i: "CloudSun", l: "Partly cloudy" },
  cloud: { i: "Cloud", l: "Overcast" },
  rain: { i: "CloudRain", l: "Rain" },
  storm: { i: "CloudLightning", l: "Thunderstorm" },
};

export const bandColor = (b: string) =>
  ({
    Thriving: "var(--growth)",
    Steady: "color-mix(in oklab,var(--growth) 72%,var(--water))",
    Watch: "var(--heat)",
    "At risk": "var(--risk)",
  })[b] ?? "var(--muted)";

export const bandIcon = (b: string) =>
  ({
    Thriving: "Plant",
    Steady: "Leaf",
    Watch: "Warning",
    "At risk": "WarningOctagon",
  })[b] ?? "Warning";

export const bandTone = (b: string) =>
  ({ Thriving: "growth", Steady: "growth", Watch: "heat", "At risk": "risk" })[b] ??
  "";

export const wxIcon = (c: string) =>
  ({
    sun: "var(--heat)",
    partly: "var(--sky)",
    cloud: "var(--muted)",
    rain: "var(--water)",
    storm: "var(--risk)",
  })[c] ?? "var(--muted)";

export const MOIST = [
  { k: 1, i: "Sun" },
  { k: 2, i: "Wind" },
  { k: 3, i: "DropHalf" },
  { k: 4, i: "Drop" },
  { k: 5, i: "Waves" },
];

export const MOIST_DESC = [
  "Cracked surface, plants wilting",
  "Crumbly, dry to a thumb-depth",
  "Holds shape, slightly cool",
  "Dark and sticky, clearly damp",
  "Standing water on the surface",
];
