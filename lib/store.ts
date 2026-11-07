/* Reactive store layer - bridges frontend to Supabase backend
   This provides the functions the frontend expects while using server actions underneath */

"use client";

import type { Entry, Field, Space, Notification, Announcement } from "@/lib/types";

import type { Member, User } from "@/lib/types";
import { FIELDS, ENTRIES, SPACES, MEMBERS, USERS } from "@/lib/fixtures";
import { CROP_IDS } from "@/lib/spec/crops";

/* Mock database instance for compatibility */
export const db = {
  entries: [...ENTRIES] as Entry[],
  fields: [...FIELDS] as Field[],
  spaces: [...SPACES] as Space[],
  notifications: [] as Notification[],
  notifs: [] as Notification[], // Alias for notifications
  announcements: [] as Announcement[],
  members: [...MEMBERS] as Member[],
  users: [...USERS] as User[],
  outcomes: [] as any[],
};

/* Persist user-created rows in localStorage until the Supabase tables are
   connected. Fixture rows stay in the bundle and are never re-written, which
   keeps us clear of the storage quota.

   v2 drops entries produced by the 16-crop stub. Fields are migrated in
   place: a crop outside the champion roster becomes empty, not a crash. */
const LS_ENTRIES = "herra.mock.entries.v2";
const LS_FIELDS = "herra.mock.fields.v1";
const seedEntryIds = new Set(ENTRIES.map((e) => e.id));
const seedFieldIds = new Set(FIELDS.map((f) => f.id));

function validCrop(value: string | undefined): string {
  if (value === "corn") return "maize";
  return value && CROP_IDS.includes(value) ? value : "";
}

function readSaved<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeSaved(key: string, rows: unknown[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    /* Storage full or blocked - keep working in memory. */
  }
}

function persistEntries() {
  writeSaved(LS_ENTRIES, db.entries.filter((e) => !seedEntryIds.has(e.id)));
}

function persistFields() {
  writeSaved(LS_FIELDS, db.fields.filter((f) => !seedFieldIds.has(f.id)));
}

/* Hydrate saved rows once on the client. Entries whose ranking contains a
   crop outside the champion roster are dropped; fields are migrated. */
if (typeof window !== "undefined") {
  for (const e of readSaved<Entry>(LS_ENTRIES)) {
    const crops = [
      ...(e.result?.match ?? []),
      ...(e.result?.current ? [e.result.current] : []),
    ].map((c) => c.crop);
    if (crops.some((c) => !CROP_IDS.includes(c))) continue;
    if (!db.entries.some((x) => x.id === e.id)) db.entries.push(e);
  }
  for (const f of readSaved<Field>(LS_FIELDS)) {
    f.current_crop = validCrop(f.current_crop);
    if (!db.fields.some((x) => x.id === f.id)) db.fields.push(f);
  }
}

/* Live query functions - these will be replaced with real-time subscriptions */

export function liveMyFields(userId: string, spaceId?: string): Field[] {
  return db.fields.filter(f => f.ownerId === userId && (!spaceId || f.spaceId === spaceId));
}

export function liveMySpaces(userId: string): Space[] {
  return db.spaces;
}

export function liveMyEntries(userId: string, spaceId?: string): Entry[] {
  return db.entries.filter(e => e.authorId === userId && (!spaceId || e.spaceId === spaceId));
}

export function liveEntry(entryId: string): Entry | null {
  return db.entries.find(e => e.id === entryId) || null;
}

export function liveField(fieldId: string): Field | null {
  return db.fields.find(f => f.id === fieldId) || null;
}

export function liveEntriesOfField(fieldId: string): Entry[] {
  return db.entries.filter(e => e.fieldId === fieldId);
}

export function liveOutcomesOfField(fieldId: string): any[] {
  return [];
}

export function liveLatestByField(fieldId: string): Entry | null {
  const entries = db.entries
    .filter(e => e.fieldId === fieldId && e.status === "ready")
    .sort((a, b) => b.observed_at - a.observed_at);
  return entries[0] || null;
}

export function liveAnnouncements(spaceId: string): Announcement[] {
  return db.announcements.filter(a => a.spaceId === spaceId);
}

export function liveAudit(): any[] {
  return [];
}

/* Mutation functions - these call server actions */

export async function addEntry(entry: Partial<Entry>): Promise<Entry> {
  const newEntry = {
    ...entry,
    id: entry.id || crypto.randomUUID(),
  } as Entry;
  const existing = db.entries.findIndex((e) => e.id === newEntry.id);
  if (existing >= 0) db.entries[existing] = newEntry;
  else db.entries.push(newEntry);
  persistEntries();
  return newEntry;
}

export function addOutcome(outcome: any): void {
  // Call server action
}

export function addAnnouncement(announcement: Partial<Announcement>): Announcement {
  const newAnnouncement = {
    ...announcement,
    id: announcement.id || crypto.randomUUID(),
    created: announcement.created || Date.now(),
  } as Announcement;
  db.announcements.push(newAnnouncement);
  return newAnnouncement;
}

export function addAudit(action: string, targetType: string, targetId: string, meta?: any): void {
  // Call server action - would insert audit log entry
  console.log('Audit:', { action, targetType, targetId, meta });
}

export async function updateField(fieldId: string, updates: Partial<Field>): Promise<void> {
  const field = db.fields.find(f => f.id === fieldId);
  if (field) {
    Object.assign(field, updates);
    persistFields();
  }
}

export async function archiveField(fieldId: string): Promise<void> {
  const field = db.fields.find(f => f.id === fieldId);
  if (field) {
    field.archived = true;
    persistFields();
  }
}

export async function addField(field: Partial<Field>): Promise<Field> {
  const newField = {
    ...field,
    id: field.id || crypto.randomUUID(),
  } as Field;
  const existing = db.fields.findIndex((f) => f.id === newField.id);
  if (existing >= 0) db.fields[existing] = newField;
  else db.fields.push(newField);
  persistFields();
  return newField;
}

export function removeEntries(entryIds: string[]): string[] {
  const removed = entryIds.filter(id => db.entries.some(e => e.id === id));
  db.entries = db.entries.filter(e => !entryIds.includes(e.id));
  persistEntries();
  return removed;
}

export function restoreEntries(entryIds: string[]): void {
  // Restore from soft delete - in real implementation would unset deleted_at
  console.log('Restore entries:', entryIds);
}

export async function markNotifRead(notifId: string): Promise<void> {
  const notif = db.notifications.find(n => n.id === notifId);
  if (notif) {
    notif.read = true;
  }
}

export async function markAllNotifsRead(userId: string): Promise<void> {
  db.notifications.forEach(n => {
    if (n.userId === userId) {
      n.read = true;
    }
  });
}

export async function setUserRole(userId: string, role: "farmer" | "admin"): Promise<void> {
  // Call server action
}
