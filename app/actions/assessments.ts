"use server";

/* Assessment actions (Blueprint section 9.2)
   Run assessments, store results, handle reruns */

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
});

// Health weights - admin-editable in production (Blueprint 9.2, ML 14.7 defaults)
const HEALTH_WEIGHTS = { fit: 0.45, water: 0.25, thermal: 0.15, soil: 0.15 };

export async function runAssessment(data: z.infer<typeof assessmentSchema>) {
  const result = assessmentSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check idempotency - if this key exists, return the existing assessment
  const { data: existing } = await supabase
    .from("assessments")
    .select("id")
    .eq("idempotency_key", result.data.idempotencyKey)
    .maybeSingle();

  if (existing) {
    return { success: true, assessmentId: existing.id };
  }

  // Check hourly quota (Blueprint 5.2)
  const { data: quotaCheck } = await supabase.rpc("check_assessment_quota", {
    user_uuid: user.id,
  });

  if (!quotaCheck) {
    return { error: "Assessment quota exceeded. Maximum 30 per hour." };
  }

  // Get field with geometry
  const { data: fieldRow, error: fieldError } = await supabase
    .from("fields")
    .select("*, geom_geojson:st_asgeojson(geom), centroid_geojson:st_asgeojson(centroid)")
    .eq("id", result.data.fieldId)
    .single();

  if (fieldError || !fieldRow) {
    return { error: "Field not found" };
  }

  // Check ownership or space membership
  if (fieldRow.owner_id !== user.id) {
    const { data: membership } = await supabase
      .from("space_members")
      .select("space_id")
      .eq("space_id", fieldRow.space_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return { error: "Unauthorized" };
    }
  }

  // Parse geometry
  const geomJson = JSON.parse(fieldRow.geom_geojson);
  const centroidJson = JSON.parse(fieldRow.centroid_geojson);
  
  const field: Field = {
    id: fieldRow.id,
    spaceId: fieldRow.space_id,
    ownerId: fieldRow.owner_id,
    name: fieldRow.name,
    geom: geomJson.coordinates[0].map(([lng, lat]: number[]) => [lat, lng] as [number, number]),
    area: fieldRow.area_ha,
    centroid: [centroidJson.coordinates[1], centroidJson.coordinates[0]],
    place: fieldRow.place,
    current_crop: fieldRow.current_crop,
    thumb: fieldRow.thumb || "",
  };

  // Build environmental profile (Blueprint 9.1)
  const profile = await profileFor(field);
  const week = await forecastFor(field);
  const pid = profileId(profile);

  // Assemble request
  const request: HiRequest = {
    mode: result.data.mode,
    profile,
    week,
    moisture: result.data.moisture,
    current_crop: result.data.currentCrop,
    observed_at: Date.now(),
    weights: HEALTH_WEIGHTS,
  };

  let response;
  let status: "ok" | "degraded" | "abstained" | "failed";

  try {
    // Call lib/hi (Blueprint 9.2 step 4)
    response = assess(request);
    status = response.status === "failed" ? "failed" : response.status;
  } catch (error) {
    // Failed assessment
    status = "failed";
    response = null;
  }

  // Extract denormalized fields for queries
  const topCrop = response?.match?.[0] || response?.current;
  const topCropId = topCrop?.crop || null;
  const topClass = topCrop?.suitability_class || null;
  const topScore = topCrop?.score || null;
  const reliabilityTier = response?.reliability?.tier || null;
  const modelId = response?.model?.id || null;

  // Store assessment (Blueprint 9.2 step 5)
  const { data: assessment, error: insertError } = await admin
    .from("assessments")
    .insert({
      field_id: result.data.fieldId,
      user_id: user.id,
      profile_id: pid,
      mode: result.data.mode,
      status,
      idempotency_key: result.data.idempotencyKey,
      request: request as any,
      response: response as any,
      model_id: modelId,
      top_crop_id: topCropId,
      top_class: topClass,
      top_score: topScore,
      reliability_tier: reliabilityTier,
      moisture: result.data.moisture,
      current_crop: result.data.currentCrop || null,
      photo_path: result.data.photoPath || null,
    })
    .select()
    .single();

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/farmer/entries");
  revalidatePath("/farmer");
  return { success: true, assessmentId: assessment.id, status };
}

export async function deleteAssessment(assessmentId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check ownership
  const { data: assessment } = await supabase
    .from("assessments")
    .select("user_id")
    .eq("id", assessmentId)
    .single();

  if (!assessment || assessment.user_id !== user.id) {
    return { error: "Unauthorized" };
  }

  // Soft delete
  const { error } = await supabase
    .from("assessments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", assessmentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/farmer/entries");
  return { success: true };
}

export async function rerunAssessment(originalId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get original assessment
  const { data: original } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", originalId)
    .single();

  if (!original || original.user_id !== user.id) {
    return { error: "Unauthorized" };
  }

  // Create new assessment with rerun_of link
  const newIdempotencyKey = crypto.randomUUID();

  return runAssessment({
    fieldId: original.field_id,
    mode: original.mode,
    moisture: original.moisture,
    currentCrop: original.current_crop || undefined,
    photoPath: original.photo_path || undefined,
    idempotencyKey: newIdempotencyKey,
  });
}

// Upload field photo
export async function uploadFieldPhoto(file: File, userId: string): Promise<{ path?: string; error?: string }> {
  const admin = supabaseAdmin();

  // Generate path: userId/timestamp_random.jpg
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${timestamp}_${random}.${ext}`;

  const { error } = await admin.storage
    .from("field-photos")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return { error: error.message };
  }

  return { path };
}

// Get signed URL for photo
export async function getPhotoUrl(path: string): Promise<string | null> {
  const supabase = await supabaseServer();

  const { data } = await supabase.storage
    .from("field-photos")
    .createSignedUrl(path, 3600); // 1 hour

  return data?.signedUrl || null;
}
