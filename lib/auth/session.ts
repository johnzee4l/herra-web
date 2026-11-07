/* Session helpers for server components and actions.

   Replaces the old client-side localStorage session (lib/session.ts), which
   was explicitly not a security boundary. Identity now comes from the
   Supabase session cookie and the role from profiles.role. */

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/client";
import type { User } from "@/lib/types";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "farmer" | "admin";
  settings: Record<string, unknown>;
}

/** The signed-in user with their profile, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile } = await sb
    .from("profiles")
    .select("id, role, display_name, settings")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    email: user.email ?? "",
    name: profile.display_name,
    role: profile.role,
    settings: profile.settings ?? {},
  };
}

/** Server-side gate: redirects to /sign-in when there is no session. */
export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/sign-in");
  return u;
}

/** Server-side gate: redirects a farmer away from the admin console. */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/farmer");
  return u;
}

/** Maps a profile row to the UI's User shape. */
export function toUiUser(s: SessionUser): User {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    status: "active",
  };
}
