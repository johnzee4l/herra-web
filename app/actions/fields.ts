"use server";

/* Field actions (Blueprint section 5, F-05-06) */

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/client";
import { z } from "zod";

const fieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  spaceId: z.string().uuid("Invalid space ID"),
  geom: z.array(z.tuple([z.number(), z.number()])).min(3, "Field must have at least 3 points"),
  currentCrop: z.string().optional(),
  thumb: z.string().optional(),
});

export async function createField(data: z.infer<typeof fieldSchema>) {
  const parsed = fieldSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: membership } = await supabase
    .from("space_members")
    .select("space_id")
    .eq("space_id", parsed.data.spaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "You must be a member of this space to create fields" };

  const { data: space } = await supabase
    .from("spaces")
    .select("place")
    .eq("id", parsed.data.spaceId)
    .single();

  const ring = [...parsed.data.geom];
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push(ring[0]);
  }
  const wkt = `POLYGON((${ring.map(([lng, lat]) => `${lng} ${lat}`).join(", ")}))`;

  const { data: field, error } = await supabase
    .from("fields")
    .insert({
      name: parsed.data.name,
      space_id: parsed.data.spaceId,
      owner_id: user.id,
      geom: wkt,
      current_crop: parsed.data.currentCrop || null,
      place: space?.place ?? {},
      thumb: parsed.data.thumb || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/farmer/fields");
  revalidatePath("/farmer");
  return { success: true, fieldId: field.id };
}

export async function updateField(fieldId: string, data: Partial<z.infer<typeof fieldSchema>>) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: field } = await supabase
    .from("fields")
    .select("owner_id")
    .eq("id", fieldId)
    .single();
  if (!field || field.owner_id !== user.id) return { error: "Unauthorized" };

  const updates: Record<string, unknown> = {};
  if (data.name) updates.name = data.name;
  if (data.currentCrop !== undefined) updates.current_crop = data.currentCrop || null;
  if (data.thumb) updates.thumb = data.thumb;

  if (data.geom) {
    const ring = [...data.geom];
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
      ring.push(ring[0]);
    }
    updates.geom = `POLYGON((${ring.map(([lng, lat]) => `${lng} ${lat}`).join(", ")}))`;
  }

  const { error } = await supabase.from("fields").update(updates).eq("id", fieldId);
  if (error) return { error: error.message };

  revalidatePath("/farmer/fields");
  revalidatePath(`/farmer/fields/${fieldId}`);
  return { success: true };
}

export async function archiveField(fieldId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: field } = await supabase
    .from("fields")
    .select("owner_id")
    .eq("id", fieldId)
    .single();
  if (!field || field.owner_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("fields")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", fieldId);
  if (error) return { error: error.message };

  revalidatePath("/farmer/fields");
  return { success: true };
}

export async function unarchiveField(fieldId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: field } = await supabase
    .from("fields")
    .select("owner_id")
    .eq("id", fieldId)
    .single();
  if (!field || field.owner_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("fields")
    .update({ archived_at: null })
    .eq("id", fieldId);
  if (error) return { error: error.message };

  revalidatePath("/farmer/fields");
  return { success: true };
}
