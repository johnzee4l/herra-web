/* Weather forecast from Open-Meteo (Blueprint section 9.1).
   A failed request returns an empty week. The caller marks weather as failed
   and the assessment runs degraded; nothing is filled in with invented values. */

import type { WeekDay } from "@/lib/types";

function geohash6(lat: number, lng: number): string {
  const latBin = Math.floor((lat + 90) * 100).toString(36).padStart(4, "0");
  const lngBin = Math.floor((lng + 180) * 100).toString(36).padStart(4, "0");
  return `${latBin}${lngBin}`.slice(0, 6);
}

const OPEN_METEO_BASE = process.env.OPEN_METEO_BASE_URL || "https://api.open-meteo.com/v1";
const forecastCache = new Map<string, { data: WeekDay[]; expires: number }>();

export async function fetchForecast(lat: number, lng: number): Promise<WeekDay[]> {
  const cacheKey = geohash6(lat, lng);
  const now = Date.now();
  const cached = forecastCache.get(cacheKey);
  if (cached && cached.expires > now) return cached.data;

  try {
    const url = new URL(`${OPEN_METEO_BASE}/forecast`);
    url.searchParams.set("latitude", lat.toFixed(4));
    url.searchParams.set("longitude", lng.toFixed(4));
    url.searchParams.set(
      "daily",
      [
        "precipitation_sum",
        "precipitation_probability_max",
        "temperature_2m_min",
        "temperature_2m_max",
        "wind_speed_10m_max",
        "et0_fao_evapotranspiration",
      ].join(",")
    );
    url.searchParams.set("timezone", "Asia/Manila");
    url.searchParams.set("forecast_days", "7");

    const response = await fetch(url.toString(), {
      next: { revalidate: 10800 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Open-Meteo API error: ${response.status}`);

    const data = await response.json();
    const week = mapToWeekDays(data);
    forecastCache.set(cacheKey, { data: week, expires: now + 3 * 60 * 60 * 1000 });
    return week;
  } catch (error) {
    console.error("Forecast fetch failed:", error);
    return [];
  }
}

function mapToWeekDays(data: any): WeekDay[] {
  const daily = data?.daily;
  if (!daily?.time?.length) return [];

  const days: WeekDay[] = [];
  for (let i = 0; i < Math.min(7, daily.time.length); i++) {
    const date = new Date(daily.time[i]);
    const rain = daily.precipitation_sum?.[i] ?? 0;
    const pop = daily.precipitation_probability_max?.[i] ?? 0;
    const tempMin = daily.temperature_2m_min?.[i] ?? 0;
    const tempMax = daily.temperature_2m_max?.[i] ?? 0;
    const wind = daily.wind_speed_10m_max?.[i] ?? 0;
    const et0 = daily.et0_fao_evapotranspiration?.[i] ?? 0;

    let code: WeekDay["code"] = "sun";
    if (rain > 20) code = "storm";
    else if (rain > 5) code = "rain";
    else if (pop > 50) code = "cloud";
    else if (pop > 25) code = "partly";

    const workable = rain < 15 && tempMax < 36 && wind < 40 && pop < 70;
    const score = Math.round(
      Math.max(0, 100 - rain * 2 - Math.abs(tempMax - 28) * 3 - (wind > 30 ? 20 : 0) - (pop > 60 ? 15 : 0))
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

export async function checkOpenMeteoHealth(): Promise<{
  available: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  const attempt = async () => {
    const url = new URL(`${OPEN_METEO_BASE}/forecast`);
    url.searchParams.set("latitude", "14.5995");
    url.searchParams.set("longitude", "120.9842");
    url.searchParams.set("daily", "temperature_2m_max");
    url.searchParams.set("forecast_days", "1");
    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) });
    const latency = Date.now() - start;
    if (!response.ok) return { available: false, latency, error: `HTTP ${response.status}` };
    const data = await response.json();
    if (!data?.daily?.temperature_2m_max?.length) {
      return { available: false, latency, error: "Response had no daily values" };
    }
    return { available: true, latency };
  };

  try {
    return await attempt();
  } catch {
    /* A single slow or dropped response is not an outage. Probe once more
       before the dashboard reports the provider as down. */
    try {
      return await attempt();
    } catch (error) {
      return {
        available: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
