import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/client";
import { checkOpenMeteoHealth } from "@/lib/env/forecast";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  supabase: "Supabase",
  open_meteo: "Open-Meteo",
  photon: "Photon",
  model: "Champion model",
};

async function probe(provider: string): Promise<{ ok: boolean; detail: string }> {
  if (provider === "open_meteo") {
    const r = await checkOpenMeteoHealth();
    return { ok: r.available, detail: r.error || "daily forecast returned" };
  }

  if (provider === "photon") {
    const res = await fetch("https://photon.komoot.io/reverse?lat=14.5995&lon=120.9842&limit=1", {
      signal: AbortSignal.timeout(6000),
      headers: { "user-agent": "herra-health/1.0" },
    });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      ok: Array.isArray(data?.features) && data.features.length > 0,
      detail: `${data?.features?.length ?? 0} place result(s)`,
    };
  }

  if (provider === "supabase") {
    const { error } = await supabaseAdmin().from("hi_config").select("key").limit(1);
    return { ok: !error, detail: error?.message || "registry query ok" };
  }

  if (provider === "model") {
    const { data, error } = await supabaseAdmin()
      .from("hi_models")
      .select("id, status, parity_pass, gate_pass")
      .eq("status", "champion")
      .maybeSingle();
    if (error) return { ok: false, detail: error.message };
    if (!data) return { ok: false, detail: "no champion in the registry" };
    return {
      ok: Boolean(data.parity_pass && data.gate_pass),
      detail: `${data.id} · parity ${data.parity_pass ? "pass" : "fail"} · gate ${
        data.gate_pass ? "pass" : "fail"
      }`,
    };
  }

  return { ok: false, detail: "unknown provider" };
}

export async function POST(request: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  let body: { provider?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const provider = String(body.provider ?? "");
  if (!LABELS[provider]) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const started = Date.now();
  try {
    const result = await probe(provider);
    return NextResponse.json({
      ok: result.ok,
      label: LABELS[provider],
      ms: Date.now() - started,
      detail: result.detail,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        label: LABELS[provider],
        ms: Date.now() - started,
        error: error instanceof Error ? error.message : "probe failed",
      },
      { status: 502 }
    );
  }
}
