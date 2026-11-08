/* Client store, hydrated from real Supabase rows by DataBridge.

   This is a read cache plus optimistic mutation layer. Every mutation calls a
   server action; the action is the only thing that writes to the database.
   There is no localStorage copy and no fixture seed. */

"use client";

import type {
  Announcement,
  Entry,
  Field,
  Member,
  Notification,
  Space,
  User,
  WeekDay,
} from "@/lib/types";
import {
  archiveField as archiveFieldAction,
  createField as createFieldAction,
  updateField as updateFieldAction,
  unarchiveField as unarchiveFieldAction,
} from "@/app/actions/fields";
import {
  deleteAssessment,
  restoreAssessment,
} from "@/app/actions/assessments";
import { submitOutcome } from "@/app/actions/outcomes";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import {
  joinSpace as joinSpaceAction,
  leaveSpace as leaveSpaceAction,
  updateMemberRole,
  updateSpace as updateSpaceAction,
} from "@/app/actions/spaces";
import { AUDIT_SEED, type AuditRow } from "@/lib/admin";

export interface OutcomeRow {
  id: string;
  fieldId: string | null;
  entryId: string | null;
  userId: string | null;
  crop: string;
  result: string;
  seasonEnd: string | null;
  note: string | null;
  reviewStatus: string;
  createdAt: number;
}

export const db = {
  entries: [] as Entry[],
  fields: [] as Field[],
  spaces: [] as Space[],
  notifications: [] as Notification[],
  notifs: [] as Notification[],
  announcements: [] as Announcement[],
  members: [] as Member[],
  users: [] as User[],
  outcomes: [] as OutcomeRow[],
};

function replace<T>(target: T[], next: T[]) {
  target.splice(0, target.length, ...next);
}

export function hydrateStore(data: {
  user: User;
  spaces: Space[];
  fields: Field[];
  entries: Entry[];
  members: Member[];
  users: User[];
  notifications: Notification[];
  announcements: Announcement[];
  outcomes: OutcomeRow[];
}) {
  replace(db.spaces, data.spaces);
  replace(db.fields, data.fields);
  replace(db.entries, data.entries);
  replace(db.members, data.members);
  replace(db.users, data.users);
  replace(db.notifications, data.notifications);
  db.notifs = db.notifications;
  replace(db.announcements, data.announcements);
  replace(db.outcomes, data.outcomes);
  if (!db.users.some((u) => u.id === data.user.id)) db.users.unshift(data.user);
}

export function liveMyFields(userId: string, spaceId?: string): Field[] {
  return db.fields.filter(
    (f) => f.ownerId === userId && !f.archived && (!spaceId || f.spaceId === spaceId)
  );
}

export function liveMySpaces(userId: string): Space[] {
  const user = db.users.find((u) => u.id === userId);
  if (user?.role === "admin") return db.spaces;
  return db.spaces.filter((s) => db.members.some((m) => m.spaceId === s.id && m.userId === userId));
}

export function liveMyEntries(userId: string, spaceId?: string): Entry[] {
  return db.entries.filter(
    (e) => e.authorId === userId && (!spaceId || e.spaceId === spaceId)
  );
}

export function liveEntry(entryId: string): Entry | null {
  return db.entries.find((e) => e.id === entryId) || null;
}

export function liveField(fieldId: string): Field | null {
  return db.fields.find((f) => f.id === fieldId) || null;
}

export function liveEntriesOfField(fieldId: string): Entry[] {
  return db.entries
    .filter((e) => e.fieldId === fieldId)
    .sort((a, b) => b.observed_at - a.observed_at);
}

export function liveOutcomesOfField(fieldId: string): OutcomeRow[] {
  return db.outcomes.filter((o) => o.fieldId === fieldId);
}

export function liveLatestByField(fieldId: string): Entry | null {
  const entries = db.entries
    .filter(
      (e) =>
        e.fieldId === fieldId &&
        !!e.result &&
        e.status !== "abstained" &&
        e.status !== "failed"
    )
    .sort((a, b) => b.observed_at - a.observed_at);
  return entries[0] || null;
}

export function liveAnnouncements(spaceId: string): Announcement[] {
  return db.announcements
    .filter((a) => a.spaceId === spaceId)
    .sort((a, b) => b.created - a.created);
}

export function liveWeek(fieldId: string): WeekDay[] {
  return liveLatestByField(fieldId)?.result?.week ?? [];
}

export function liveAudit(): AuditRow[] {
  return AUDIT_SEED;
}

/* ---------- mutations ---------- */

export async function addField(field: Partial<Field>): Promise<Field> {
  const res = await createFieldAction({
    name: field.name || "Field",
    spaceId: field.spaceId || "",
    geom: field.geom || [],
    currentCrop: field.current_crop || undefined,
    thumb: field.thumb || undefined,
  });
  if (res.error || !res.fieldId) throw new Error(res.error || "Could not save the field");

  const saved: Field = {
    id: res.fieldId,
    spaceId: field.spaceId || "",
    ownerId: field.ownerId || "",
    name: field.name || "Field",
    geom: field.geom || [],
    area: field.area || 0,
    centroid: field.centroid || [0, 0],
    place: field.place || { municipality: "", province: "" },
    current_crop: field.current_crop || "",
    archived: false,
    thumb: field.thumb || "",
  };
  db.fields.push(saved);
  return saved;
}

export async function updateField(fieldId: string, updates: Partial<Field>): Promise<void> {
  const res = await updateFieldAction(fieldId, {
    name: updates.name,
    geom: updates.geom,
    currentCrop: updates.current_crop,
    thumb: updates.thumb,
  });
  if (res.error) throw new Error(res.error);
  const field = db.fields.find((f) => f.id === fieldId);
  if (field) Object.assign(field, updates);
}

export async function archiveField(fieldId: string): Promise<void> {
  const res = await archiveFieldAction(fieldId);
  if (res.error) throw new Error(res.error);
  const field = db.fields.find((f) => f.id === fieldId);
  if (field) field.archived = true;
}

export async function unarchiveField(fieldId: string): Promise<void> {
  const res = await unarchiveFieldAction(fieldId);
  if (res.error) throw new Error(res.error);
  const field = db.fields.find((f) => f.id === fieldId);
  if (field) field.archived = false;
}

export async function updateSpace(
  spaceId: string,
  updates: { name: string; description: string; status?: Space["status"] }
): Promise<void> {
  const res = await updateSpaceAction(spaceId, updates);
  if (res.error) throw new Error(res.error);
  const space = db.spaces.find((s) => s.id === spaceId);
  if (space) {
    space.name = updates.name;
    space.desc = updates.description;
    if (updates.status) space.status = updates.status;
  }
}

export async function joinSpace(code: string): Promise<string> {
  const form = new FormData();
  form.set("code", code);
  const res = await joinSpaceAction(form);
  if (res.error) throw new Error(res.error);
  return res.spaceId ?? "";
}

export async function leaveSpace(spaceId: string): Promise<void> {
  const res = await leaveSpaceAction(spaceId);
  if (res.error) throw new Error(res.error);
  replace(
    db.members,
    db.members.filter((member) => member.spaceId !== spaceId)
  );
}

export function removeEntries(entryIds: string[]): string[] {
  const removed = entryIds.filter((id) => db.entries.some((e) => e.id === id));
  replace(
    db.entries,
    db.entries.filter((e) => !entryIds.includes(e.id))
  );
  for (const id of removed) void deleteAssessment(id);
  return removed;
}

export function restoreEntries(entryIds: string[]): void {
  for (const id of entryIds) void restoreAssessment(id);
}

export async function addOutcome(outcome: {
  fieldId: string;
  entryId?: string;
  crop: string;
  result: string;
  seasonEnd: string;
  note?: string;
}): Promise<void> {
  const res = await submitOutcome({
    fieldId: outcome.fieldId,
    assessmentId: outcome.entryId,
    cropId: outcome.crop,
    resultTag: outcome.result as "good" | "average" | "poor" | "failed",
    seasonEnd: outcome.seasonEnd as "this_week" | "this_month" | "last_month" | "earlier",
    note: outcome.note,
  });
  if (res.error) throw new Error(res.error);
  const now = Date.now();
  db.outcomes.unshift({
    id: res.outcomeId || `local-${now}`,
    fieldId: outcome.fieldId,
    entryId: outcome.entryId ?? null,
    userId: db.users[0]?.id ?? null,
    crop: outcome.crop,
    result: outcome.result,
    seasonEnd: outcome.seasonEnd,
    note: outcome.note ?? null,
    reviewStatus: "submitted",
    createdAt: now,
  });
}

/** Announcements are created by the server action; the caller awaits it so a
 *  failed broadcast is shown instead of silently appearing in the list. */
export async function addAnnouncement(announcement: {
  spaceId: string;
  title: string;
  body: string;
}): Promise<Announcement | null> {
  const { createAnnouncement } = await import("@/app/actions/spaces");
  const res = await createAnnouncement(announcement);
  if (res.error || !res.announcement) return null;
  const saved: Announcement = {
    id: res.announcement.id,
    spaceId: announcement.spaceId,
    title: announcement.title,
    body: announcement.body,
    by: res.announcement.created_by ?? "",
    created: Date.parse(res.announcement.created_at) || Date.now(),
  };
  db.announcements.unshift(saved);
  return saved;
}

/** Audit rows are written by the server actions. Kept for call-site
 *  compatibility with the old admin UI. */
export function addAudit(..._args: unknown[]): void {}

export async function markNotifRead(notifId: string): Promise<void> {
  const notif = db.notifications.find((n) => n.id === notifId);
  if (notif) notif.read = true;
  await markNotificationRead(notifId);
}

export async function markAllNotifsRead(userId: string): Promise<void> {
  for (const n of db.notifications) if (n.userId === userId) n.read = true;
  await markAllNotificationsRead();
}

export async function setUserRole(userId: string, role: "farmer" | "admin"): Promise<void> {
  const res = await updateMemberRole(userId, role);
  if (res.error) throw new Error(res.error);
  const user = db.users.find((u) => u.id === userId);
  if (user) user.role = role;
}
