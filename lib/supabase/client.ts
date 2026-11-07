/* Supabase clients.

   Three lanes, matching blueprint 3.2 trust boundaries:
   - browser: anon key + RLS, used by client components
   - server:  cookie-bound session, used by server components and actions
   - admin:   service role, server-only, bypasses RLS. Never import this from
              a client component.

   The browser never sees the service role key. */

import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isConfigured() {
  return Boolean(URL && ANON);
}

function need() {
  if (!URL || !ANON) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }
  return { url: URL, anon: ANON };
}

/* ---------- browser ---------- */

export function supabaseBrowser() {
  const { url, anon } = need();
  return createBrowserClient(url, anon);
}

/* ---------- server (session-bound) ---------- */

export async function supabaseServer() {
  const { url, anon } = need();
  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: CookieToSet[]) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a server component: the middleware refreshes instead */
        }
      },
    },
  });
}

/* ---------- admin (service role) ---------- */

export function supabaseAdmin() {
  const { url } = need();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set; admin client unavailable.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
