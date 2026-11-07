/* Reads over Supabase. This module replaces the fixture/store reads the UI
   used before: same function names and shapes, real rows behind them.

   Everything here runs on the server (server components and actions) unless a
   caller passes a browser client. RLS decides what each caller may see; these
   queries do not add their own authorisation. */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/client";
import {
  toAnnouncement,
  toEntry,
  toField,
  toMember,
  toNotification,
  toSpace,
  toUser,
} from "@/lib/data/mappers";
import type { Announcement, Entry, Field, Member, Notification, Space, User } from "@/lib/types";

async function sb(client?: SupabaseClient) {
  return client ?? (await supabaseServer());
}

/* The geometry columns are PostGIS; PostgREST cannot serialise them directly,
   so every read selects a GeoJSON projection alongside the row. */
const SPACE_COLS = "*, boundary_geojson:st_asgeojson(boundary)";
const FIELD_COLS = "*, geom_geojson:st_asgeojson(geom)";

/* ---------- profiles ---------- */

export async function getUsers(client?: SupabaseClient): Promise<User[]> {
  const c = await sb(client);
  const { data, error } = await c.from("profiles").select("*").order("display_name");
  if (error) throw error;
  return (data ?? []).map(toUser);
}

export async function getUserById(id: string, client?: SupabaseClient): Promise<User | null> {
  const c = await sb(client);
  const { data, error } = await c.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toUser(data) : null;
}

/* ---------- spaces ---------- */

export async function getSpaces(client?: SupabaseClient): Promise<Space[]> {
  const c = await sb(client);
  const { data, error } = await c.from("spaces").select(SPACE_COLS).order("name");
  if (error) throw error;
  return (data ?? []).map(toSpace);
}

export async function getSpaceById(id: string, client?: SupabaseClient): Promise<Space | null> {
  const c = await sb(client);
  const { data, error } = await c.from("spaces").select(SPACE_COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toSpace(data) : null;
}

export async function getMySpaces(uid: string, client?: SupabaseClient): Promise<Space[]> {
  const c = await sb(client);
  const { data, error } = await c
    .from("space_members")
    .select(`space_id, spaces!inner(${SPACE_COLS})`)
    .eq("user_id", uid);
  if (error) throw error;
  return (data ?? []).map((r) =>
    toSpace((r as unknown as { spaces: Record<string, unknown> }).spaces)
  );
}

/* ---------- membership ---------- */

export async function getMembers(client?: SupabaseClient): Promise<Member[]> {
  const c = await sb(client);
  const { data, error } = await c.from("space_members").select("*");
  if (error) throw error;
  return (data ?? []).map(toMember);
}

export async function getMembersOf(spaceId: string, client?: SupabaseClient): Promise<Member[]> {
  const c = await sb(client);
  const { data, error } = await c.from("space_members").select("*").eq("space_id", spaceId);
  if (error) throw error;
  return (data ?? []).map(toMember);
}

/* ---------- fields ---------- */

export async function getFields(client?: SupabaseClient): Promise<Field[]> {
  const c = await sb(client);
  const { data, error } = await c
    .from("fields")
    .select(FIELD_COLS)
    .is("archived_at", null)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(toField);
}

export async function getMyFields(
  uid: string,
  spaceId?: string | null,
  client?: SupabaseClient
): Promise<Field[]> {
  const c = await sb(client);
  let q = c.from("fields").select(FIELD_COLS).eq("owner_id", uid).is("archived_at", null);
  if (spaceId) q = q.eq("space_id", spaceId);
  const { data, error } = await q.order("created_at");
  if (error) throw error;
  return (data ?? []).map(toField);
}

export async function getFieldById(id: string, client?: SupabaseClient): Promise<Field | null> {
  const c = await sb(client);
  const { data, error } = await c.from("fields").select(FIELD_COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toField(data) : null;
}

/* ---------- assessments ---------- */

export async function getEntries(client?: SupabaseClient): Promise<Entry[]> {
  const c = await sb(client);
  const { data, error } = await c
    .from("assessments")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toEntry);
}

export async function getMyEntries(uid: string, client?: SupabaseClient): Promise<Entry[]> {
  const c = await sb(client);
  const { data, error } = await c
    .from("assessments")
    .select("*")
    .eq("user_id", uid)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toEntry);
}

export async function getEntryById(id: string, client?: SupabaseClient): Promise<Entry | null> {
  const c = await sb(client);
  const { data, error } = await c.from("assessments").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toEntry(data) : null;
}

export async function getEntriesOfField(
  fieldId: string,
  client?: SupabaseClient
): Promise<Entry[]> {
  const c = await sb(client);
  const { data, error } = await c
    .from("assessments")
    .select("*")
    .eq("field_id", fieldId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toEntry);
}

/** The newest usable assessment per field, for the dashboard rings. */
export async function getLatestByField(
  fieldId: string,
  client?: SupabaseClient
): Promise<Entry | null> {
  const c = await sb(client);
  const { data, error } = await c
    .from("assessments")
    .select("*")
    .eq("field_id", fieldId)
    .is("deleted_at", null)
    .not("response", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toEntry(data) : null;
}

/* ---------- notifications ---------- */

export async function getNotifications(uid: string, client?: SupabaseClient): Promise<Notification[]> {
  const c = await sb(client);
  const { data, error } = await c
    .from("notifications")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toNotification);
}

export async function getUnreadCount(uid: string, client?: SupabaseClient): Promise<number> {
  const c = await sb(client);
  const { count, error } = await c
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

/* ---------- announcements ---------- */

export async function getAnnouncements(
  spaceId: string,
  client?: SupabaseClient
): Promise<Announcement[]> {
  const c = await sb(client);
  const { data, error } = await c
    .from("announcements")
    .select("*")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toAnnouncement);
}
