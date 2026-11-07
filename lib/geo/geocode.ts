/* Photon geocoding service (Blueprint section 8)
   
   Reverse geocode field centroids to place names.
   Cached 30 days, coordinates rounded to 4 decimals.
*/

const PHOTON_BASE = process.env.PHOTON_BASE_URL || "https://photon.komoot.io";

// In-memory cache with 30-day TTL
const geocodeCache = new Map<string, { place: any; expires: number }>();

interface PlaceName {
  municipality: string;
  province: string;
  country?: string;
}

/**
 * Reverse geocode coordinates to place name.
 * Blueprint 8: Photon reverse geocoding, cached 30 days, coordinates rounded to 4 decimals
 */
export async function reverseGeocode(lat: number, lng: number): Promise<PlaceName> {
  const roundedLat = lat.toFixed(4);
  const roundedLng = lng.toFixed(4);
  const cacheKey = `${roundedLat},${roundedLng}`;
  const now = Date.now();

  // Check cache
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.place;
  }

  try {
    const url = new URL(`${PHOTON_BASE}/reverse`);
    url.searchParams.set("lat", roundedLat);
    url.searchParams.set("lon", roundedLng);
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 2592000 }, // 30 days
    });

    if (!response.ok) {
      throw new Error(`Photon API error: ${response.status}`);
    }

    const data = await response.json();
    const place = extractPlaceName(data);

    // Cache for 30 days
    geocodeCache.set(cacheKey, {
      place,
      expires: now + 30 * 24 * 60 * 60 * 1000,
    });

    return place;
  } catch (error) {
    console.error("Geocode failed:", error);
    return { municipality: "", province: "" };
  }
}

function extractPlaceName(data: any): PlaceName {
  if (!data.features || data.features.length === 0) {
    return { municipality: "", province: "" };
  }

  const props = data.features[0].properties;

  return {
    municipality: props.city || props.town || props.village || props.municipality || "",
    province: props.state || props.county || "",
    country: props.country || "Philippines",
  };
}

/**
 * Check Photon availability (for admin data health page)
 */
export async function checkPhotonHealth(): Promise<{
  available: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    const url = new URL(`${PHOTON_BASE}/reverse`);
    url.searchParams.set("lat", "14.5995");
    url.searchParams.set("lon", "120.9842");
    url.searchParams.set("limit", "1");

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

/**
 * Attribution required by OpenStreetMap (Blueprint section 8)
 */
export const PHOTON_ATTRIBUTION = "© OpenStreetMap contributors";
