"use client";

/* Hydrates the client store from the server bootstrap before the screen
   renders. This is a transport bridge, not a data source: every value in it
   came from Supabase in the parent layout. */

import type { ReactNode } from "react";
import { hydrateStore } from "@/lib/store";
import { hydrateAdmin } from "@/lib/admin";
import type { Bootstrap } from "@/lib/data/bootstrap";

export function DataBridge({ data, children }: { data: Bootstrap; children: ReactNode }) {
  hydrateStore({
    user: data.user,
    spaces: data.spaces,
    fields: data.fields,
    entries: data.entries,
    members: data.members,
    users: data.users,
    notifications: data.notifications,
    announcements: data.announcements,
    outcomes: data.outcomes,
  });
  if (data.admin) hydrateAdmin(data.admin);
  return <>{children}</>;
}
