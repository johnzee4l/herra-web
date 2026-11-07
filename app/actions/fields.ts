"use server";

/* Field actions (Blueprint section 5, F-05-06)
   Create, update, archive fields with geometry validation */

import { revalidatePath } from "next/cache";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/client";
import { z } from "zod";

const fieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  spaceId: z.string().uuid("Invalid space ID"),
  geom: z.array(z.tuple([z.number(), z.number()])).min(3, "Field must have at least 3 points"),
  currentCrop: z.string().optional(),
  thumb: z.string().optional(),
});

export async function createField(data: z.infer<typeof fieldSchema>) {
  const result = fieldSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check space membership
  const { data: membership } = await supabase
    .from("space_members")
    .select("space_id")
    .eq("space_id", result.data.spaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { error: "You must be a member of this space to create fields" };
  }

  // Convert geometry to WKT polygon
  const coords = [...result.data.geom, result.data.geom[0]]; // Close the ring
  const wkt = `POLYGON((${coords.map(([lng, lat]) => `${lng} ${lat}`).join(", ")}))`;

  // Geocode place name (will be implemented later with Photon)
  const place = { municipality: "", province: "" };

  const { data: field, error } = await supabase
    .from("fields")
    .insert({
      name: result.data.name,
      space_id: result.data.spaceId,
      owner_id: user.id,
      geom: wkt as any,
      current_crop: result.data.currentCrop || null,
      place,
      thumb: result.data.thumb || null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/farmer/fields");
  return { success: true, fieldId: field.id };
}

export async function updateField(fieldId: string, data: Partial<z.infer<typeof fieldSchema>>) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check ownership
  const { data: field } = await supabase
    .from("fields")
    .select("owner_id")
    .eq("id", fieldId)
    .single();

  if (!field || field.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  const updates: Record<string, any> = {};

  if (data.name) updates.name = data.name;
  if (data.currentCrop !== undefined) updates.current_crop = data.currentCrop;
  if (data.thumb) updates.thumb = data.thumb;

  if (data.geom) {
    const coords = [...data.geom, data.geom[0]];
    updates.geom = `POLYGON((${coords.map(([lng, lat]) => `${lng} ${lat}`).join(", ")}))`;
  }

  const { error } = await supabase
    .from("fields")
    .update(updates)
    .eq("id", fieldId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/farmer/fields");
  revalidatePath(`/farmer/fields/${fieldId}`);
  return { success: true };
}

export async function archiveField(fieldId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check ownership
  const { data: field } = await supabase
    .from("fields")
    .select("owner_id")
    .eq("id", fieldId)
    .single();

  if (!field || field.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("fields")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", fieldId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/farmer/fields");
  return { success: true };
}

export async function unarchiveField(fieldId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check ownership
  const { data: field } = await supabase
    .from("fields")
    .select("owner_id")
    .eq("id", fieldId)
    .single();

  if (!field || field.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("fields")
    .update({ archived_at: null })
    .eq("id", fieldId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/farmer/fields");
  return { success: true };
}
