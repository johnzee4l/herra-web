"use client";

/* Admin chrome gate. Spectate mounts the farmer shell full-bleed (mockup:
   AdminApp returns FarmerApp directly for /admin/spectate/:id), so the admin
   rail and top bar must not wrap it. Every other /admin route gets AdminShell.

   AppRoot lives here rather than in the layout so that the spectate route's
   own AppProvider is the one whose breakpoint state AppRoot measures. A
   provider nested inside another provider's AppRoot would never see a width
   and would stay stuck at the xs breakpoint. */

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppRoot } from "@/components/shell/AppRoot";
import { AdminShell } from "@/components/shell/AdminShell";

export function AdminChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin/spectate")) return <>{children}</>;
  return (
    <AppRoot>
      <AdminShell>{children}</AdminShell>
    </AppRoot>
  );
}
