/* Domain types. The UI contract mirrors the mockup's shapes; the data source
   is Supabase (blueprint section 5). This build runs on a typed local fixture
   set that matches those shapes, so swapping in server data is a data-layer
   change and not a UI change. */

export type Role = "farmer" | "admin";
export type Theme = "dark" | "light" | "system";

export interface Settings {
  theme: Theme;
  motion: "full" | "reduced";
  mapStyle: "sat" | "dark" | "light";
  autoMap: boolean;
  labels: boolean;
  units: "metric" | "imperial";
  temp: "C" | "F";
  area: "ha" | "ac";
  notif: { weather: boolean; announce: boolean };
  defaultKind: "recommend" | "checkup";
  homeLayout: "rings";
  alertHeat: number;
  alertRain: number;
}

export const DEF_SETTINGS: Settings = {
  theme: "dark",
  motion: "full",
  mapStyle: "sat",
  autoMap: false,
  labels: true,
  units: "metric",
  temp: "C",
  area: "ha",
  notif: { weather: true, announce: true },
  defaultKind: "recommend",
  homeLayout: "rings",
  alertHeat: 34,
  alertRain: 60,
};

/** Merge a stored (possibly partial or legacy) profile settings object with
 *  the current defaults. Older profiles were seeded with `{}`; without this
 *  every nested preference such as `notif.weather` is undefined. */
export function normalizeSettings(value: unknown): Settings {
  const raw =
    value && typeof value === "object"
      ? (value as Partial<Settings> & { notif?: Partial<Settings["notif"]> })
      : {};
  return {
    ...DEF_SETTINGS,
    ...raw,
    notif: { ...DEF_SETTINGS.notif, ...(raw.notif ?? {}) },
  };
}

export type CropFamily =
  | "cereal"
  | "root"
  | "legume"
  | "fruit"
  | "vegetable"
  | "plantation"
  | "fiber"
  | "herb";

/** Trapezoid band: [hardLow, softLow, softHigh, hardHigh]. */
export type Band = [number, number, number, number];

export interface CropBands {
  ph: Band;
  tmean: Band;
  rain: Band;
  drain: Band;
  clay: Band;
  slope: Band;
  ece: Band;
}

export interface Crop {
  id: string;
  name: string;
  family: CropFamily;
  /** suitability class thresholds, from hi_config */
  prior: number;
  months: number[];
  /** local name, shown beside the English one */
  local: string;
  water: "low" | "moderate" | "high";
  /** heat threshold in °C */
  heat: number;
  /** wind sensitivity: 0 tolerant, 1 sensitive */
  wind: number;
  /** preferred moisture level on the 1-5 farmer scale */
  ideal: number;
  /** planting system copy, shown as a spacing tip */
  sys: string;
  b: CropBands;
  tol: { ph: [number, number]; clay: [number, number] };
}

export type SuitClass = "S1" | "S2" | "S3" | "S4" | "NS";
export type ReliabilityTier = "high" | "medium" | "low";
export type EntryStatus = "ok" | "degraded" | "abstained" | "failed" | "ready" | "processing" | "queued";
export type EntryKind = "recommend" | "checkup";

export interface Reliability {
  tier: ReliabilityTier;
  score: number;
  comps: {
    completeness: number;
    input_quality: number;
    feature_support: "typical" | "unusual" | "atypical";
    confidence: number;
  };
}

export interface RankedCrop {
  crop: string;
  class: SuitClass;
  match_pct: number;
  up: { feature: string; label: string; value: number }[];
  down: { feature: string; label: string; value: number }[];
  warnings: string[];
}

export interface HealthResult {
  index: number;
  band: "Thriving" | "Steady" | "Watch" | "At risk";
  drivers: { key: string; label: string; value: number | null; note?: string }[];
  consider_instead?: { crop: string; index: number; reason: string };
}

export interface WeekDay {
  ts: number;
  code: "sun" | "partly" | "cloud" | "rain" | "storm";
  hi: number;
  lo: number;
  pop: number;
  rain: number;
  /** max wind speed, km/h */
  wind: number;
  /** reference evapotranspiration, mm */
  et0: number;
  workable: boolean;
  score: number;
}

export interface Advisory {
  severity: "info" | "warn" | "risk";
  icon: string;
  text: string;
  kind: string;
}

export interface DataQuality {
  layer: "soil" | "terrain" | "climate" | "weather";
  status: "ok" | "fallback" | "partial" | "failed";
  source: string;
  kind: "modeled" | "derived" | "reanalysis" | "forecast" | "observed";
  fetched_at: number;
  note: string;
  flags: string[];
}

export interface EntryResult {
  status: "ok" | "degraded" | "abstained" | "failed";
  match?: RankedCrop[];
  current?: RankedCrop;
  health?: HealthResult;
  reliability: Reliability;
  week?: WeekDay[];
  advisories?: Advisory[];
  data_quality: DataQuality[];
  flags: string[];
  warnings: string[];
}

export interface Entry {
  id: string;
  fieldId: string;
  spaceId: string;
  authorId: string;
  kind: EntryKind;
  status: EntryStatus;
  observed_at: number;
  moisture: number;
  currentCrop?: string;
  photo: { url: string; crop?: string; bare?: boolean };
  result?: EntryResult;
  rerun_of?: string;
}

export interface Field {
  id: string;
  spaceId: string;
  ownerId: string;
  name: string;
  /** [lat, lng] ring */
  geom: [number, number][];
  area: number;
  centroid: [number, number];
  place: { municipality: string; province: string };
  current_crop: string;
  archived?: boolean;
  thumb: string;
}

export interface Space {
  id: string;
  name: string;
  desc: string;
  center: [number, number];
  boundary: [number, number][];
  place: { municipality: string; province: string };
  status: "ok" | "attention";
  crop_focus: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  photo?: string;
  settings?: Settings;
  /** Account lifecycle. `invited` accounts have not signed in yet. */
  status?: "active" | "invited" | "suspended";
  /** Last activity timestamp, epoch ms. Absent for invited accounts. */
  active?: number;
  /** When the account was created, epoch ms. */
  joined?: number;
}

export interface Member {
  spaceId: string;
  userId: string;
  joinedAt: number;
}

/** A broadcast from an admin to every member of a space (blueprint F-04, P2). */
export interface Announcement {
  id: string;
  spaceId: string;
  title: string;
  body: string;
  by: string;
  created: number;
}

export interface Notification {
  id: string;
  userId: string;
  kind: "weather" | "announce" | "entry" | "data" | "outcome";
  title: string;
  body: string;
  route: string;
  read: boolean;
  createdAt: number;
}
