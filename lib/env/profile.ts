/* Environmental profile builder (Blueprint section 9.1)
   The profile comes from the environment grid. When the forecast is missing
   the assessment still runs; it is marked degraded rather than filled with a
   synthetic week. */

import type { Field, WeekDay } from "@/lib/types";
import type { Profile } from "@/lib/hi";
import { buildProfile, generateProfileId } from "@/lib/env/grid";
import { fetchForecast } from "@/lib/env/forecast";

export async function profileFor(field: Field): Promise<Profile> {
  return buildProfile(field);
}

export function profileId(profile: Profile): string {
  return generateProfileId(profile);
}

export async function forecastFor(field: Field): Promise<WeekDay[]> {
  return fetchForecast(field.centroid[0], field.centroid[1]);
}
