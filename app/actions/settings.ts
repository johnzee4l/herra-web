"use server";

/* User settings and profile actions (Blueprint section 5)
   Update preferences, settings */

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/client";
import { z } from "zod";
import type { Settings } from "@/lib/types";

const settingsSchema = z.object({
  theme: z.enum(["dark", "light", "system"]).optional(),
  motion: z.enum(["full", "reduced"]).optional(),
  mapStyle: z.enum(["sat", "dark", "light"]).optional(),
  autoMap: z.boolean().optional(),
  labels: z.boolean().optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  temp: z.enum(["C", "F"]).optional(),
  area: z.enum(["ha", "ac"]).optional(),
  notif: z.object({
    weather: z.boolean(),
    announce: z.boolean(),
  }).optional(),
  defaultKind: z.enum(["recommend", "checkup"]).optional(),
  homeLayout: z.enum(["rings"]).optional(),
  alertHeat: z.number().optional(),
  alertRain: z.number().optional(),
});

export async function updateSettings(updates: Partial<Settings>) {
  const result = settingsSchema.safeParse(updates);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get current settings
  const { data: profile } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found" };
  }

  // Merge settings
  const newSettings = { ...profile.settings, ...updates };

  const { error } = await supabase
    .from("profiles")
    .update({ settings: newSettings })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/farmer/settings");
  return { success: true };
}

const profileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").optional(),
  timezone: z.string().optional(),
});

export async function updateProfile(updates: z.infer<typeof profileSchema>) {
  const result = profileSchema.safeParse(updates);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const data: Record<string, any> = {};
  if (updates.displayName) data.display_name = updates.displayName;
  if (updates.timezone) data.timezone = updates.timezone;

  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/farmer/settings");
  return { success: true };
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/farmer/notifications");
  return { success: true };
}

export async function markAllNotificationsRead() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/farmer/notifications");
  return { success: true };
}
