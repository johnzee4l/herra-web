"use client";

/* Admin overview and spaces. Transcribed from the mockup's AdminOverview,
   SpacesAdmin, SpaceHub and its tabs. The map is the shared MapView; the
   activity feed is generated deterministically from the fixture set. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Ic } from "@/components/ui/Ic";
import { CropIcon } from "@/components/ui/CropIcon";
import {
  Avatar,
  AvatarStack,
  Badge,
  BlurFade,
  Btn,
  Chip,
  Dot,
  Empty,
  Field,
  Meter,
  Paginate,
  Ring,
  Seg,
  SegRing,
  SecHead,
  Skel,
  StatRow,
  Table,
  useLoad,
} from "@/components/ui/primitives";
import { AdminPage } from "@/components/shell/AdminShell";
import MapView from "@/components/map/MapView";
import { useApp } from "@/lib/state";
import { cx, fnum, hashStr, sum } from "@/lib/utils";
import { fA, fDay, ago } from "@/lib/units/format";
import { CROPS } from "@/lib/spec/crops";
import { ENTRIES, FIELDS, MEMBERS, SPACES, getUser, membersOf, topOf } from "@/lib/fixtures";
import { liveEntries, liveFields } from "@/lib/adminStore";
import { addAnnouncement, addAudit, db, liveAnnouncements } from "@/lib/store";
import { useDb } from "@/lib/useDb";
import { MODEL_META } from "@/lib/hi/model-meta";

const DAY = 864e5;

/* ---------- shared stats ---------- */

export function spaceStats(spaceId: string) {
  const es = liveEntries().filter((e) => e.spaceId === spaceId);
  const withResult = es.filter((e) => e.result && e.status !== "failed");
  return {
    mem: MEMBERS.filter((m) => m.spaceId === spaceId).length,
    fields: liveFields().filter((f) => f.spaceId === spaceId && !f.archived).length,
    entries: es.length,
    e30: es.filter((e) => Date.now() - e.observed_at < 30 * DAY).length,
    rel: withResult.length
      ? withResult.filter((e) => e.result!.reliability.tier === "high").length / withResult.length
      : 0,
  };
}

/* Deterministic activity feed, so a reload shows the same rows. */
function feed(n: number) {
  const r = (i: number) => (hashStr("feed" + i) % 1000) / 1000;
  return Array.from({ length: n }, (_, i) => {
    const f = liveFields()[Math.floor(r(i) * liveFields().length)];
    const u = getUser(f.ownerId);
    const sp = SPACES.find((s) => s.id === f.spaceId);
    const kind = r(i + 40) > 0.4 ? "Recommend" : "Check-up";
    const crop = f.current_crop;
    return {
      id: "fd" + i,
      who: u ? u.name.split(" ")[0] : "Farmer",
      field: f.name,
      space: sp ? sp.name : "",
      kind,
      crop,
      res:
        kind === "Recommend"
          ? `${CROPS[crop].name} ${60 + Math.floor(r(i + 7) * 28)}%`
          : `Health ${48 + Math.floor(r(i + 9) * 46)}`,
      ago: `${1 + Math.floor(r(i + 3) * 9)} min`,
    };
  });
}

/* ---------- overview ---------- */

export function AdminOverview() {
  const router = useRouter();
  const { settings } = useApp();
  const loading = useLoad("aov", 650);

  const es = liveEntries().filter((e) => e.status !== "failed");
  const e30 = es.filter((e) => Date.now() - e.observed_at < 30 * DAY);
  const withResult = es.filter((e) => e.result);
  const rel = withResult.length
    ? withResult.filter((e) => e.result!.reliability.tier === "high").length / withResult.length
    : 0;

  const farmers = new Set(MEMBERS.map((m) => m.userId)).size;
  const fields = liveFields().filter((f) => !f.archived).length;

  const dist = useMemo(() => {
    const d: Record<string, number> = {};
    es.filter((e) => e.kind === "recommend" && topOf(e)).forEach((e) => {
      const c = topOf(e)!.crop;
      d[c] = (d[c] || 0) + 1;
    });
    return Object.entries(d).sort((a, b) => b[1] - a[1]);
  }, [es]);

  const pal = [
    "var(--cereal)",
    "var(--vegetable)",
    "var(--plantation)",
    "var(--fruit)",
    "var(--root)",
    "var(--fiber)",
    "var(--legume)",
    "var(--herb)",
  ];

  const rows = feed(5);
  const theme = settings.theme === "light" ? "light" : "dark";

  return (
    <AdminPage
      title="Overview"
      sub={`${fDay(Date.now())} · all spaces`}
      right={
        <Btn sz="sm" icon="PenNib" onClick={() => router.push("/admin/spaces/new")}>
          New space
        </Btn>
      }
    >
      <div className="rings" style={{ gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 20 }}>
        {loading
          ? [0, 1, 2, 3, 4, 5].map((i) => <Skel key={i} h={130} r="20px" />)
          : [
              ["Spaces", SPACES.length, 8, "var(--primary)"],
              ["Farmers", farmers, 40, "var(--sky)"],
              ["Fields", fields, 50, "var(--soil)"],
              ["Entries · 30 d", e30.length, 100, "var(--water)"],
            ].map(([l, v, m, c]) => (
              <Ring
                key={String(l)}
                id={"ao" + l}
                value={v as number}
                max={m as number}
                size={100}
                stroke={8}
                color={c as string}
                label={l as string}
              />
            ))}
        {!loading && (
          <Ring
            id="aor"
            value={Math.round(rel * 100)}
            size={100}
            stroke={8}
            color="var(--growth)"
            suffix="%"
            label="High reliability"
          />
        )}
        {!loading && (
          <Ring
            id="aoc"
            value={Math.round(MODEL_META.metrics.macro_f1 * 100)}
            size={100}
            stroke={8}
            color="var(--growth)"
            label="Serving model"
            sub="XGB 2026-11-07"
            center={<Ic n="Cpu" w="duotone" s={34} c="var(--growth)" />}
            onClick={() => router.push("/admin/data-health")}
          />
        )}
      </div>

      <div className="twocol e84 mt8" style={{ gap: 32 }}>
        <div>
          <SecHead label="Coverage" />
          <MapView
            height={420}
            center={[13.15, 121.35]}
            zoom={9}
            spaces={SPACES}
            fit={SPACES.map((x) => x.boundary).flat()}
          />
        </div>
        <div>
          <SecHead label="Crop distribution" />
          {dist.length ? (
            <div className="col g4">
              <div className="center">
                <SegRing
                  items={dist.slice(0, 8).map(([c, n], i) => ({ v: n, c: pal[i % 8] }))}
                  size={150}
                  stroke={16}
                  center={
                    <div className="tc">
                      <div className="metric-md">{sum(dist.map((x) => x[1]))}</div>
                      <div className="caption">top picks</div>
                    </div>
                  }
                />
              </div>
              {dist.slice(0, 5).map(([c, n], i) => (
                <div key={c} className="row g3" style={{ padding: "6px 0" }}>
                  <i
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: pal[i % 8],
                    }}
                  />
                  <CropIcon id={c} s={26} />
                  <span className="grow" style={{ fontWeight: 600 }}>
                    {CROPS[c].name}
                  </span>
                  <span className="mono muted">{n}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No data" />
          )}
        </div>
      </div>

      <div className="mt8">
        <SecHead
          label="Data health"
          right={
            <Link href="/admin/data-health" className="body-sm primary-c" style={{ fontWeight: 650 }}>
              Details
            </Link>
          }
        />
        <div className="row g6 wrap" style={{ padding: "8px 0" }}>
          {[
            ["SoilGrids", "ok", false, "412 ms · 0.1%"],
            ["ERA5-Land", "ok", false, "388 ms · 0.0%"],
            ["Copernicus DEM", "warn", true, "512 ms · 0.4%"],
            ["Open-Meteo", "ok", false, "214 ms · 0.0%"],
            ["Photon", "ok", false, "362 ms · 0.2%"],
          ].map(([name, s, live, meta]) => (
            <div key={String(name)} className="row g2">
              <Dot s={s as string} live={live as boolean} />
              <div>
                <div className="body-sm" style={{ fontWeight: 650 }}>
                  {name}
                </div>
                <div className="caption">{meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="twocol mt8" style={{ gap: 32 }}>
        <div>
          <SecHead label="Latest entries" />
          <div className="strip hide-sb" style={{ margin: 0, padding: "0 0 4px" }}>
            {es.slice(0, 6).map((e) => (
              <div key={e.id} style={{ width: 176 }}>
                <button
                  className="card hov"
                  style={{ width: "100%", textAlign: "left" }}
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
              </div>
            ))}
          </div>
        </div>
        <div>
          <SecHead label="Recent activity" right={<span className="caption">refreshed on load</span>} />
          <div className="live-feed">
            {rows.map((x) => (
              <div
                key={x.id}
                className="row g3"
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid color-mix(in oklab,var(--divider) 45%,transparent)",
                }}
              >
                <CropIcon id={x.crop} s={34} />
                <div className="grow body-sm">
                  <b>{x.who}</b> ran {x.kind} at <b>{x.field}</b>
                  <div className="caption">
                    {x.space} · {x.res}
                  </div>
                </div>
                <span className="caption">{x.ago}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

/* ---------- spaces list ---------- */

export function SpacesAdmin() {
  const router = useRouter();
  const loading = useLoad("asp", 500);

  return (
    <AdminPage
      title="Spaces"
      sub="Managed regions with boundaries, farmers and access codes."
      right={
        <Btn sz="sm" icon="PenNib" onClick={() => router.push("/admin/spaces/new")}>
          New space
        </Btn>
      }
    >
      {loading ? (
        <div className="fgrid">
          {[0, 1, 2].map((i) => (
            <Skel key={i} h={300} r="20px" />
          ))}
        </div>
      ) : (
        <div className="fgrid">
          {SPACES.map((sp, i) => {
            const st = spaceStats(sp.id);
            return (
              <BlurFade key={sp.id} delay={i * 40}>
                <div className="card hov" onClick={() => router.push(`/admin/spaces/${sp.id}`)}>
                  <div className="thumb" style={{ aspectRatio: "16/9" }}>
                    <div
                      className="tbg"
                      style={{ backgroundImage: `url("${polyThumb(sp.boundary)}")` }}
                    />
                    <div className="abs" style={{ top: 12, right: 12, zIndex: 3 }}>
                      <Badge
                        tone={sp.status === "attention" ? "heat" : "growth"}
                        icon={sp.status === "attention" ? "Warning" : "CheckCircle"}
                      >
                        {sp.status === "attention" ? "Data limited" : "Active"}
                      </Badge>
                    </div>
                    <div className="abs" style={{ left: 14, bottom: 12, zIndex: 3, color: "#fff" }}>
                      <div className="title-md">{sp.name}</div>
                      <div className="body-sm" style={{ opacity: 0.8 }}>
                        {sp.place.municipality}
                      </div>
                    </div>
                  </div>
                  <div className="row between" style={{ padding: "14px 16px" }}>
                    <AvatarStack users={membersOf(sp.id).map((m) => m.user!)} />
                    <div className="row g3 body-sm muted">
                      <span>{st.fields} fields</span>
                      <span>{st.entries} entries</span>
                      <span className="row g1">
                        <Dot s={sp.status === "attention" ? "warn" : "ok"} />
                        {Math.round((sp.status === "attention" ? 0.82 : 0.96) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="spot" />
                </div>
              </BlurFade>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}

/* Space boundary thumbnail, matching the mockup's polyThumb. */
function polyThumb(poly: [number, number][]) {
  const w = 560;
  const hh = 300;
  const lats = poly.map((p) => p[0]);
  const lngs = poly.map((p) => p[1]);
  const a = Math.min(...lats);
  const b = Math.max(...lats);
  const l = Math.min(...lngs);
  const r = Math.max(...lngs);
  const kx = Math.cos(((a + b) / 2) * (Math.PI / 180));
  const sx = Math.max((r - l) * kx, 1e-6);
  const sy = Math.max(b - a, 1e-6);
  const pad = 0.14;
  const sc = Math.min((w * (1 - 2 * pad)) / sx, (hh * (1 - 2 * pad)) / sy);
  const ox = (w - sx * sc) / 2;
  const oy = (hh - sy * sc) / 2;
  const d =
    poly
      .map((p, i) => {
        const x = ox + (p[1] - l) * kx * sc;
        const y = oy + (b - p[0]) * sc;
        return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      })
      .join(" ") + " Z";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hh}"><rect width="${w}" height="${hh}" fill="#17201b"/><path d="${d}" fill="#C6F135" fill-opacity="0.38" stroke="#C6F135" stroke-width="2" stroke-linejoin="round"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* ---------- space hub ---------- */

const HUB_TABS = [
  ["overview", "Overview", "SquaresFour"],
  ["members", "Members", "Users"],
  ["access-codes", "Access codes", "Key"],
  ["fields", "Fields", "Polygon"],
  ["entries", "Entries", "Images"],
  ["announcements", "Announcements", "Megaphone"],
  ["settings", "Settings", "Gear"],
] as const;

export function SpaceHub({ id, tab = "overview" }: { id: string; tab?: string }) {
  const router = useRouter();
  const sp = SPACES.find((s) => s.id === id);

  if (!sp) {
    return (
      <AdminPage title="Space not found">
        <Empty
          icon="Stack"
          title="This space was deleted"
          action="All spaces"
          onAction={() => router.push("/admin/spaces")}
        />
      </AdminPage>
    );
  }

  const st = spaceStats(sp.id);
  const tabs = HUB_TABS.map(([k, l, i]) => ({
    k,
    l,
    i,
    n: k === "members" ? st.mem : k === "fields" ? st.fields : k === "entries" ? st.entries : undefined,
  }));

  return (
    <AdminPage
      title={sp.name}
      sub={`${sp.place.municipality}, ${sp.place.province} · ${fnum(areaHa(sp.boundary), 0)} ha`}
      crumbs={[
        ["Spaces", "/admin/spaces"],
        [sp.name, `/admin/spaces/${id}`],
      ]}
      right={
        <Badge
          lg
          tone={sp.status === "attention" ? "heat" : "growth"}
          icon={sp.status === "attention" ? "Warning" : "CheckCircle"}
        >
          {sp.status === "attention" ? "Data limited" : "Active"}
        </Badge>
      }
    >
      <div className="tabs hide-sb" style={{ marginBottom: 4 }}>
        {tabs.map((t) => (
          <button
            key={t.k}
            className={t.k === tab ? "on" : ""}
            onClick={() => router.push(`/admin/spaces/${id}/${t.k}`)}
          >
            {t.i && <Ic n={t.i} s={17} w={t.k === tab ? "fill" : "regular"} />}
            {t.l}
            {t.n != null && <span className="badge">{t.n}</span>}
          </button>
        ))}
      </div>
      <div className="mt6">
        {tab === "overview" && <HubOverview id={id} />}
        {tab === "members" && <HubMembers id={id} />}
        {tab === "access-codes" && <HubCodes id={id} />}
        {tab === "fields" && <HubFields id={id} />}
        {tab === "entries" && <HubEntries id={id} />}
        {tab === "announcements" && <HubAnnounce id={id} />}
        {tab === "settings" && <HubSettings id={id} />}
      </div>
    </AdminPage>
  );
}

function areaHa(p: [number, number][]) {
  const k = Math.cos((p[0][0] * Math.PI) / 180) * 111320;
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [y1, x1] = p[i];
    const [y2, x2] = p[(i + 1) % p.length];
    a += x1 * k * y2 * 111320 - x2 * k * y1 * 111320;
  }
  return Math.abs(a) / 2 / 1e4;
}

function HubOverview({ id }: { id: string }) {
  const sp = SPACES.find((s) => s.id === id)!;
  const st = spaceStats(id);
  const fields = liveFields().filter((f) => f.spaceId === id && !f.archived);

  return (
    <div>
      <div className="rings" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
        <Ring id={"h1" + id} value={st.mem} max={30} size={104} color="var(--sky)" label="Farmers" />
        <Ring id={"h2" + id} value={st.fields} max={20} size={104} color="var(--soil)" label="Fields" />
        <Ring id={"h3" + id} value={st.e30} max={60} size={104} color="var(--water)" label="Entries · 30 d" />
        <Ring
          id={"h4" + id}
          value={Math.round(st.rel * 100)}
          size={104}
          color="var(--growth)"
          suffix="%"
          label="High reliability"
        />
      </div>
      <div className="twocol mt8" style={{ gap: 32 }}>
        <div>
          <MapView
            height={380}
            center={sp.center}
            zoom={13}
            spaces={[sp]}
            fields={fields}
            fit={sp.boundary}
          />
        </div>
        <div>
          <StatRow
            label="Crop focus"
            value={
              <span className="row g2 wrap">
                {sp.crop_focus.map((c) => (
                  <CropIcon key={c} id={c} s={36} />
                ))}
              </span>
            }
          />
          <div className="stat-row">
            <span className="label">Data readiness</span>
            <div className="row g3">
              <Meter v={sp.status === "attention" ? 82 : 96} color={sp.status === "attention" ? "var(--heat)" : "var(--growth)"} />
              <b>{sp.status === "attention" ? 82 : 96}%</b>
            </div>
          </div>
          <StatRow label="Place" value={sp.place.municipality} sub={sp.place.province} />
        </div>
      </div>
    </div>
  );
}

function HubMembers({ id }: { id: string }) {
  const [q, setQ] = useState("");
  const [pg, setPg] = useState(0);
  const mem = membersOf(id).filter((m) => m.user!.name.toLowerCase().includes(q.toLowerCase()));
  const pages = Math.max(1, Math.ceil(mem.length / 8));

  return (
    <div>
      <div className="row g3" style={{ marginBottom: 16 }}>
        <div className="input-group" style={{ maxWidth: 320 }}>
          <Ic n="MagnifyingGlass" s={18} />
          <input
            placeholder="Search members"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPg(0);
            }}
          />
        </div>
      </div>
      <Table
        cols={[
          {
            h: "Farmer",
            r: (m) => (
              <div className="row g3">
                <Avatar u={m.user} sz="sm" />
                <div>
                  <div style={{ fontWeight: 650 }}>{m.user!.name}</div>
                  <div className="caption">{m.user!.email}</div>
                </div>
              </div>
            ),
          },
          {
            h: "Fields",
            num: true,
            r: (m) => liveFields().filter((f) => f.ownerId === m.userId && f.spaceId === id).length,
          },
          {
            h: "Entries",
            num: true,
            r: (m) => liveEntries().filter((e) => e.authorId === m.userId && e.spaceId === id).length,
          },
          { h: "Joined", r: (m) => fDay(m.joinedAt) },
        ]}
        rows={mem.slice(pg * 8, pg * 8 + 8)}
      />
      <Paginate page={pg} pages={pages} on={setPg} />
    </div>
  );
}

function HubCodes({ id }: { id: string }) {
  const sp = SPACES.find((s) => s.id === id)!;
  const code = "HRA-" + (hashStr(id) % 9000 + 1000) + "-" + (hashStr(id + "b") % 9000 + 1000);
  return (
    <div className="twocol" style={{ gap: 40 }}>
      <div className="col g5">
        <div>
          <div className="label">Current code</div>
          <div className="row g3 mt2 wrap">
            <span className="mono" style={{ fontSize: 28, fontWeight: 600, letterSpacing: ".03em" }}>
              {code}
            </span>
          </div>
          <div className="row g2 mt2">
            <Badge tone="growth" icon="CheckCircle">
              Active
            </Badge>
            <span className="caption">hashed at rest · hint {code.slice(-4)}</span>
          </div>
        </div>
        <div>
          <div className="row between">
            <span className="label">Uses</span>
            <span className="mono">
              {spaceStats(id).mem} / 100
            </span>
          </div>
          <div className="mt2">
            <Meter v={spaceStats(id).mem} max={100} color="var(--primary)" />
          </div>
          <div className="caption mt1">Expires in 30 days</div>
        </div>
      </div>
      <div className="col g3" style={{ alignItems: "center" }}>
        <div style={{ padding: 18, background: "#fff", color: "#000", borderRadius: 20 }}>
          <div className="mono" style={{ fontSize: 13, padding: 40, textAlign: "center" }}>
            QR
          </div>
        </div>
        <div className="caption">Scan to open /join/{code.slice(0, 8)}…</div>
      </div>
    </div>
  );
}

function HubFields({ id }: { id: string }) {
  const sp = SPACES.find((s) => s.id === id)!;
  const { settings } = useApp();
  const fields = liveFields().filter((f) => f.spaceId === id && !f.archived);
  return (
    <div className="twocol" style={{ gap: 32 }}>
      <MapView height={440} center={sp.center} zoom={13} spaces={[sp]} fields={fields} fit={sp.boundary} />
      <Table
        cols={[
          { h: "Field", r: (f) => <b>{f.name}</b> },
          { h: "Owner", r: (f) => getUser(f.ownerId)?.name.split(" ")[0] ?? "—" },
          { h: "Area", num: true, r: (f) => fA(f.area, settings) },
          { h: "Crop", r: (f) => CROPS[f.current_crop]?.name ?? "—" },
        ]}
        rows={fields}
      />
    </div>
  );
}

function HubEntries({ id }: { id: string }) {
  const router = useRouter();
  const es = liveEntries().filter((e) => e.spaceId === id && e.status !== "failed");
  return es.length ? (
    <div className="egrid f5">
      {es.slice(0, 12).map((e) => (
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
            <div className="title-sm ellip">{liveFields().find((f) => f.id === e.fieldId)?.name}</div>
            <div className="caption">{ago(e.observed_at)}</div>
          </div>
        </button>
      ))}
    </div>
  ) : (
    <Empty icon="Images" title="No entries yet" sub="Entries from this space's farmers appear here." />
  );
}

function HubAnnounce({ id }: { id: string }) {
  const sp = SPACES.find((s) => s.id === id)!;
  const { toast, readonly } = useApp();
  const [f, setF] = useState({ title: "", body: "" });
  useDb();

  const list = liveAnnouncements(id);
  const members = db.members.filter((m) => m.spaceId === id);

  const send = () => {
    if (readonly) return;
    if (!f.title.trim() || !f.body.trim()) {
      toast("Add a title and a message", { icon: "Prohibit", tone: "risk" });
      return;
    }
    const a = addAnnouncement({
      id: "an_" + Math.random().toString(36).slice(2, 9),
      spaceId: id,
      title: f.title.trim(),
      body: f.body.trim(),
      by: db.users.find((u) => u.role === "admin")?.id ?? "u_aileen",
      created: Date.now(),
    });
    addAudit("broadcast", "announcement", a.id, id);
    toast(`Sent to ${members.length} farmers`, { icon: "Megaphone" });
    setF({ title: "", body: "" });
  };

  return (
    <div className="twocol" style={{ gap: 40 }}>
      <div className="col g4">
        <Field label="Title">
          <input
            className="input"
            value={f.title}
            placeholder="e.g. Irrigation schedule update"
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
        </Field>
        <Field label="Message">
          <textarea
            className="input"
            rows={5}
            value={f.body}
            placeholder="What every farmer in this space needs to know."
            onChange={(e) => setF({ ...f, body: e.target.value })}
          />
        </Field>
        <div className="row g2">
          <Btn icon="Megaphone" onClick={send}>
            Send to {members.length} farmers
          </Btn>
        </div>
      </div>

      <div>
        <SecHead label="Sent" />
        {list.length ? (
          <div className="col g3">
            {list.map((a) => (
              <div key={a.id} className="card pad">
                <div className="row g2" style={{ alignItems: "baseline" }}>
                  <b className="title-sm grow">{a.title}</b>
                  <span className="caption subtle">{ago(a.created)}</span>
                </div>
                <div className="body-sm muted mt2">{a.body}</div>
                <div className="caption subtle mt2">
                  {getUser(a.by)?.name ?? a.by} · {sp.name}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            icon="Megaphone"
            title="Nothing sent yet"
            sub="Announcements reach every farmer in this space as a notification."
          />
        )}
      </div>
    </div>
  );
}

function HubSettings({ id }: { id: string }) {
  const sp = SPACES.find((s) => s.id === id)!;
  const { toast } = useApp();
  return (
    <div className="cap68 col g4">
      <Field label="Name">
        <input className="input" defaultValue={sp.name} />
      </Field>
      <Field label="Description">
        <textarea className="input" rows={3} defaultValue={sp.desc} />
      </Field>
      <div>
        <div className="label">Status</div>
        <div className="mt2">
          <Seg
            sm
            opts={[
              { k: "active", l: "Active" },
              { k: "attention", l: "Data limited" },
              { k: "archived", l: "Archived" },
            ]}
            v={sp.status === "attention" ? "attention" : "active"}
            on={() => toast("Status changes are a server action in the product", { icon: "Stack", tone: "sky" })}
          />
        </div>
      </div>
      <div>
        <div className="label">Crop focus</div>
        <div className="tag-row mt2">
          {sp.crop_focus.map((c) => (
            <Chip key={c} sm on>
              {CROPS[c]?.name ?? c}
            </Chip>
          ))}
        </div>
      </div>
      <div className="row g2">
        <Btn icon="Check" onClick={() => toast("Space saved", { icon: "Check" })}>
          Save changes
        </Btn>
      </div>
    </div>
  );
}
