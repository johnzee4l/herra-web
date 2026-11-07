"use client";

/* Admin console shell. Ported from the mockup's AdminApp: a collapsible rail,
   a top bar with the space filter, alerts and account menu, and the scrolling
   body. The hash router is replaced by the Next.js App Router. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Ic } from "@/components/ui/Ic";
import { Avatar, Logo, Pop, Sel } from "@/components/ui/primitives";
import { useApp } from "@/lib/state";
import { cx } from "@/lib/utils";
import { SPACES } from "@/lib/fixtures";
import { champion } from "@/lib/admin";

type RailItem = [key: string, label: string, icon: string];

const RAIL: RailItem[] = [
  ["", "Overview", "SquaresFour"],
  ["spaces", "Spaces", "Stack"],
  ["entries", "Entries", "Images"],
  ["analytics", "Analytics", "ChartDonut"],
  ["models", "Model Lab", "Cpu"],
  ["datasets", "Datasets", "Database"],
  ["data-health", "Data health", "Pulse"],
  ["crops", "Crop catalog", "Plant"],
  ["advisory", "Advisory", "ListChecks"],
  ["outcomes", "Outcomes", "Flag"],
  ["users", "Users", "Users"],
  ["audit", "Audit log", "ClockCounterClockwise"],
];

const bpNarrow = (bp: string) => bp === "xs" || bp === "sm" || bp === "md";

export function AdminShell({ children }: { children: ReactNode }) {
  const { bp, user, openSheet, toast } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const parts = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const cur = parts[0] || "";
  const narrow = bpNarrow(bp);
  const w = collapsed || narrow ? 72 : 240;
  const wide = w > 100;

  const champ = champion();

  const alerts = [
    { ic: "Pulse", tone: "heat", t: "SoilGrids probe breaker is half-open", to: "/admin/data-health" },
    { ic: "Flag", tone: "sky", t: "Outcomes await review", to: "/admin/outcomes" },
    ...(champ
      ? [{ ic: "Cpu", tone: "growth", t: "Candidate passed its gate", to: "/admin/models" }]
      : []),
  ];

  const href = (k: string) => (k ? `/admin/${k}` : "/admin");

  return (
    <div className="admin-main fill">
      <nav className="rail expanded" style={{ width: w, paddingTop: 18 }} aria-label="Admin">
        <div className="rail-head" style={{ paddingLeft: 6 }}>
          <Logo />
          {wide && <span>Herra</span>}
          {wide && (
            <span className="badge sky" style={{ marginLeft: "auto" }}>
              Admin
            </span>
          )}
        </div>

        {RAIL.map(([k, l, ic]) => (
          <Link
            key={k}
            href={href(k)}
            className={cx("rail-item", cur === k && "on")}
            title={l}
          >
            <Ic n={ic} s={22} w={cur === k ? "bold" : "regular"} />
            {wide && <span>{l}</span>}
          </Link>
        ))}

        <div className="grow" />

        <Link href="/admin/settings" className={cx("rail-item", cur === "settings" && "on")}>
          <Ic n="Gear" s={22} w={cur === "settings" ? "bold" : "regular"} />
          {wide && <span>Settings</span>}
        </Link>
        <button
          className="rail-item"
          onClick={() => setCollapsed((c) => !c)}
          style={{ width: "100%" }}
          aria-label={collapsed ? "Expand rail" : "Collapse rail"}
        >
          <Ic n={collapsed ? "CaretRight" : "CaretLeft"} s={22} />
          {wide && <span>Collapse</span>}
        </button>
      </nav>

      <div
        className="abs"
        style={{ left: w, right: 0, top: 0, bottom: 0, transition: "left .38s var(--ease-em)" }}
      >
        <div className="admin-main">
          <div className="admin-top">
            <div className="grow" />
            <div style={{ width: 190 }}>
              <Sel
                v={"all"}
                on={() => {
                  toast("Space filter applies to lists in this build", { icon: "Stack", tone: "sky" });
                }}
                opts={[{ k: "all", l: "All spaces" }, ...SPACES.map((s) => ({ k: s.id, l: s.name }))]}
              />
            </div>

            <Pop
              align="right"
              btn={(tg) => (
                <button className="iconbtn bordered sm" aria-label="Alerts" onClick={tg}>
                  <Ic n="Bell" s={18} />
                  <span className="badge-n" style={{ top: -4, right: -4 }}>
                    {alerts.length}
                  </span>
                </button>
              )}
            >
              {alerts.map((a) => (
                <button key={a.t} onClick={() => router.push(a.to)}>
                  <Ic n={a.ic} w="fill" s={18} c={`var(--${a.tone})`} />
                  <span style={{ whiteSpace: "normal", textAlign: "left", fontWeight: 550 }}>{a.t}</span>
                </button>
              ))}
            </Pop>

            <Pop
              align="right"
              btn={(tg) => (
                <button onClick={tg} aria-label="Account">
                  <Avatar u={user} sz="sm" />
                </button>
              )}
            >
              <div className="mlabel label">{user.name}</div>
              <button onClick={() => router.push("/admin/settings")}>
                <Ic n="Gear" s={18} />
                Settings
              </button>
              <button onClick={() => router.push("/admin/audit")}>
                <Ic n="ClockCounterClockwise" s={18} />
                Audit log
              </button>
              <hr />
              <button className="danger" onClick={() => openSheet({ title: "Sign out", render: () => <div className="muted">Sign-out is wired to Supabase Auth in the product.</div> })}>
                <Ic n="SignOut" s={18} />
                Sign out
              </button>
            </Pop>
          </div>

          <div className="admin-body">
            <div className="admin-scroll">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Page frame for every admin screen: title, subtitle, breadcrumbs, actions. */
export function AdminPage({
  title,
  sub,
  right,
  crumbs = [],
  children,
}: {
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
  crumbs?: [string, string][];
  children?: ReactNode;
}) {
  return (
    <div className="page-in wide">
      <div className="row between wrap g4" style={{ marginBottom: 24 }}>
        <div style={{ minWidth: 0 }}>
          {crumbs.length > 0 && (
            <div className="row g2 caption" style={{ marginBottom: 6 }}>
              {crumbs.map(([l, to], i) => (
                <span key={to} className="row g2">
                  {i > 0 && <Ic n="CaretRight" s={11} w="bold" />}
                  <Link href={to} className="muted" style={{ fontWeight: 600 }}>
                    {l}
                  </Link>
                </span>
              ))}
            </div>
          )}
          <div className="display-md" style={{ fontSize: 32 }}>
            {title}
          </div>
          {sub && <div className="muted mt1">{sub}</div>}
        </div>
        <div className="row g2 wrap">{right}</div>
      </div>
      {children}
    </div>
  );
}

