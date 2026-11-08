"use client";

import Link from "next/link";
import { Ic } from "@/components/ui/Ic";
import { t } from "@/lib/i18n/en";
import { signOut } from "@/app/actions/auth";

const ITEMS: [string, string, string][] = [
  ["spaces", "spaces", "Stack"],
  ["analytics", "analytics", "ChartDonut"],
  ["tools", "tools", "Flask"],
  ["notifications", "notifications", "Bell"],
  ["settings", "settings", "Gear"],
];

export function MoreSheet({ close }: { close: () => void }) {
  return (
    <div className="col">
      {ITEMS.map(([k, lb, ic]) => (
        <Link key={k} href={`/farmer/${k}`} className="rowitem hv" onClick={close}>
          <Ic n={ic} w="duotone" s={28} c="var(--primary)" />
          <span className="title-sm grow">{t(lb)}</span>
          <Ic n="CaretRight" s={16} c="var(--subtle)" />
        </Link>
      ))}
      <form action={signOut}>
        <button className="rowitem hv" type="submit">
          <Ic n="SignOut" w="duotone" s={28} c="var(--risk)" />
          <span className="title-sm grow c-risk">Sign out</span>
        </button>
      </form>
    </div>
  );
}
