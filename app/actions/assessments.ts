"use server";

/* Assessment actions (Blueprint section 9.2)
   The only path that produces an assessment. It builds the environmental
   profile from the grid, fetches the real forecast, runs the champion model in
   process, and stores the returned response. */

import { revalidatePath } from "next/cache";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/client";
import { z } from "zod";
import { assess, type HiRequest } from "@/lib/hi";
import { profileFor, forecastFor, profileId } from "@/lib/env/profile";
import type { Field } from "@/lib/types";

const assessmentSchema = z.object({
  fieldId: z.string().uuid("Invalid field ID"),
  mode: z.enum(["recommend", "checkup"]),
  moisture: z.number().int().min(1).max(5),
  currentCrop: z.string().optional(),
  photoPath: z.string().optional(),
  idempotencyKey: z.string().uuid(),
  rerunOf: z.string().uuid().optional(),
});

const healthWeights = { fit: 0.45, water: 0.25, thermal: 0.15, soil: 0.15 };

function parseGeo(value: unknown) {
  if (!value) return null;
  return typeof value === "string" ? JSON.parse(value) : value;
}

export async function runAssessment(data: z.infer<typeof assessmentSchema>) {
  const parsed = assessmentSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("assessments")
    .select("id")
    .eq("idempotency_key", parsed.data.idempotencyKey)
    .maybeSingle();

  if (existing) return { success: true, assessmentId: existing.id };

  const { data: quotaOk, error: quotaError } = await supabase.rpc("check_assessment_quota", {
    user_uuid: user.id,
  });
  if (quotaError) return { error: quotaError.message };
  if (!quotaOk) return { error: "Assessment quota exceeded. Maximum 30 per hour." };

  const { data: fieldRow, error: fieldError } = await supabase
    .from("fields_geo")
    .select(
      "id,space_id,owner_id,name,area_ha,current_crop,place,thumb,geom_geojson,centroid_geojson"
    )
    .eq("id", parsed.data.fieldId)
    .single();

  if (fieldError || !fieldRow) return { error: "Field not found" };

  if (fieldRow.owner_id !== user.id) {
    const { data: membership } = await supabase
      .from("space_members")
      .select("space_id")
      .eq("space_id", fieldRow.space_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return { error: "Unauthorized" };
  }

  const geom = parseGeo(fieldRow.geom_geojson);
  const centroid = parseGeo(fieldRow.centroid_geojson);
  if (!geom || !centroid) return { error: "Field geometry is unavailable" };

  const field: Field = {
    id: fieldRow.id,
    spaceId: fieldRow.space_id,
    ownerId: fieldRow.owner_id,
    name: fieldRow.name,
    geom: geom.coordinates[0].map(([lng, lat]: number[]) => [lat, lng] as [number, number]),
    area: Number(fieldRow.area_ha),
    centroid: [centroid.coordinates[1], centroid.coordinates[0]],
    place: fieldRow.place ?? { municipality: "", province: "" },
    current_crop: fieldRow.current_crop ?? "",
    thumb: fieldRow.thumb ?? "",
  };

  const profile = await profileFor(field);
  const week = await forecastFor(field);
  profile.q.weather = week.length ? "ok" : "failed";

  const request: HiRequest = {
    mode: parsed.data.mode,
    profile,
    week,
    moisture: parsed.data.moisture,
    current_crop:
      parsed.data.mode === "checkup"
        ? parsed.data.currentCrop || fieldRow.current_crop || undefined
        : undefined,
    observed_at: Date.now(),
    weights: healthWeights,
  };

  let response: ReturnType<typeof assess> | null = null;
  let status: "ok" | "degraded" | "abstained" | "failed";
  try {
    response = assess(request);
    status = response.status;
  } catch (error) {
    console.error("Assessment failed:", error);
    status = "failed";
  }

  const top = response?.match?.[0] ?? response?.current;
  const topCropId = top?.crop ?? null;
  const topClass = top?.suitability_class ?? null;
  const topScore = top ? top.match_pct ?? top.score ?? null : null;

  const { data: assessment, error: insertError } = await admin
    .from("assessments")
    .insert({
      field_id: parsed.data.fieldId,
      space_id: fieldRow.space_id,
      user_id: user.id,
      profile_id: profileId(profile),
      mode: parsed.data.mode,
      status,
      idempotency_key: parsed.data.idempotencyKey,
      request,
      response,
      model_id: response?.model.id ?? null,
      top_crop_id: topCropId,
      top_class: topClass,
      top_score: topScore,
      reliability_tier: response?.reliability.tier ?? null,
      moisture: parsed.data.moisture,
      current_crop: parsed.data.currentCrop || fieldRow.current_crop || null,
      photo_path: parsed.data.photoPath || null,
      rerun_of: parsed.data.rerunOf ?? null,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };
  if (!response) return { error: "The model could not produce an assessment" };

  revalidatePath("/farmer/entries");
  revalidatePath("/farmer");
  revalidatePath("/admin/entries");
  return { success: true, assessmentId: assessment.id, status };
}

export async function deleteAssessment(assessmentId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: assessment } = await supabase
    .from("assessments")
    .select("user_id")
    .eq("id", assessmentId)
    .single();

  if (!assessment || assessment.user_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("assessments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", assessmentId);
  if (error) return { error: error.message };

  revalidatePath("/farmer/entries");
  revalidatePath("/farmer");
  return { success: true };
}

export async function restoreAssessment(assessmentId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("assessments")
    .update({ deleted_at: null })
    .eq("id", assessmentId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/farmer/entries");
  return { success: true };
}

export async function rerunAssessment(originalId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: original } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", originalId)
    .single();

  if (!original || original.user_id !== user.id) return { error: "Unauthorized" };

  return runAssessment({
    fieldId: original.field_id,
    mode: original.mode,
    moisture: original.moisture,
    currentCrop: original.current_crop || undefined,
    photoPath: original.photo_path || undefined,
    idempotencyKey: crypto.randomUUID(),
    rerunOf: original.id,
  });
}

export async function uploadFieldPhoto(file: File): Promise<{ path?: string; error?: string }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  if (!(file instanceof File)) return { error: "Invalid photo" };
  if (file.size > 5 * 1024 * 1024) return { error: "Photo must be 5 MB or smaller" };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "Photo must be JPEG, PNG or WebP" };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabaseAdmin()
    .storage.from("field-photos")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { error: error.message };
  return { path };
}

export async function getPhotoUrl(path: string): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.storage.from("field-photos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
