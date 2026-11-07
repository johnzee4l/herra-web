"use client";

/* Session for the demo build.

   In the product this is Supabase Auth with @supabase/ssr cookies, and the
   role lives in profiles.role (blueprint 6.1). This build has no auth server,
   so the session is a client-side record. It gates the shells and picks the
   demo identity; it is NOT a security boundary and does not pretend to be.

   Sign-up always creates a farmer, matching the product rule. */

import { USERS } from "@/lib/fixtures";
import type { User } from "@/lib/types";

export interface Session {
  uid: string;
  role: "farmer" | "admin";
  email: string;
  name: string;
}

const KEY = "herra.session.v1";

export const DEMO = {
  farmer: USERS.find((u) => u.role === "farmer")!,
  admin: USERS.find((u) => u.role === "admin")!,
};

export function sessionFor(u: User): Session {
  return { uid: u.id, role: u.role, email: u.email, name: u.name };
}

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the session stays in memory for this page only */
  }
}

export function userFor(uid: string): User | undefined {
  return USERS.find((u) => u.id === uid);
}
