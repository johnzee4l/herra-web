"use client";

/* Spaces: the joined-spaces list and one space's page (blueprint 7.1). */

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import { CropIcon } from "@/components/ui/CropIcon";
import {
  AvatarStack,
  Badge,
  BlurFade,
  Btn,
  Chip,
  Dot,
  Empty,
  Meter,
  SecHead,
  StatRow,
} from "@/components/ui/primitives";
import { useConfirm } from "@/components/ui/overlays";
import { Page } from "@/components/shell/Page";
import { useApp } from "@/lib/state";
import { t } from "@/lib/i18n/en";
import { fnum } from "@/lib/utils";
import { CROPS } from "@/lib/spec/crops";
import { getSpace, membersOf } from "@/lib/fixtures";
import { liveMyEntries, liveMyFields, liveMySpaces } from "@/lib/store";
import { useDb } from "@/lib/useDb";
import { polyAreaHa } from "@/lib/geo/validate";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => <div className="skel" style={{ height: 380, borderRadius: 20 }} />,
});

export function SpacesList() {
  const { bp, user, settings, openSheet, toast } = useApp();
  const router = useRouter();
  useDb();
  const ms = liveMySpaces(user.id);
  const wide = bp !== "xs" && bp !== "sm";

  return (
    <Page
      title={t("spaces")}
      wide
      right={
        <Btn
          sz="sm"
          icon="Key"
          onClick={() =>
            openSheet({
              title: "Join a space",
              render: (close) => (
                <div className="col g4">
                  <div className="body-sm muted">
                    Access codes are issued by your space admin. They look like{" "}
                    <span className="mono">HRA-7K2Q-9M4D</span>.
                  </div>
                  <Btn
                    block
                    onClick={() => {
                      close();
                      toast("Ask your cooperative admin for a code", { icon: "Key", tone: "sky" });
                    }}
                  >
                    Got it
                  </Btn>
                </div>
              ),
            })
          }
        >
          Join
        </Btn>
      }
    >
      <BlurFade>
        <div className={wide ? "display-lg" : "display-md"} style={{ margin: "6px 0 20px" }}>
          {t("spaces")}
        </div>
      </BlurFade>

      {ms.length ? (
        <div className="fgrid">
          {ms.map((sp) => {
            const nf = liveMyFields(user.id, sp.id).length;
            const ne = liveMyEntries(user.id).filter((e) => e.spaceId === sp.id).length;
            return (
              <div key={sp.id} className="card hov" onClick={() => router.push(`/farmer/spaces/${sp.id}`)}>
                <div className="thumb" style={{ aspectRatio: "16/9" }}>
                  <div className="tbg" style={{ backgroundImage: `url(${thumb(sp.boundary)})` }} />
                  <div className="abs" style={{ left: 14, bottom: 12, zIndex: 3, color: "#fff" }}>
                    <div className="title-md">{sp.name}</div>
                    <div className="body-sm" style={{ opacity: 0.8 }}>
                      {sp.place.municipality}, {sp.place.province}
                    </div>
                  </div>
                </div>
                <div className="row between" style={{ padding: "14px 16px" }}>
                  <AvatarStack users={membersOf(sp.id).flatMap((m) => (m.user ? [m.user] : []))} />
                  <div className="row g3 body-sm muted">
                    <span>
                      {nf} {nf === 1 ? "field" : "fields"}
                    </span>
                    <span>
                      {ne} {ne === 1 ? "entry" : "entries"}
                    </span>
                    <span className="row g1">
                      <Dot s={sp.status === "attention" ? "warn" : "ok"} />
                      {sp.status === "attention" ? "Data limited" : "Ready"}
                    </span>
                  </div>
                </div>
                <div className="spot" />
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          icon="Stack"
          title="You haven't joined a space"
          sub="Ask your cooperative admin for an access code like HRA-7K2Q-9M4D."
          action={t("joinspace")}
          onAction={() => router.push("/farmer/spaces")}
        />
      )}
    </Page>
  );
}

export function SpaceView({ id }: { id: string }) {
  const { bp, user, settings, toast } = useApp();
  const router = useRouter();
  const confirm = useConfirm();
  useDb();

  const sp = getSpace(id);
  if (!sp) {
    return (
      <Page title="Space" backTo="/farmer/spaces">
        <Empty icon="Stack" title="Space not found" />
      </Page>
    );
  }

  const mem = membersOf(id);
  const mine = liveMyFields(user.id, id);
  const wide = bp !== "xs" && bp !== "sm";

  return (
    <Page title={sp.name} backTo="/farmer/spaces" wide>
      <BlurFade>
        <div className="display-md" style={{ margin: "6px 0 4px" }}>
          {sp.name}
        </div>
        <div className="muted">{sp.desc}</div>
        <div className="tag-row mt3">
          {sp.crop_focus.map((c) => (
            <Badge key={c}>
              <CropIcon id={c} s={16} bare /> {CROPS[c].name}
            </Badge>
          ))}
        </div>
      </BlurFade>

      <div className="twocol mt6" style={{ gap: 40 }}>
        <div>
          <BlurFade>
            <MapView
              height={wide ? 420 : 300}
              center={sp.center}
              zoom={14}
              spaces={[sp]}
              fields={mine}
              fit={sp.boundary}
              onFieldClick={(f) => router.push(`/farmer/fields/${f.id}`)}
              hideLabels
            />
          </BlurFade>

          <BlurFade cls="sec">
            <SecHead label="Announcements" />
            <div className="muted body-sm">No announcements in this build.</div>
          </BlurFade>
        </div>

        <div className="col g4">
          <BlurFade>
            <StatRow
              label="Farmers"
              value={mem.length}
              sub={<AvatarStack users={mem.flatMap((m) => (m.user ? [m.user] : []))} max={6} />}
            />
            <StatRow label="Your fields" value={mine.length} />
            <StatRow
              label="Area"
              value={fnum(polyAreaHa(sp.boundary), 0)}
              unit={settings.area === "ac" ? "ac" : "ha"}
              sub={`${sp.place.municipality}, ${sp.place.province}`}
            />
            <div className="stat-row">
              <span className="label">Data readiness</span>
              <div className="row g3">
                <Meter
                  v={sp.status === "attention" ? 68 : 96}
                  color={sp.status === "attention" ? "var(--heat)" : "var(--growth)"}
                />
                <b>{sp.status === "attention" ? 68 : 96}%</b>
              </div>
              {sp.status === "attention" && (
                <span className="caption">
                  Climate stations are far — ERA5 fallback in use.
                </span>
              )}
            </div>
          </BlurFade>

          <BlurFade>
            <Btn
              cls="destructive"
              icon="SignOut"
              onClick={() =>
                confirm({
                  title: `Leave ${sp.name}?`,
                  body: "Your fields and entries stay, but you will lose access to this space until you join again.",
                  confirm: "Leave space",
                  onOk: () => {
                    router.push("/farmer/spaces");
                    toast(`You left ${sp.name}`, { icon: "SignOut", tone: "heat" });
                  },
                })
              }
            >
              Leave space
            </Btn>
          </BlurFade>
        </div>
      </div>
    </Page>
  );
}

function thumb(poly: [number, number][]) {
  const w = 560;
  const hh = 300;
  const lats = poly.map((p) => p[0]);
  const lngs = poly.map((p) => p[1]);
  const a = Math.min(...lats);
  const b = Math.max(...lats);
  const l = Math.min(...lngs);
  const r = Math.max(...lngs);
  const kx = Math.cos((((a + b) / 2) * Math.PI) / 180);
  const sx = Math.max((r - l) * kx, 1e-6);
  const sy = Math.max(b - a, 1e-6);
  const pad = 0.12;
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hh}"><rect width="${w}" height="${hh}" fill="#17201b"/><path d="${d}" fill="#C6F135" fill-opacity="0.28" stroke="#C6F135" stroke-width="2" stroke-linejoin="round"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

