"use server";

/* Notification actions. The row belongs to the signed-in user; the RLS
   policy also enforces that, but we scope by user_id so a bad id cannot be
   used to probe another account. */

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/client";

export async function markNotificationRead(notificationId: string) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await sb
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/farmer/notifications");
  revalidatePath("/farmer");
  return { success: true };
}

export async function markAllNotificationsRead() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await sb
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) return { error: error.message };
  revalidatePath("/farmer/notifications");
  revalidatePath("/farmer");
  return { success: true };
}
