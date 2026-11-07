"use server";

/* Outcome/feedback actions (Blueprint F-22, P2)
   Farmers log crop performance results */

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/client";
import { z } from "zod";

const outcomeSchema = z.object({
  fieldId: z.string().uuid(),
  assessmentId: z.string().uuid().optional(),
  cropId: z.string(),
  resultTag: z.enum(["good", "average", "poor", "failed"]),
  seasonEnd: z.enum(["this_week", "this_month", "last_month", "earlier"]),
  note: z.string().optional(),
});

export async function submitOutcome(data: z.infer<typeof outcomeSchema>) {
  const result = outcomeSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Insert outcome
  const { data: outcome, error } = await supabase
    .from("outcomes")
    .insert({
      field_id: result.data.fieldId,
      assessment_id: result.data.assessmentId,
      user_id: user.id,
      crop_id: result.data.cropId,
      result_tag: result.data.resultTag,
      season_end: result.data.seasonEnd,
      note: result.data.note,
      review_status: "pending",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

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

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("outcomes")
    .update({
      review_status: status,
      reviewed_by: (await supabase.auth.getUser()).data.user!.id,
      reviewed_at: new Date().toISOString(),
      note: note || undefined,
    })
    .eq("id", outcomeId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/outcomes");
  return { success: true };
}
