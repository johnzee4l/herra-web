"use server";

/* Admin actions for model management (Blueprint section 14)
   Model Lab: promote, rollback, gate checks */

import { revalidatePath } from "next/cache";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/client";
import { z } from "zod";

const promoteModelSchema = z.object({
  modelId: z.string(),
  reason: z.string().min(1, "Reason is required"),
});

export async function promoteModel(data: z.infer<typeof promoteModelSchema>) {
  const result = promoteModelSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await supabaseServer();

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  // Pre-check: verify model exists and is gated
  const { data: model } = await supabase
    .from("hi_models")
    .select("*")
    .eq("id", result.data.modelId)
    .single();

  if (!model) {
    return { error: "Model not found" };
  }

  if (model.status !== "gated") {
    return { error: "Only gated models can be promoted" };
  }

  // Check gate results
  if (model.gate_results?.passed !== true) {
    return {
      error: "Gate not passed",
      failedCriterion: model.gate_results?.failed_criterion,
    };
  }

  // Call database function
  const { data: promoteResult, error } = await supabase.rpc("hi_promote_model", {
    model_id_param: result.data.modelId,
    reason: result.data.reason,
  });

  if (error) {
    return { error: error.message };
  }

  const response = promoteResult as { success: boolean; error?: string; model_id?: string };

  if (!response.success) {
    return { error: response.error || "Failed to promote model" };
  }

  revalidatePath("/admin/models");
  revalidatePath("/admin");
  return { success: true, modelId: response.model_id };
}

const rollbackModelSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

export async function rollbackModel(data: z.infer<typeof rollbackModelSchema>) {
  const result = rollbackModelSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await supabaseServer();

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  // Call database function
  const { data: rollbackResult, error } = await supabase.rpc("hi_rollback", {
    reason: result.data.reason,
  });

  if (error) {
    return { error: error.message };
  }

  const response = rollbackResult as {
    success: boolean;
    error?: string;
    restored_model?: string;
    retired_model?: string;
  };

  if (!response.success) {
    return { error: response.error || "Failed to rollback model" };
  }

  revalidatePath("/admin/models");
  revalidatePath("/admin");
  return {
    success: true,
    restoredModel: response.restored_model,
    retiredModel: response.retired_model,
  };
}

export async function updateCropConfig(
  cropId: string,
  updates: { thresholds?: any; metadata?: any; active?: boolean }
) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const data: Record<string, any> = {};
  if (updates.thresholds) data.thresholds = updates.thresholds;
  if (updates.metadata) data.metadata = updates.metadata;
  if (updates.active !== undefined) data.active = updates.active;

  const { error } = await admin
    .from("hi_config")
    .update(data)
    .eq("crop_id", cropId);

  if (error) {
    return { error: error.message };
  }

  // Write audit log
  await admin.from("audit_log").insert({
    actor_id: (await supabase.auth.getUser()).data.user!.id,
    action: "crop_config.update",
    target_type: "crop_config",
    target_id: cropId,
    meta: updates,
  });

  revalidatePath("/admin/crops");
  return { success: true };
}

export async function updateHealthWeights(weights: {
  fit: number;
  water: number;
  thermal: number;
  soil: number;
}) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  // Validate weights sum to 1
  const sum = weights.fit + weights.water + weights.thermal + weights.soil;
  if (Math.abs(sum - 1) > 0.001) {
    return { error: "Weights must sum to 1.0" };
  }

  const { error } = await admin
    .from("app_settings")
    .upsert({
      key: "health_weights",
      value: weights,
    });

  if (error) {
    return { error: error.message };
  }

  // Write audit log
  await admin.from("audit_log").insert({
    actor_id: (await supabase.auth.getUser()).data.user!.id,
    action: "settings.update_health_weights",
    target_type: "settings",
    target_id: "health_weights",
    meta: weights,
  });

  revalidatePath("/admin/advisory");
  return { success: true };
}

export async function updateAdvisoryRule(
  ruleId: string,
  updates: { severity?: string; text_key?: string; active?: boolean }
) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const { error } = await admin
    .from("advisory_rules")
    .update(updates)
    .eq("id", ruleId);

  if (error) {
    return { error: error.message };
  }

  // Write audit log
  await admin.from("audit_log").insert({
    actor_id: (await supabase.auth.getUser()).data.user!.id,
    action: "advisory_rule.update",
    target_type: "advisory_rule",
    target_id: ruleId,
    meta: updates,
  });

  revalidatePath("/admin/advisory");
  return { success: true };
}

export async function createAnnouncement(spaceId: string, title: string, body: string) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const user = (await supabase.auth.getUser()).data.user!;

  // Create announcement
  const { data: announcement, error } = await admin
    .from("announcements")
    .insert({
      space_id: spaceId,
      title,
      body,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Fan out notifications to all space members
  const { data: members } = await admin
    .from("space_members")
    .select("user_id")
    .eq("space_id", spaceId);

  if (members && members.length > 0) {
    const notifications = members.map((m) => ({
      user_id: m.user_id,
      kind: "announcement",
      title_key: "notification.announcement",
      params: { title, spaceId },
      route: `/farmer/spaces/${spaceId}`,
    }));

    await admin.from("notifications").insert(notifications);
  }

  // Write audit log
  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "announcement.create",
    target_type: "announcement",
    target_id: announcement.id,
    meta: { space_id: spaceId, title },
  });

  revalidatePath(`/admin/spaces/${spaceId}`);
  revalidatePath("/farmer/notifications");
  return { success: true, announcementId: announcement.id };
}
