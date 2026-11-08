"use client";

import { useEffect, useRef, useState } from "react";
import type { WeekDay } from "@/lib/types";

/** Live 7-day forecast for a field or space centre. The stored assessment week
 *  is used as an immediate fallback, never as the only source. */
export function useForecast(
  lat?: number | null,
  lng?: number | null,
  fallback: WeekDay[] = []
) {
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  const [week, setWeek] = useState<WeekDay[]>(fallback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    if (lat == null || lng == null) {
      setWeek(fallbackRef.current);
      setLoading(false);
      setError(null);
      setUpdatedAt(null);
      return;
    }

    let cancelled = false;
    setWeek(fallbackRef.current);
    setLoading(true);
    setError(null);

    fetch(`/api/forecast?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.error || `Forecast request failed (${response.status})`);
        }
        return body as { week?: WeekDay[]; fetchedAt?: number };
      })
      .then((body) => {
        if (cancelled) return;
        if (body.week?.length) {
          setWeek(body.week);
          setUpdatedAt(body.fetchedAt ?? Date.now());
        } else {
          setWeek(fallbackRef.current);
          setError("The forecast provider returned no days");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setWeek(fallbackRef.current);
        setError(err instanceof Error ? err.message : "The forecast is unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return { week, loading, error, updatedAt };
}