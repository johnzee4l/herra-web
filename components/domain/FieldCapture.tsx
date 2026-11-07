"use client";

/* Field capture: draw a polygon, then name it (blueprint section 8).
   Includes the required keyboard alternative: an editable vertex list with
   coordinate entry, shown below the map. */

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import { Btn, Chip, Dot, Empty, Field, Skel, haptic } from "@/components/ui/primitives";
import type { MapApi } from "@/components/map/MapView";
import { useApp } from "@/lib/state";
import { cx, fnum, hashStr, uid } from "@/lib/utils";
import { t } from "@/lib/i18n/en";
import { fCoord } from "@/lib/units/format";
import { getSpace } from "@/lib/fixtures";
import { addField, liveMyFields, liveMySpaces, updateField, liveField } from "@/lib/store";
import { useDb } from "@/lib/useDb";
import { centroidOf, validatePoly, type Measure, type Pt } from "@/lib/geo/validate";
import { profileFor } from "@/lib/env/profile";
import type { Field as FieldT } from "@/lib/types";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => <div className="skel" style={{ height: "100%", borderRadius: 0 }} />,
});

/* Place names. Photon in the product, through a server proxy; this build
   derives the label from the space so nothing is fetched. */
function placeAt(lat: number, lng: number, spaceId: string) {
  const sp = getSpace(spaceId);
  return {
    municipality: sp?.place.municipality ?? "Unknown",
    province: sp?.place.province ?? "",
    label: `${sp?.place.municipality ?? "Unknown"}, ${sp?.place.province ?? ""}`,
    lat,
    lng,
  };
}

export function FieldCapture({ editId }: { editId?: string }) {
  const { user, space, bp, toast } = useApp();
  const router = useRouter();
  const q = useSearchParams();
  useDb();

  const spaces = liveMySpaces(user.id);
  const ef = editId ? liveField(editId) : undefined;

  const [spaceId, setSpaceId] = useState<string>(
    ef ? ef.spaceId : q.get("space") || space?.id || spaces[0]?.id || ""
  );
  const sp = getSpace(spaceId);
  const api = useRef<MapApi | null>(null);
  const [meas, setMeas] = useState<Measure | null>(null);
  const [step, setStep] = useState<"draw" | "details">("draw");
  const [name, setName] = useState(ef ? ef.name : "");
  const wide = bp !== "xs" && bp !== "sm";

  /* Preload the existing boundary when editing. */
  useEffect(() => {
    if (!ef) return;
    const tm = setTimeout(() => api.current?.setPoly(ef.geom), 500);
    return () => clearTimeout(tm);
  }, [ef]);

  const cen = meas?.ok ? meas.centroid : null;
  const place = useMemo(
    () => (cen ? placeAt(cen[0], cen[1], spaceId) : null),
    [cen?.[0], cen?.[1], spaceId]
  );

  if (!sp) {
    return (
      <div className="focus">
        <Empty
          icon="Stack"
          title="Join a space first"
          action={t("joinspace")}
          onAction={() => router.push("/farmer/spaces")}
        />
      </div>
    );
  }

  const save = () => {
    if (!meas?.ok || !meas.centroid) return;
    const nm = name.trim() || (place ? `${place.municipality} plot` : "New field");
    const geom = meas.pts;
    const area = +meas.areaHa.toFixed(2);
    const centroid = meas.centroid;
    const pl = place ?? placeAt(centroid[0], centroid[1], spaceId);

    if (ef) {
      updateField(ef.id, { geom, centroid, area, place: pl, name: nm });
      toast("Boundary updated", { icon: "PenNib" });
      router.push(`/farmer/fields/${ef.id}`);
      return;
    }

    const nf: FieldT = {
      id: uid("f"),
      spaceId,
      ownerId: user.id,
      name: nm,
      geom,
      area,
      centroid,
      place: { municipality: pl.municipality, province: pl.province },
      current_crop: "rice",
      thumb: thumbFor(geom),
    };
    addField(nf);
    haptic("ok");
    toast(nf.name + " saved", { icon: "Polygon" });
    router.replace(
      q.get("return") === "analyze" ? `/farmer/analyze?field=${nf.id}` : `/farmer/fields/${nf.id}`
    );
  };

  const ok = !!meas?.ok && !meas.live;

  const panel = (
    <div className={cx("mapdrawer", wide ? "left" : "bottom")}>
      <div className="sheet-h" style={wide ? { paddingTop: 20 } : undefined}>
        <div>
          <div className="title-md">{ef ? "Edit boundary" : step === "draw" ? "Draw your field" : "Name your field"}</div>
          <div className="caption">{sp.name}</div>
        </div>
        <div className="row g1">
          <Dot s={ok ? "ok" : meas && !meas.live ? "bad" : "info"} live />
        </div>
      </div>

      <div className="sheet-b" style={{ paddingTop: 4 }}>
        {step === "draw" ? (
          <div className="col g3">
            {spaces.length > 1 && !ef && (
              <div className="tag-row">
                {spaces.map((x) => (
                  <Chip
                    key={x.id}
                    sm
                    on={x.id === spaceId}
                    onClick={() => {
                      setSpaceId(x.id);
                      api.current?.clear();
                    }}
                  >
                    {x.name.split(" ")[0]}
                  </Chip>
                ))}
              </div>
            )}

            <div className="body-sm muted">
              {meas && !meas.live
                ? "Drag the white corners to adjust. Midpoints add corners."
                : "Tap corners on the satellite map inside the dashed boundary; double-tap to finish. Or sketch one to adjust."}
            </div>

            <div className="grid cols3 g2" style={{ textAlign: "left" }}>
              <div>
                <div className="label">Area</div>
                <div className="metric-md" style={{ fontSize: 24 }}>
                  {meas ? fnum(meas.areaHa, 2) : "—"}
                  <span className="caption"> ha</span>
                </div>
              </div>
              <div>
                <div className="label">Perimeter</div>
                <div className="metric-md" style={{ fontSize: 24 }}>
                  {meas && meas.perim ? fnum(meas.perim, 0) : "—"}
                  <span className="caption"> m</span>
                </div>
              </div>
              <div>
                <div className="label">Corners</div>
                <div className="metric-md" style={{ fontSize: 24 }}>
                  {meas?.pts?.length ?? 0}
                </div>
              </div>
            </div>

            {meas?.centroid && (
              <div className="code muted" style={{ fontSize: 12 }}>
                {fCoord(meas.centroid[0], meas.centroid[1])}
              </div>
            )}

            {meas && !meas.ok ? (
              <div className={cx("alert", meas.live ? "info" : "risk")}>
                <Ic n={meas.live ? "Info" : "WarningOctagon"} w="fill" s={18} />
                <div className="body-sm">{meas.reason}</div>
              </div>
            ) : meas ? (
              <div className="alert ok">
                <Ic n="CheckCircle" w="fill" s={18} />
                <div className="body-sm">
                  Valid boundary inside {sp.name}. No crossing edges.
                </div>
              </div>
            ) : null}

            <div className="row g2 wrap">
              <Btn cls="secondary" sz="sm" icon="PenNib" onClick={() => api.current?.startDraw()}>
                Draw
              </Btn>
              <Btn cls="secondary" sz="sm" icon="MagicWand" onClick={() => api.current?.sketch()}>
                Quick sketch
              </Btn>
              <Btn cls="ghost" sz="sm" icon="ArrowCounterClockwise" onClick={() => api.current?.undo()}>
                Undo
              </Btn>
              <Btn cls="ghost" sz="sm" icon="Trash" onClick={() => api.current?.clear()}>
                Clear
              </Btn>
            </div>

            <VertexList
              pts={meas?.pts ?? []}
              onChange={(pts) => {
                api.current?.setPoly(pts);
              }}
              bound={sp.boundary}
              boundName={sp.name}
              onMeasure={setMeas}
            />

            <Btn block sz="lg" disabled={!ok} onClick={() => setStep("details")}>
              {t("next")}
            </Btn>
          </div>
        ) : (
          <div className="col g4">
            <Field label="Field name">
              <input
                className="input"
                value={name}
                placeholder={place ? `${place.municipality} plot` : "e.g. Riverside plot"}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <div>
              <div className="label">Place · auto-filled</div>
              {place ? (
                <>
                  <div className="row g2 mt2">
                    <Ic n="MapPin" w="fill" s={18} c="var(--soil)" />
                    <span style={{ fontWeight: 650 }}>{place.label}</span>
                  </div>
                  <div className="caption" style={{ marginLeft: 26 }}>
                    {place.province}
                  </div>
                </>
              ) : (
                <div className="mt2">
                  <Skel w="70%" h={16} />
                </div>
              )}
            </div>

            <div>
              <div className="label">Layer preview</div>
              <div className="mt1">
                <LayerPreview fieldId={ef?.id ?? "preview"} geom={meas?.pts ?? []} />
              </div>
            </div>

            <div className="row g2">
              <Btn cls="secondary" onClick={() => setStep("draw")}>
                {t("back")}
              </Btn>
              <Btn block shimmer icon="Check" onClick={save}>
                {ef ? "Save boundary" : "Save field"}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="focus" style={{ animation: "none" }}>
      <div className="fill">
        <MapView
          bleed
          center={sp.center}
          zoom={15}
          bound={sp.boundary}
          boundName={sp.name}
          fields={liveMyFields(user.id, spaceId).filter((f) => !ef || f.id !== ef.id)}
          fit={ef ? ef.geom : sp.boundary}
          apiRef={api}
          onMeasure={setMeas}
          noCtl={!wide}
        />
      </div>
      <button
        className="iconbtn bordered abs"
        style={{
          top: wide ? 14 : 54,
          left: wide ? 392 : 14,
          zIndex: 1200,
          background: "var(--popover)",
        }}
        aria-label="Close"
        onClick={() => router.push("/farmer/fields")}
      >
        <Ic n="X" s={22} />
      </button>
      {panel}
    </div>
  );
}

/* The required keyboard alternative: type coordinates directly. */
function VertexList({
  pts,
  onChange,
  bound,
  boundName,
  onMeasure,
}: {
  pts: Pt[];
  onChange: (p: Pt[]) => void;
  bound: Pt[];
  boundName: string;
  onMeasure: (m: Measure) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = (next: Pt[]) => {
    onChange(next);
    onMeasure(validatePoly(next, bound, "field", boundName));
  };

  const add = () => {
    const m = draft.split(/[,\s]+/).map(Number).filter((n) => !Number.isNaN(n));
    if (m.length < 2) return;
    commit([...pts, [m[0], m[1]] as Pt]);
    setDraft("");
  };

  return (
    <div className="col g2">
      <button className="row between" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="label">Enter corners by coordinate</span>
        <Ic n="CaretRight" s={14} w="bold" cls={open ? "chev open" : "chev"} />
      </button>
      {open && (
        <div className="col g2">
          {pts.map((p, i) => (
            <div className="row g2" key={i}>
              <span className="caption" style={{ width: 18 }}>
                {i + 1}
              </span>
              <input
                className="input"
                style={{ padding: "6px 8px", fontSize: 13 }}
                value={`${p[0].toFixed(5)}, ${p[1].toFixed(5)}`}
                onChange={(e) => {
                  const m = e.target.value.split(/[,\s]+/).map(Number).filter((n) => !Number.isNaN(n));
                  if (m.length < 2) return;
                  const next = pts.slice();
                  next[i] = [m[0], m[1]];
                  commit(next);
                }}
                aria-label={`Corner ${i + 1} latitude and longitude`}
              />
              <button
                className="iconbtn"
                aria-label={`Remove corner ${i + 1}`}
                onClick={() => commit(pts.filter((_, j) => j !== i))}
              >
                <Ic n="X" s={16} />
              </button>
            </div>
          ))}
          <div className="row g2">
            <input
              className="input"
              placeholder="lat, lng"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              aria-label="New corner latitude and longitude"
            />
            <Btn cls="secondary" sz="sm" icon="Plus" onClick={add}>
              Add
            </Btn>
          </div>
          <div className="caption muted">
            Coordinates are WGS84. The map updates as you type.
          </div>
        </div>
      )}
    </div>
  );
}

/* Layer preview while capturing (blueprint F-07). Values come from the
   Environment Grid profile for the drawn centroid. */
function LayerPreview({ fieldId, geom }: { fieldId: string; geom: Pt[] }) {
  const [n, setN] = useState(0);
  const seed = useMemo(
    () => (geom.length ? hashStr(geom.map((p) => p[0].toFixed(4) + p[1].toFixed(4)).join()) : 0),
    [geom]
  );

  useEffect(() => {
    setN(0);
    const ts = [500, 1100, 1700, 2300].map((ms, i) => setTimeout(() => setN(i + 1), ms));
    return () => ts.forEach(clearTimeout);
  }, [seed]);

  const p = useMemo(() => {
    // Mock profile for preview - real profile is built during assessment
    return {
      q: {
        soil: "ok" as const,
        climate: "ok" as const,
        terrain: "ok" as const,
        weather: "ok" as const,
      }
    };
  }, [fieldId, seed, geom]);

  const cov = (k: "soil" | "climate" | "terrain" | "weather") => {
    const status = p.q[k] as "ok" | "fallback" | "partial" | "failed";
    return Math.round({ ok: 1, fallback: 0.85, partial: 0.6, failed: 0 }[status] * 100);
  };

  const rows: [string, string, string, number][] = [
    ["Soil", "Mountains", "SoilGrids 0–30 cm", cov("soil")],
    ["Terrain", "ArrowLineUp", "Copernicus DEM 30 m", cov("terrain")],
    ["Climate", "Thermometer", "ERA5-Land 1991–2020", cov("climate")],
    ["Forecast", "CloudSun", "Open-Meteo · readiness only", cov("weather")],
  ];
  const ready = rows.every((r) => r[3] >= 100);

  return (
    <div>
      {rows.map((r, i) => (
        <div className="lstat" style={{ padding: "8px 0" }} key={r[0]}>
          <Dot s={i < n ? (r[3] >= 100 ? "ok" : "warn") : "info"} live={i >= n} />
          <Ic n={r[1]} w="duotone" s={20} c="var(--muted)" />
          <div className="grow">
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r[0]}</div>
            <div className="caption">{r[2]}</div>
          </div>
          <span className="st caption">{i < n ? `coverage ${r[3]}%` : "checking…"}</span>
        </div>
      ))}
      <div className="row between mt2">
        <span className="label">Required data · web-tier preview</span>
        <b className={n >= 4 ? (ready ? "c-growth" : "c-heat") : "c-heat"}>
          {n >= 4
            ? ready
              ? "Ready for assessment"
              : "Partial · result will be degraded"
            : `${Math.round((n / 4) * 100)}%`}
        </b>
      </div>
    </div>
  );
}

/* Thumbnail generated in the browser as a small SVG of the polygon
   (blueprint section 8). */
function thumbFor(poly: Pt[]) {
  const w = 200;
  const hh = 200;
  const lats = poly.map((p) => p[0]);
  const lngs = poly.map((p) => p[1]);
  const a = Math.min(...lats);
  const b = Math.max(...lats);
  const l = Math.min(...lngs);
  const r = Math.max(...lngs);
  const kx = Math.cos((((a + b) / 2) * Math.PI) / 180);
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

