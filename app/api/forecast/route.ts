import { NextRequest, NextResponse } from "next/server";
import { fetchForecast } from "@/lib/env/forecast";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Valid latitude and longitude are required" }, { status: 400 });
  }

  const week = await fetchForecast(lat, lng);
  if (!week.length) {
    return NextResponse.json(
      { error: "The forecast provider did not return daily data", week: [] },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  return NextResponse.json(
    { week, fetchedAt: Date.now() },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}