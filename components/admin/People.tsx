"use client";

/* Admin entries, analytics, outcomes, users and the audit log. Transcribed
   from the mockup's AdminEntries, AdminAnalytics, OutcomeQueue, UsersAdmin
   and AuditLog. */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Ic } from "@/components/ui/Ic";
import { CropIcon } from "@/components/ui/CropIcon";
import {
  Avatar,
  Badge,
  Btn,
  Chip,
  Dot,
  Empty,
  Meter,
  Paginate,
  Ring,
  Seg,
  SegBar,
  SecHead,
  Sel,
  Skel,
  Table,
  useLoad,
} from "@/components/ui/primitives";
import { useConfirm } from "@/components/ui/overlays";
import { AdminPage } from "@/components/shell/AdminShell";
import { useApp } from "@/lib/state";
import { cx, fnum } from "@/lib/utils";
import { ago, fDT } from "@/lib/units/format";
import { CROPS } from "@/lib/spec/crops";
import { getUser, topOf } from "@/lib/fixtures";
import { liveEntries, liveFields } from "@/lib/adminStore";
import { AUDIT_ICON, type AuditRow } from "@/lib/admin";
import { addAudit, db, liveAudit, setUserRole } from "@/lib/store";
import { useDb } from "@/lib/useDb";
import type { User } from "@/lib/types";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- entries ---------- */

export function AdminEntries() {
  const router = useRouter();
  const [view, setView] = useState<"table" | "grid">("table");
  const [kind, setKind] = useState("all");
  const [stt, setStt] = useState("all");
  const [q, setQ] = useState("");
  const [pg, setPg] = useState(0);
  const loading = useLoad("aent", 550);

  const all = liveEntries();
  const list = all.filter(
    (e) =>
      (kind === "all" || e.kind === kind) &&
      (stt === "all" || e.status === stt) &&
      (!q ||
        (
          (liveFields().find((f) => f.id === e.fieldId)?.name ?? "") +
          (getUser(e.authorId)?.name ?? "")
        )
          .toLowerCase()
          .includes(q.toLowerCase()))
  );
  const pages = Math.max(1, Math.ceil(list.length / 10));
  const page = list.slice(pg * 10, pg * 10 + 10);

  return (
    <AdminPage
      title="Entries"
      sub={`${list.length} entries · all spaces`}
      right={
        <Seg
          sm
          opts={[
            { k: "table", l: "Table", i: "Rows" },
            { k: "grid", l: "Gallery", i: "GridFour" },
          ]}
          v={view}
          on={setView}
        />
      }
    >
      <div className="row g3 wrap" style={{ marginBottom: 16 }}>
        <div className="input-group" style={{ width: 260 }}>
          <Ic n="MagnifyingGlass" s={18} />
          <input
            placeholder="Field or farmer"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPg(0);
            }}
          />
        </div>
        <Seg
          sm
          opts={[
            { k: "all", l: "All" },
            { k: "recommend", l: "Recommend" },
            { k: "checkup", l: "Check-up" },
          ]}
          v={kind}
          on={(k) => {
            setKind(k);
            setPg(0);
          }}
        />
        <div className="pill-tabs">
          {["all", "ready", "degraded", "abstained", "failed"].map((k) => (
            <Chip
              key={k}
              sm
              on={stt === k}
              onClick={() => {
                setStt(k);
                setPg(0);
              }}
            >
              {cap(k)}
            </Chip>
          ))}
        </div>
      </div>

      {loading ? (
        <Skel h={420} r="16px" />
      ) : view === "grid" ? (
        <div className="egrid f5">
          {page.map((e) => (
            <button
              key={e.id}
              className="card hov"
              style={{ textAlign: "left" }}
              onClick={() => router.push(`/admin/entries/${e.id}`)}
            >
              <div className="thumb" style={{ aspectRatio: "16/10" }}>
                <div className="tbg" style={{ backgroundImage: `url("${e.photo.url}")` }} />
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div className="title-sm ellip">
                  {liveFields().find((f) => f.id === e.fieldId)?.name}
                </div>
                <div className="caption">{ago(e.observed_at)}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Table
          cols={[
            {
              h: "Entry",
              r: (e) => (
                <div className="row g3">
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: `url("${e.photo.url}") center/cover`,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 650 }}>
                      {liveFields().find((f) => f.id === e.fieldId)?.name}
                    </div>
                    <div className="caption">
                      {liveFields().find((f) => f.id === e.fieldId)?.place.municipality}
                    </div>
                  </div>
                </div>
              ),
            },
            { h: "Farmer", r: (e) => getUser(e.authorId)?.name ?? "—" },
            {
              h: "Kind",
              r: (e) => (
                <Badge icon={e.kind === "recommend" ? "Sparkle" : "Heartbeat"}>
                  {e.kind === "recommend" ? "Recommend" : "Check-up"}
                </Badge>
              ),
            },
            {
              h: "Result",
              r: (e) => {
                const tp = topOf(e);
                if (tp)
                  return (
                    <span className="row g2">
                      <CropIcon id={tp.crop} s={26} />
                      {CROPS[tp.crop].name} <b>{tp.match_pct}%</b>
                    </span>
                  );
                const h = e.result?.health;
                return h ? <Badge tone="growth">{h.band} {h.index}</Badge> : <span>—</span>;
              },
            },
            {
              h: "Reliability",
              r: (e) =>
                e.result ? (
                  <Badge tone={e.result.reliability.tier === "high" ? "growth" : e.result.reliability.tier === "medium" ? "heat" : "risk"}>
                    {cap(e.result.reliability.tier)}
                  </Badge>
                ) : (
                  "—"
                ),
            },
            {
              h: "Status",
              r: (e) => (
                <span className="row g1">
                  <Dot s={e.status === "ready" ? "ok" : e.status === "degraded" ? "warn" : "bad"} />
                  {cap(e.status)}
                </span>
              ),
            },
            { h: "When", r: (e) => <span className="caption">{ago(e.observed_at)}</span> },
          ]}
          rows={page}
          onRow={(e) => router.push(`/admin/entries/${e.id}`)}
          empty="No entries match"
        />
      )}
      <Paginate page={pg} pages={pages} on={setPg} />
    </AdminPage>
  );
}

/* ---------- analytics ---------- */

export function AdminAnalytics() {
  const [rg, setRg] = useState(30);
  const es = liveEntries().filter(
    (e) => e.result && e.status !== "failed" && Date.now() - e.observed_at < rg * 864e5
  );

  const rec = es.filter((e) => topOf(e));
  const avgSuit = rec.length
    ? Math.round(rec.reduce((a, e) => a + topOf(e)!.match_pct, 0) / rec.length)
    : 0;
  const relIndex = es.length
    ? Math.round(
        es.reduce((total, e) => {
          const tier = e.result!.reliability.tier;
          return total + (tier === "high" ? 100 : tier === "medium" ? 65 : 25);
        }, 0) / es.length
      )
    : 0;

  return (
    <AdminPage
      title="Analytics"
      sub="Cross-space ring metrics and statistical reports."
      right={
        <Seg
          sm
          opts={[
            { k: "7", l: "7 d" },
            { k: "30", l: "30 d" },
            { k: "90", l: "90 d" },
          ]}
          v={String(rg)}
          on={(k) => setRg(+k)}
        />
      }
    >
      <div className="rings" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
        <Ring id="an1" value={es.length} max={Math.max(20, es.length)} size={104} label="Entries" color="var(--water)" />
        <Ring id="an2" value={avgSuit} size={104} suffix="%" label="Avg suitability" color="var(--primary)" />
        <Ring
          id="an3"
          value={relIndex}
          size={104}
          suffix="%"
          label="Reliability index"
          color="var(--growth)"
        />
        <Ring id="an4" value={rec.length} max={Math.max(10, rec.length)} size={104} label="Recommend runs" color="var(--sky)" />
      </div>

      <div className="mt8">
        <SecHead label="By space" />
        <Table
          cols={[
            { h: "Space", r: (sp) => <b>{sp.name}</b> },
            { h: "Entries", num: true, r: (sp) => es.filter((e) => e.spaceId === sp.id).length },
            {
              h: "Avg suitability",
              num: true,
              r: (sp) => {
                const m = es.filter((e) => e.spaceId === sp.id && topOf(e)).map((e) => topOf(e)!.match_pct);
                return m.length ? Math.round(m.reduce((a, b) => a + b, 0) / m.length) + "%" : "—";
              },
            },
            {
              h: "Reliability mix",
              r: (sp) => {
                const x = es.filter((e) => e.spaceId === sp.id);
                const c = { high: 0, medium: 0, low: 0 };
                x.forEach((e) => c[e.result!.reliability.tier]++);
                return (
                  <div style={{ width: 160 }}>
                    <SegBar
                      h={8}
                      items={[
                        { v: c.high, c: "var(--growth)", l: "High" },
                        { v: c.medium, c: "var(--heat)", l: "Medium" },
                        { v: c.low, c: "var(--risk)", l: "Low" },
                      ]}
                    />
                  </div>
                );
              },
            },
          ]}
          rows={[...new Set(es.map((e) => e.spaceId))].map((id) => ({
            id,
            name: db.spaces.find((space) => space.id === id)?.name ?? "Unknown space",
          }))}
        />
      </div>
    </AdminPage>
  );
}

/* ---------- outcomes ---------- */

export function OutcomeQueue() {
  const { toast } = useApp();
  const [reviewed, setReviewed] = useState<string[]>([]);
  const os = db.outcomes;
  const submitted = os.filter((o) => !reviewed.includes(o.id));

  return (
    <AdminPage
      title="Outcomes"
      sub="Farmer-reported results for review. Review has no effect on any model or on current results."
    >
      <div className="row g8 wrap" style={{ marginBottom: 28 }}>
        <Ring
          id="oq1"
          value={reviewed.length}
          max={Math.max(1, os.length)}
          size={96}
          label="Reviewed"
          color="var(--growth)"
          center={<span style={{ font: "250 30px var(--font-display)" }}>{reviewed.length}</span>}
        />
        <Ring
          id="oq2"
          value={submitted.length}
          max={Math.max(1, os.length)}
          size={96}
          label="Submitted"
          color="var(--heat)"
          center={<span style={{ font: "250 30px var(--font-display)" }}>{submitted.length}</span>}
        />
        <Ring
          id="oq3"
          value={0}
          max={Math.max(1, os.length)}
          size={96}
          label="Rejected"
          color="var(--risk)"
          center={<span style={{ font: "250 30px var(--font-display)" }}>0</span>}
        />
      </div>

      {submitted.length ? (
        <div>
          {submitted.map((o) => (
            <div
              key={o.id}
              className="rowitem"
              style={{ cursor: "default", alignItems: "flex-start", flexWrap: "wrap" }}
            >
              <CropIcon id={o.crop} s={48} />
              <div className="grow" style={{ minWidth: 220 }}>
                <div className="title-sm">
                  {(o.userId ? getUser(o.userId)?.name : null) ?? "Farmer"} ·{" "}
                  {liveFields().find((f) => f.id === o.fieldId)?.name ?? ""}
                </div>
                <div className="body-sm muted">
                  Planted <b>{CROPS[o.crop]?.name ?? o.crop}</b> · reported <b>{o.result}</b> · season
                  ended {o.seasonEnd}
                </div>
                {o.note && (
                  <div className="body-sm mt1" style={{ fontStyle: "italic" }}>
                    “{o.note}”
                  </div>
                )}
              </div>
              <div className="row g2">
                <Btn
                  sz="sm"
                  icon="Check"
                  onClick={() => {
                    setReviewed((r) => [...r, o.id]);
                    toast("Marked reviewed. No effect on any model or result.", { icon: "ShieldCheck" });
                  }}
                >
                  Mark reviewed
                </Btn>
                <Btn
                  sz="sm"
                  cls="secondary"
                  icon="X"
                  onClick={() => {
                    setReviewed((r) => [...r, o.id]);
                    toast("Outcome rejected", { icon: "Prohibit", tone: "risk" });
                  }}
                >
                  Reject
                </Btn>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty icon="ShieldCheck" title="Nothing to review" sub="New outcomes from farmers appear here." />
      )}
    </AdminPage>
  );
}

/* ---------- users ---------- */

export function UsersAdmin() {
  const [q, setQ] = useState("");
  const [pg, setPg] = useState(0);
  const router = useRouter();
  const { user: me, toast } = useApp();
  const confirm = useConfirm();
  useDb();
  const us = db.users.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase()));
  const pages = Math.max(1, Math.ceil(us.length / 10));

  const setRole = (u: User, role: User["role"]) => {
    if (u.id === me.id && role !== "admin") {
      toast("You can't demote yourself", { icon: "Prohibit", tone: "risk" });
      return;
    }
    confirm({
      title: `Make ${u.name} ${role === "admin" ? "an admin" : "a farmer"}?`,
      body:
        role === "admin"
          ? "Admins can see every space, entry and audit record."
          : "They lose all admin access immediately.",
      confirm: "Change role",
      tone: "primary",
      icon: "Users",
      onOk: () => {
        setUserRole(u.id, role);
        addAudit("change_role", "user", u.id, role);
        toast(`${u.name} is now ${role}`, { icon: "Users" });
      },
    });
  };

  return (
    <AdminPage title="Users" sub={`${db.users.length} accounts`}>
      <div className="input-group" style={{ maxWidth: 320, marginBottom: 16 }}>
        <Ic n="MagnifyingGlass" s={18} />
        <input
          placeholder="Search name or email"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPg(0);
          }}
        />
      </div>
      <Table
        cols={[
          {
            h: "User",
            r: (u) => (
              <div className="row g3">
                <Avatar u={u} sz="sm" />
                <div>
                  <b>{u.name}</b>
                  <div className="caption">{u.email}</div>
                </div>
              </div>
            ),
          },
          {
            h: "Role",
            r: (u) => (
              <div style={{ width: 130 }}>
                <Sel
                  v={u.role}
                  on={(v) => v !== u.role && setRole(u, v)}
                  opts={[
                    { k: "farmer", l: "Farmer" },
                    { k: "admin", l: "Admin" },
                  ]}
                />
              </div>
            ),
          },
          { h: "Spaces", num: true, r: (u) => db.members.filter((m) => m.userId === u.id).length },
          {
            h: "Status",
            r: (u) => (
              <Badge tone={u.status === "invited" ? "heat" : "growth"}>{cap(u.status ?? "active")}</Badge>
            ),
          },
          { h: "Last active", r: (u) => (u.active ? ago(u.active) : "—") },
          {
            h: "",
            num: true,
            r: (u) =>
              u.role === "farmer" ? (
                <Btn sz="sm" cls="ghost" icon="Eye" onClick={() => router.push(`/admin/spectate/${u.id}`)}>
                  Spectate
                </Btn>
              ) : null,
          },
        ]}
        rows={us.slice(pg * 10, pg * 10 + 10)}
      />
      <Paginate page={pg} pages={pages} on={setPg} />
    </AdminPage>
  );
}

/* ---------- audit ---------- */

export function AuditLog() {
  const [fa, setFa] = useState("all");
  const [fact, setFact] = useState("all");
  const [ft, setFt] = useState("all");
  const [pg, setPg] = useState(0);
  useDb();

  const ROWS = liveAudit();
  const A = ROWS.filter(
    (a) =>
      (fa === "all" || a.actor === fa) &&
      (fact === "all" || a.action === fact) &&
      (ft === "all" || a.type === ft)
  );
  const pages = Math.max(1, Math.ceil(A.length / 12));

  const actors = ["all", ...new Set(ROWS.map((a) => a.actor))];
  const acts = ["all", ...new Set(ROWS.map((a) => a.action))];
  const types = ["all", ...new Set(ROWS.map((a) => a.type))];

  return (
    <AdminPage title="Audit log" sub="Every admin and privileged action, newest first. Insert-only.">
      <div className="row g4 wrap" style={{ marginBottom: 16 }}>
        <div style={{ minWidth: 180 }}>
          <select className="input" value={fa} onChange={(e) => { setFa(e.target.value); setPg(0); }}>
            {actors.map((k) => (
              <option key={k} value={k}>
                {k === "all" ? "All actors" : getUser(k)?.name ?? k}
              </option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 200 }}>
          <select className="input" value={fact} onChange={(e) => { setFact(e.target.value); setPg(0); }}>
            {acts.map((k) => (
              <option key={k} value={k}>
                {k === "all" ? "All actions" : k.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 160 }}>
          <select className="input" value={ft} onChange={(e) => { setFt(e.target.value); setPg(0); }}>
            {types.map((k) => (
              <option key={k} value={k}>
                {k === "all" ? "All targets" : k}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Table<AuditRow>
        cols={[
          {
            h: "When",
            r: (a) => (
              <div>
                <div style={{ fontWeight: 600 }}>{ago(a.ts)}</div>
                <div className="caption">{fDT(a.ts)}</div>
              </div>
            ),
          },
          {
            h: "Actor",
            r: (a) => (
              <span className="row g2">
                <Avatar u={getUser(a.actor)} sz="sm" />
                {getUser(a.actor)?.name ?? "—"}
              </span>
            ),
          },
          {
            h: "Action",
            r: (a) => (
              <span className="row g2">
                <Ic n={AUDIT_ICON[a.action] ?? "Lightning"} w="duotone" s={20} c="var(--primary)" />
                <b>{a.action.replace(/_/g, " ")}</b>
              </span>
            ),
          },
          {
            h: "Target",
            r: (a) => (
              <span className="mono" style={{ fontSize: 12 }}>
                {a.type}:{String(a.target).slice(0, 22)}
              </span>
            ),
          },
          { h: "Detail", r: (a) => <span className="caption">{a.meta}</span> },
        ]}
        rows={A.slice(pg * 12, pg * 12 + 12)}
      />
      <Paginate page={pg} pages={pages} on={setPg} />
    </AdminPage>
  );
}

