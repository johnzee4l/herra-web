/* Environmental profile builder (Blueprint section 9.1)
   
   Builds complete profile from grid + forecast for a field.
   Used by assessment orchestration.
*/

import type { Field, WeekDay } from "@/lib/types";
import type { Profile } from "@/lib/hi";
import { buildProfile, generateProfileId } from "@/lib/env/grid";
import { fetchForecast } from "@/lib/env/forecast";

/**
 * Build environmental profile for a field.
 * Blueprint 9.1: Grid aggregation + normalization + provenance
 */
export async function profileFor(field: Field): Promise<Profile> {
  return buildProfile(field);
}

/**
 * Generate stable profile ID.
 * Blueprint 9.1: p_ + hash of values + schema hash
 */
export function profileId(profile: Profile): string {
  return generateProfileId(profile);
}

/**
 * Fetch 7-day forecast for a field.
 * Blueprint 9.1: Open-Meteo, cached 3 hours per geohash-6
 */
export async function forecastFor(field: Field): Promise<WeekDay[]> {
  try {
    return await fetchForecast(field.centroid[0], field.centroid[1]);
  } catch (error) {
    console.error("Forecast fetch failed, using fallback:", error);
    // Return fallback forecast
    return generateFallbackWeek();
  }
}

function generateFallbackWeek(): WeekDay[] {
  const now = Date.now();
  const days: WeekDay[] = [];

  for (let i = 0; i < 7; i++) {
    const ts = now + i * 86400000;
    days.push({
      ts,
      code: "partly",
      hi: 30,
      lo: 24,
      pop: 30,
      rain: 2,
      wind: 12,
      et0: 4.5,
      workable: true,
      score: 75,
    });
  }

  return days;
}
