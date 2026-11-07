/* Daily cron job (Blueprint section 13)
   
   Runs once daily via Vercel cron:
   - Keep database alive (prevent Supabase Free pause)
   - Send weather alerts (P2)
   - Delete soft-deleted assessments older than 30 days
   - Purge old rate_limits rows
*/

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { clearExpiredRateLimits } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  // Verify cron secret (Blueprint section 13)
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const results: Record<string, any> = {};

  try {
    // 1. Keep database alive (cheap query to prevent pause)
    const { data: keepAlive } = await admin
      .from("profiles")
      .select("id")
      .limit(1)
      .single();
    
    results.keepAlive = keepAlive ? "ok" : "failed";

    // 2. Delete soft-deleted assessments older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: deletedCount } = await admin
      .from("assessments")
      .delete()
      .not("deleted_at", "is", null)
      .lt("deleted_at", thirtyDaysAgo.toISOString());

    results.deletedAssessments = deletedCount || 0;

    // 3. Purge expired rate limits
    await clearExpiredRateLimits();
    results.rateLimitsPurged = "ok";

    // 4. Weather alerts (P2 - stub for now)
    // TODO: Implement when weather alerts feature is built
    results.weatherAlerts = "deferred";

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results,
      },
      { status: 500 }
    );
  }
}
