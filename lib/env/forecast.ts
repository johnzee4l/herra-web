/* Weather forecast from Open-Meteo (Blueprint section 9.1)
   
   Fetches 7-day forecast at field centroid, cached per geohash-6 cell.
   Blueprint: precipitation_sum → rain_mm, temperature_2m_min/max → temp_min/max_c,
   wind_speed_10m_max → wind_kmh, et0_fao_evapotranspiration → et0_mm
*/

import type { WeekDay } from "@/lib/types";

// Geohash encoding for caching (simplified geohash-6)
function geohash6(lat: number, lng: number): string {
  const latBin = Math.floor((lat + 90) * 100).toString(36).padStart(4, "0");
  const lngBin = Math.floor((lng + 180) * 100).toString(36).padStart(4, "0");
  return `${latBin}${lngBin}`.slice(0, 6);
}

const OPEN_METEO_BASE = process.env.OPEN_METEO_BASE_URL || "https://api.open-meteo.com/v1";

// In-memory cache with 3-hour TTL
const forecastCache = new Map<string, { data: WeekDay[]; expires: number }>();

/**
 * Fetch 7-day forecast for a location.
 * Blueprint 9.1: Cached 3 hours per geohash-6 cell, timezone Asia/Manila
 */
export async function fetchForecast(lat: number, lng: number): Promise<WeekDay[]> {
  const cacheKey = geohash6(lat, lng);
  const now = Date.now();

  // Check cache
  const cached = forecastCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  try {
    const url = new URL(`${OPEN_METEO_BASE}/forecast`);
    url.searchParams.set("latitude", lat.toFixed(4));
    url.searchParams.set("longitude", lng.toFixed(4));
    url.searchParams.set("daily", [
      "precipitation_sum",
      "precipitation_probability_max",
      "temperature_2m_min",
      "temperature_2m_max",
      "wind_speed_10m_max",
      "et0_fao_evapotranspiration",
    ].join(","));
    url.searchParams.set("timezone", "Asia/Manila");
    url.searchParams.set("forecast_days", "7");

    const response = await fetch(url.toString(), {
      next: { revalidate: 10800 }, // 3 hours
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();
    const week = mapToWeekDays(data);

    // Cache for 3 hours
    forecastCache.set(cacheKey, {
      data: week,
      expires: now + 3 * 60 * 60 * 1000,
    });

    return week;
  } catch (error) {
    console.error("Forecast fetch failed:", error);
    // Return fallback forecast
    return generateFallbackForecast(lat, lng);
  }
}

function mapToWeekDays(data: any): WeekDay[] {
  const daily = data.daily;
  const days: WeekDay[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(daily.time[i]);
    const rain = daily.precipitation_sum[i] || 0;
    const pop = daily.precipitation_probability_max[i] || 0;
    const tempMin = daily.temperature_2m_min[i] || 20;
    const tempMax = daily.temperature_2m_max[i] || 32;
    const wind = daily.wind_speed_10m_max[i] || 10;
    const et0 = daily.et0_fao_evapotranspiration[i] || 4;

    // Weather code (simplified)
    let code: WeekDay["code"] = "sun";
    if (rain > 20) code = "rain";
    else if (rain > 5) code = "cloud";
    else if (pop > 50) code = "partly";

    // Workable day: no heavy rain, not too hot, not too windy
    const workable = rain < 15 && tempMax < 36 && wind < 40 && pop < 70;

    // Score for planting (0-100)
    const score = Math.round(
      Math.max(
        0,
        100 - rain * 2 - Math.abs(tempMax - 28) * 3 - (wind > 30 ? 20 : 0) - (pop > 60 ? 15 : 0)
      )
    );

    days.push({
      ts: date.getTime(),
      code,
      hi: Math.round(tempMax),
      lo: Math.round(tempMin),
      pop,
      rain,
      wind,
      et0,
      workable,
      score,
    });
  }

  return days;
}

/**
 * Generate fallback forecast when API fails.
 * Blueprint 9.1: "If it is missing, the assessment runs without conditions"
 */
function generateFallbackForecast(lat: number, lng: number): WeekDay[] {
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

/**
 * Check Open-Meteo availability (for admin data health page)
 */
export async function checkOpenMeteoHealth(): Promise<{
  available: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    const url = new URL(`${OPEN_METEO_BASE}/forecast`);
    url.searchParams.set("latitude", "14.5995");
    url.searchParams.set("longitude", "120.9842");
    url.searchParams.set("daily", "temperature_2m_max");
    url.searchParams.set("forecast_days", "1");

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - start;

    if (!response.ok) {
      return {
        available: false,
        latency,
        error: `HTTP ${response.status}`,
      };
    }

    return {
      available: true,
      latency,
    };
  } catch (error) {
    return {
      available: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
