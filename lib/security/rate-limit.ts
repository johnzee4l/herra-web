/* Rate limiting utilities (Blueprint section 5.2) */

import { supabaseAdmin } from "@/lib/supabase/client";

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMinutes: number
): Promise<{ allowed: boolean; remaining: number }> {
  const admin = supabaseAdmin();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

  // Get or create rate limit record
  const { data: existing } = await admin
    .from("rate_limits")
    .select("*")
    .eq("key", key)
    .gte("expires_at", now.toISOString())
    .single();

  if (!existing) {
    // Create new record
    const expiresAt = new Date(now.getTime() + windowMinutes * 60 * 1000);
    await admin.from("rate_limits").upsert({
      key,
      window_start: now.toISOString(),
      count: 1,
      expires_at: expiresAt.toISOString(),
    });
    return { allowed: true, remaining: limit - 1 };
  }

  // Check if within limit
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  await admin
    .from("rate_limits")
    .update({ count: existing.count + 1 })
    .eq("key", key);

  return { allowed: true, remaining: limit - existing.count - 1 };
}

export async function clearExpiredRateLimits(): Promise<void> {
  const admin = supabaseAdmin();
  const now = new Date();

  await admin
    .from("rate_limits")
    .delete()
    .lt("expires_at", now.toISOString());
}
