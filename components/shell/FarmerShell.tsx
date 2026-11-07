"use client";

/* Farmer shell: tab bar on phones, rail on wide screens (tokens 8.3).
   Ported from the mockup's FarmerApp, with the hash router replaced by the
   Next.js App Router. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Ic } from "@/components/ui/Ic";
import { Logo } from "@/components/ui/primitives";
import { useApp } from "@/lib/state";
import { cx } from "@/lib/utils";
import { t } from "@/lib/i18n/en";
import { unreadCount } from "@/lib/fixtures";
import { MoreSheet } from "@/components/shell/MoreSheet";

type NavItem = [key: string, label: string, icon: string];

const NAV: NavItem[] = [
  ["", "home", "SquaresFour"],
  ["entries", "entries", "Images"],
  ["analyze", "analyze", "Sparkle"],
  ["fields", "fields", "Polygon"],
  ["spaces", "spaces", "Stack"],
  ["analytics", "analytics", "ChartDonut"],
  ["tools", "tools", "Flask"],
  ["notifications", "notifications", "Bell"],
  ["settings", "settings", "Gear"],
];

const bpWide = (bp: string) => bp !== "xs" && bp !== "sm";

export function FarmerShell({
  children,
  base = "/farmer",
}: {
  children: ReactNode;
  /** Route prefix for nav links. Spectate mounts the same shell under /admin. */
  base?: string;
}) {
  const { bp, user, openSheet } = useApp();
  const pathname = usePathname();

  // /farmer/entries/e_1 -> ["entries","e_1"]
  const parts = pathname.replace(new RegExp("^" + base + "/?"), "").split("/").filter(Boolean);
  const cur = parts[0] || "";
  const wide = bpWide(bp);
  const focusMode =
    parts[0] === "analyze" || (parts[0] === "fields" && (parts[1] === "new" || parts[2] === "edit"));
  const showTab = !wide && !focusMode;
  const showRail = wide && !focusMode;
  const expanded = bp === "lg" || bp === "xl" || bp === "2xl";
  const nUnread = unreadCount(user.id);

  const href = (k: string) => (k ? `${base}/${k}` : base);

  return (
    <div className="farmer-root fill" style={{ ["--tabbar-h" as string]: showTab ? "88px" : "0px" }}>
      {showRail && (
        <nav className={cx("rail", expanded && "expanded")} aria-label="Primary">
          <div className="rail-head">
            <Logo />
            <span className="rl">Herra</span>
          </div>
          {NAV.map(([k, lb, ic]) => (
            <Link key={k} href={href(k)} className={cx("rail-item", cur === k && "on")}>
              <Ic n={ic} s={22} w={cur === k ? "bold" : "regular"} />
              <span className="rl">{t(lb)}</span>
              {lb === "notifications" && nUnread > 0 && <span className="cnt rl">{nUnread}</span>}
            </Link>
          ))}
          <div className="grow" />
          <Link
            href={`${base}/analyze`}
            className="btn primary block"
            style={{ padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Ic n="Sparkle" w="fill" s={20} />
            <span className="rl">New analysis</span>
          </Link>
        </nav>
      )}

      <div
        className={cx("scroll", showRail && (expanded ? "with-rail-x" : "with-rail"))}
        style={showRail ? { left: expanded ? "240px" : "72px" } : undefined}
      >
        {children}
      </div>

      {showTab && (
        <div className="tabbar" role="tablist">
          {(
            [
              ["", "home", "SquaresFour"],
              ["entries", "entries", "Images"],
            ] as NavItem[]
          ).map(([k, lb, ic]) => (
            <Link key={k} href={href(k)} className={cx("tab", cur === k && "on")}>
              <Ic n={ic} s={24} w={cur === k ? "fill" : "regular"} />
              {t(lb)}
            </Link>
          ))}
          <Link href={`${base}/analyze`} className="analyze-fab" aria-label="Analyze">
            <Ic n="Sparkle" w="fill" s={28} />
          </Link>
          {([["fields", "fields", "Polygon"]] as NavItem[]).map(([k, lb, ic]) => (
            <Link key={k} href={href(k)} className={cx("tab", cur === k && "on")}>
              <Ic n={ic} s={24} w={cur === k ? "fill" : "regular"} />
              {t(lb)}
            </Link>
          ))}
          <button
            className={cx(
              "tab",
              ["spaces", "analytics", "tools", "notifications", "settings"].includes(cur) && "on"
            )}
            onClick={() =>
              openSheet({ title: t("more"), render: (close) => <MoreSheet close={close} /> })
            }
          >
            <Ic n="DotsThree" s={24} w="bold" />
            {t("more")}
          </button>
        </div>
      )}
    </div>
  );
}
