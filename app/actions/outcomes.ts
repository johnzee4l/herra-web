"use server";

/* Outcome/feedback actions (Blueprint F-22, P2) */

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/client";
import { z } from "zod";

const outcomeSchema = z.object({
  fieldId: z.string().uuid(),
  assessmentId: z.string().uuid().optional(),
  cropId: z.string(),
  resultTag: z.enum(["good", "average", "poor", "failed"]),
  seasonEnd: z.enum(["this_week", "this_month", "last_month", "earlier"]),
  note: z.string().max(1000).optional(),
});

/** The schema stores a real date, not the relative label the form uses. */
function seasonEndDate(kind: "this_week" | "this_month" | "last_month" | "earlier") {
  const now = new Date();
  if (kind === "this_week") return now.toISOString().slice(0, 10);
  if (kind === "last_month") {
    return new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  }
  if (kind === "earlier") return now.toISOString().slice(0, 10);
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export async function submitOutcome(data: z.infer<typeof outcomeSchema>) {
  const parsed = outcomeSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // The farmer must own the field or belong to its space.
  const { data: field } = await supabase
    .from("fields")
    .select("owner_id, space_id")
    .eq("id", parsed.data.fieldId)
    .single();
  if (!field) return { error: "Field not found" };
  if (field.owner_id !== user.id) {
    const { data: membership } = await supabase
      .from("space_members")
      .select("space_id")
      .eq("space_id", field.space_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return { error: "Unauthorized" };
  }

  const { data: outcome, error } = await supabase
    .from("outcomes")
    .insert({
      field_id: parsed.data.fieldId,
      assessment_id: parsed.data.assessmentId ?? null,
      user_id: user.id,
      crop_id: parsed.data.cropId,
      result_tag: parsed.data.resultTag,
      season_end: seasonEndDate(parsed.data.seasonEnd),
      note: parsed.data.note || null,
      review_status: "submitted",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/farmer/tools/outcomes");
  revalidatePath("/admin/outcomes");
  return { success: true, outcomeId: outcome.id };
}

export async function reviewOutcome(
  outcomeId: string,
  status: "reviewed" | "rejected",
  note?: string
) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const { error } = await supabase
    .from("outcomes")
    .update({
      review_status: status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      ...(note ? { note } : {}),
    })
    .eq("id", outcomeId);

  if (error) return { error: error.message };
  revalidatePath("/admin/outcomes");
  return { success: true };
}
