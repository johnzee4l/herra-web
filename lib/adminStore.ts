/* Admin-side reads over the mutable demo store. The admin console sees every
   space, not just the signed-in farmer's, so it reads the store directly
   rather than through the per-user helpers in lib/store. */

import { db } from "@/lib/store";
import type { Entry, Field } from "@/lib/types";

export const liveEntries = (): Entry[] =>
  [...db.entries].sort((a, b) => b.observed_at - a.observed_at);

export const liveFields = (): Field[] => db.fields;

export const entriesOfSpace = (spaceId: string) =>
  liveEntries().filter((e) => e.spaceId === spaceId);

export const fieldById = (id: string) => db.fields.find((f) => f.id === id);
export const entryById = (id: string) => db.entries.find((e) => e.id === id);
