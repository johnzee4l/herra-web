#!/usr/bin/env node
/* Generate a real assessment for the seeded farmer.
 *
 * This uses the exact server-side path: environment grid profile -> Open-Meteo
 * forecast -> champion model assess() -> assessment row. It does not fabricate
 * a model response; if the model or forecast fails, the row records that. */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { profileFor, forecastFor, profileId } from "../lib/env/profile";
import { assess, type HiRequest } from "../lib/hi";
import type { Field } from "../lib/types";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Supabase service credentials are missing");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const IDEMPOTENCY_KEY = "11111111-1111-4111-8111-111111111111";

async function main() {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,display_name")
    .eq("email", "jose@herra.app")
    .single();
  if (profileError) throw profileError;

  const { data: row, error: fieldError } = await supabase
    .from("fields_geo")
    .select("id,space_id,owner_id,name,area_ha,current_crop,place,thumb,geom_geojson,centroid_geojson")
    .eq("owner_id", profile.id)
    .eq("name", "Bangkao Paddy")
    .single();
  if (fieldError) throw fieldError;

  const geom = JSON.parse(row.geom_geojson);
  const centroid = JSON.parse(row.centroid_geojson);
  const field: Field = {
    id: row.id,
    spaceId: row.space_id,
    ownerId: row.owner_id,
    name: row.name,
    geom: geom.coordinates[0].map(([lng, lat]: number[]) => [lat, lng] as [number, number]),
    area: Number(row.area_ha),
    centroid: [centroid.coordinates[1], centroid.coordinates[0]],
    place: row.place ?? { municipality: "", province: "" },
    current_crop: row.current_crop ?? "",
    thumb: row.thumb ?? "",
  };

  const { data: existing } = await supabase
    .from("assessments")
    .select("id")
    .eq("idempotency_key", IDEMPOTENCY_KEY)
    .maybeSingle();
  if (existing) {
    console.log(JSON.stringify({ assessmentId: existing.id, reused: true }, null, 2));
    return;
  }

  const profileData = await profileFor(field);
  const week = await forecastFor(field);
  profileData.q.weather = week.length ? "ok" : "failed";

  const request: HiRequest = {
    mode: "recommend",
    profile: profileData,
    week,
    moisture: 3,
    observed_at: Date.now(),
    weights: { fit: 0.45, water: 0.25, thermal: 0.15, soil: 0.15 },
  };

  const response = assess(request);
  const top = response.match?.[0];
  if (!top) throw new Error("The model returned no ranked crops");

  const { data: assessment, error: insertError } = await supabase
    .from("assessments")
    .insert({
      field_id: field.id,
      space_id: field.spaceId,
      user_id: profile.id,
      profile_id: profileId(profileData),
      mode: request.mode,
      status: response.status,
      idempotency_key: IDEMPOTENCY_KEY,
      request,
      response,
      model_id: response.model.id,
      top_crop_id: top.crop,
      top_class: top.suitability_class,
      top_score: top.match_pct,
      reliability_tier: response.reliability.tier,
      moisture: request.moisture,
      current_crop: field.current_crop || null,
      photo_path: null,
    })
    .select("id,created_at")
    .single();
  if (insertError) throw insertError;

  const { error: notificationError } = await supabase.from("notifications").insert({
    user_id: profile.id,
    kind: "entry",
    title_key: "entry.ready",
    params: {
      title: `Assessment ready for ${field.name}`,
      body: `${top.crop} is the top match at ${top.match_pct}% (${top.suitability_class}).`,
    },
    route: `/farmer/entries/${assessment.id}`,
  });
  if (notificationError) throw notificationError;

  console.log(
    JSON.stringify(
      {
        assessmentId: assessment.id,
        createdAt: assessment.created_at,
        field: field.name,
        model: response.model.id,
        status: response.status,
        reliability: response.reliability,
        top: {
          crop: top.crop,
          class: top.suitability_class,
          matchPct: top.match_pct,
          confidence: top.confidence,
        },
        weekDays: week.length,
        flags: response.flags,
        missing: response.missing,
        profileId: profileId(profileData),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
