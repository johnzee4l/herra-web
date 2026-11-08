"use client";

/* Entry detail. Transcribed from the mockup's EntryDetail + ResultBody.
   Product copy changes per blueprint 11.2-11.5: "Suitability", the
   reference disclaimer, and "not validated" reliability wording. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import { CropIcon } from "@/components/ui/CropIcon";
import {
  Acc,
  Alert,
  Badge,
  BlurFade,
  Btn,
  Delta,
  Dot,
  Meter,
  Ring,
  SecHead,
  Seg,
  Skel,
  useLoad,
} from "@/components/ui/primitives";
import { useConfirm } from "@/components/ui/overlays";
import { useApp } from "@/lib/state";
import { cx, sum } from "@/lib/utils";
import { t } from "@/lib/i18n/en";
import { fA, fDT, fR, fTn } from "@/lib/units/format";
import {
  CLASS_L,
  FLAG_LBL,
  PROV_LBL,
  PROV_TONE,
  RELI,
  SUP_LBL,
  WX,
  bandColor,
  wxIcon,
} from "@/lib/codes";
import { CROPS } from "@/lib/spec/crops";
import { rerunAssessment } from "@/app/actions/assessments";
import { getSpace, topOf } from "@/lib/fixtures";
import { liveEntry, liveField, removeEntries, restoreEntries } from "@/lib/store";
import { useDb } from "@/lib/useDb";
import type { Entry, EntryResult } from "@/lib/types";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function EntryDetail({ id, admin = false }: { id: string; admin?: boolean }) {
  const { bp, settings, toast } = useApp();
  const router = useRouter();
  const confirm = useConfirm();
  useDb();
  const e = liveEntry(id);
  const loading = useLoad("ed" + id, 500);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [hero, setHero] = useState<"photo" | "map">("photo");
  const [rerunning, setRerunning] = useState(false);
  const ph = bp !== "xs" && bp !== "sm";
  // Admins review entries read-only: no re-run, compare, outcome or delete.
  const ro = admin;

  if (!e) {
    /* localStorage hydrates after mount; show the skeleton on the server and
       first client pass instead of flashing "Entry not found". */
    if (!mounted) {
      return (
        <div className="page">
          <div className="topbar">
            <Link href="/farmer/entries" className="iconbtn bordered" aria-label="Back">
              <Ic n="CaretLeft" s={20} w="bold" />
            </Link>
          </div>
          <div className="page-in pad wide">
            <DetailSkel />
          </div>
        </div>
      );
    }
    return (
      <div className="page">
        <div className="topbar">
          <Link href="/farmer/entries" className="iconbtn bordered" aria-label="Back">
            <Ic n="CaretLeft" s={20} w="bold" />
          </Link>
        </div>
        <div className="page-in pad">
          <div className="empty">
            <Ic n="Images" w="duotone" s={48} cls="ei" />
            <div className="title-md">Entry not found</div>
            <div className="muted body-sm">It may have been deleted.</div>
            <div className="mt4">
              <Btn onClick={() => router.push("/farmer/entries")}>Back to entries</Btn>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const F = liveField(e.fieldId)!;
  const r = e.result;
  const proc = e.status === "queued" || e.status === "processing";
  const hasPhoto = !!e.photo?.url;
  const hasFieldImage = !!F.thumb;
  const heroUrl = hero === "photo" && hasPhoto ? e.photo.url : F.thumb;

  const rerun = async () => {
    if (rerunning) return;
    setRerunning(true);
    try {
      const res = await rerunAssessment(e.id);
      if (!("assessmentId" in res) || !res.assessmentId) {
        throw new Error(("error" in res && res.error) || "The model could not produce a new assessment");
      }
      const status = "status" in res && res.status ? res.status : "ok";
      toast(`Re-run complete · ${status}`, { icon: "CheckCircle", tone: "growth" });
      // Full reload rehydrates the entry store with the new assessment row.
      window.location.assign(`/farmer/entries/${res.assessmentId}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Re-run failed", {
        icon: "XCircle",
        tone: "risk",
      });
    } finally {
      setRerunning(false);
    }
  };

  const del = () =>
    confirm({
      title: "Delete this entry?",
      body: "The photo, layer snapshots and result are removed. You can undo for a few seconds.",
      confirm: "Delete entry",
      onOk: () => {
        const removed = removeEntries([e.id]);
        router.push("/farmer/entries");
        toast("Entry deleted", {
          icon: "Trash",
          tone: "risk",
          action: "Undo",
          onAction: () => restoreEntries(removed),
        });
      },
    });

  return (
    <div className="page">
      <div className="topbar">
        <Link href="/farmer/entries" className="iconbtn bordered" aria-label="Back">
          <Ic n="CaretLeft" s={20} w="bold" />
        </Link>
        <div className="grow" />
        <span className="caption row g1">
          <Dot
            s={
              proc
                ? "info"
                : e.status === "degraded"
                ? "warn"
                : e.status === "failed" || e.status === "abstained"
                ? "bad"
                : "ok"
            }
            live={proc}
          />
          {proc ? "Processing" : e.status === "ready" ? "Ready" : cap(e.status)}
        </span>
      </div>

      <div className="page-in pad wide" style={ph ? undefined : { paddingTop: 0 }}>
        {ph && <div style={{ height: 6 }} />}

        <div
          className="thumb"
          style={{
            aspectRatio: heroUrl ? (ph ? "16/10" : "4/3") : "16/6",
            borderRadius: ph ? "var(--r-xl)" : 0,
            margin: ph ? 0 : "0 -16px",
          }}
        >
          {heroUrl ? (
            <div
              className="tbg"
              style={{
                backgroundImage: `url("${heroUrl}")`,
                transition: "opacity .3s",
              }}
            />
          ) : (
            <div
              className="abs"
              style={{
                inset: 0,
                display: "grid",
                placeItems: "center",
                alignContent: "center",
                gap: 8,
                color: "var(--muted)",
                background: "var(--surface)",
              }}
            >
              <Ic n="Camera" s={30} />
              <span className="caption">No photo captured</span>
            </div>
          )}
          <div
            className="abs"
            style={{ top: 14, left: 14, zIndex: 3, display: "flex", gap: 6 }}
          >
            <Badge tone="" lg icon={e.kind === "recommend" ? "Sparkle" : "Heartbeat"} cls="glassb">
              {e.kind === "recommend" ? t("recommend") : t("checkup")}
            </Badge>
            <Badge lg cls="glassb">
              {fDT(e.observed_at)}
            </Badge>
          </div>
          {hasPhoto && hasFieldImage && (
            <div className="abs" style={{ bottom: 14, right: 14, zIndex: 3 }}>
              <Seg
                sm
                cls="neutral"
                opts={[
                  { k: "photo" as const, l: "Photo", i: "Camera" },
                  { k: "map" as const, l: "Field", i: "Polygon" },
                ]}
                v={hero}
                on={setHero}
              />
            </div>
          )}
          <div
            className="abs"
            style={{
              bottom: 14,
              left: 14,
              zIndex: 3,
              color: "#fff",
              maxWidth: hasPhoto && hasFieldImage ? "calc(100% - 172px)" : "calc(100% - 28px)",
            }}
          >
            <div className="title-md ellip">{F.name}</div>
            <div className="body-sm ellip" style={{ opacity: 0.8 }}>
              {F.place.municipality} · {fA(F.area, settings)}
            </div>
          </div>
        </div>

        <div className="twocol mt6" style={{ gap: 40 }}>
          <div>
            {loading ? (
              <DetailSkel />
            ) : proc ? (
              <Alert tone="info" icon="ArrowsClockwise" title="Still analyzing">
                Layers are resolving in real time.
              </Alert>
            ) : e.status === "failed" ? (
              <Alert tone="risk" title="This analysis failed" action="Retry">
                The ML service did not respond. Nothing was charged against your quota.
              </Alert>
            ) : r ? (
              <ResultBody e={e} r={r} />
            ) : null}

            {!loading && r?.advisories?.length && e.status !== "abstained" && (
              <BlurFade cls="sec">
                <SecHead label="Tips this week" />
                {r.advisories.map((a, i) => (
                  <div
                    key={i}
                    className="rowitem"
                    style={{ cursor: "default", alignItems: "flex-start" }}
                  >
                    <span
                      className="cropico"
                      style={{
                        width: 38,
                        height: 38,
                        background: `var(--${
                          a.severity === "risk" ? "risk" : a.severity === "warn" ? "heat" : "sky"
                        }-tint)`,
                        color: `var(--${
                          a.severity === "risk" ? "risk" : a.severity === "warn" ? "heat" : "sky"
                        })`,
                      }}
                    >
                      <Ic n={a.icon} w="duotone" s={22} />
                    </span>
                    <div className="grow">
                      <div className="body-md" style={{ fontWeight: 500, lineHeight: 1.45 }}>
                        {a.text}
                      </div>
                      <div className="row g2 mt1">
                        <Badge
                          tone={
                            a.severity === "risk" ? "risk" : a.severity === "warn" ? "heat" : "sky"
                          }
                        >
                          {a.severity === "info"
                            ? "Good to know"
                            : a.severity === "warn"
                            ? "Act soon"
                            : "Urgent"}
                        </Badge>
                        <span className="caption">{a.kind.replace("_", " ")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </BlurFade>
            )}
          </div>

          <div className="col g8">
            <BlurFade>
              <SecHead label="Field map" />
              <div
                className="mapwrap"
                style={{
                  height: ph ? 340 : 260,
                  borderRadius: "var(--r-lg)",
                  overflow: "hidden",
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* MapView is dynamic-imported in the product so Leaflet stays
                    out of the initial bundle (blueprint 8). The thumbnail is
                    the same polygon SVG stored on the field. */}
                <img
                  src={F.thumb}
                  alt={`${F.name} boundary`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div className="caption mt2">Stored field boundary · {fA(F.area, settings)}</div>
            </BlurFade>

            {!loading && r?.week?.length && (
              <BlurFade>
                <SecHead label="Conditions at analysis" />
                <MiniWeek week={r.week} settings={settings} />
              </BlurFade>
            )}

            {!loading && r && (
              <BlurFade>
                <SecHead label="Data trust" />
                <TrustPanel r={r} />
              </BlurFade>
            )}

            {ro ? (
              <BlurFade>
                <div className="col g2">
                  <SecHead label="Actions" />
                  <div className="muted body-sm">
                    Read-only. Admins review entries but cannot re-run, compare, log an outcome or
                    delete on a farmer&apos;s behalf.
                  </div>
                </div>
              </BlurFade>
            ) : (
              <BlurFade>
                <div className="col g2">
                  <SecHead label="Actions" />
                  <div className="grid cols2 g2">
                    <Btn
                      cls="primary"
                      icon="ArrowsClockwise"
                      disabled={rerunning}
                      onClick={rerun}
                    >
                      {rerunning ? "Re-running…" : t("rerun")}
                    </Btn>
                    <Btn
                      cls="secondary"
                      icon="ArrowsLeftRight"
                      onClick={() => router.push(`/farmer/tools/compare?a=${e.id}`)}
                    >
                      {t("compare")}
                    </Btn>
                    <Btn
                      cls="secondary"
                      icon="Flag"
                      onClick={() => router.push(`/farmer/tools/outcomes?e=${e.id}`)}
                    >
                      {t("logOutcome")}
                    </Btn>
                  </div>
                  <Btn cls="destructive" icon="Trash" onClick={del}>
                    {t("del")}
                  </Btn>
                </div>
              </BlurFade>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- result body ---------- */

function ResultBody({ e, r }: { e: Entry; r: EntryResult }) {
  const { settings, openSheet } = useApp();

  if (r.status === "abstained") {
    return (
      <div className="col g4">
        <Alert tone="warn" title="No ranking for this field" action="Retry">
          Environmental data could not be read for this location. The field may sit outside the
          Environment Grid area.
        </Alert>
        <div className="body-sm muted">
          Nothing was estimated. A field outside the grid gets no suitability ranking until the grid
          covers it.
        </div>
      </div>
    );
  }

  const rel = r.reliability;
  const m = RELI[rel.tier];

  return (
    <div className="col g6">
      {r.status === "degraded" && (
        <Alert tone="warn" title="Partial data">
          {r.warnings.length
            ? r.warnings.join(" ")
            : "Some inputs were less typical than the training data. Reliability is capped at Medium."}
        </Alert>
      )}

      {e.kind === "recommend" && r.match ? (
        <>
          <BlurFade>
            <div className="row between g3">
              <div>
                <div className="label">Top recommendation</div>
                <div className="display-md" style={{ marginTop: 4 }}>
                  {CROPS[r.match[0].crop]?.name}
                </div>
                <div className="muted body-sm mt1">
                  {CLASS_L[r.match[0].class]} · Suitability {r.match[0].match_pct}%
                </div>
              </div>
              <Ring
                value={r.match[0].match_pct}
                size={104}
                stroke={9}
                suffix="%"
                label="Suitability"
              />
            </div>
          </BlurFade>

          <BlurFade>
            <SecHead
              label="Ranked crops"
              right={
                <button
                  style={{ display: "inline-flex" }}
                  onClick={() => openSheet({ title: "Reliability", render: () => <RelSheet tier={rel.tier} comps={rel.comps} /> })}
                >
                  <Badge tone={m.tone} icon={m.icon} lg>
                    {m.l}
                  </Badge>
                </button>
              }
            />
            {r.match.map((c, i) => (
              <div
                key={c.crop}
                className="rowitem"
                style={{
                  display: "grid",
                  gridTemplateColumns: "22px 44px minmax(0, 1fr) 120px",
                  alignItems: "start",
                  columnGap: 12,
                  rowGap: 4,
                }}
              >
                <span className="metric-sm muted" style={{ paddingTop: 10 }}>
                  {i + 1}
                </span>
                <CropIcon id={c.crop} s={44} />
                <div>
                  <div className="title-sm">
                    {CROPS[c.crop]?.name}{" "}
                    <span className="muted" style={{ fontWeight: 500 }}>
                      · {CLASS_L[c.class]}
                    </span>
                  </div>
                  {c.warnings.length > 0 && (
                    <div className="row g2 mt1">
                      {c.warnings.map((w, k) => (
                        <Badge key={k} tone="heat" icon="Warning">
                          {w}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="row g2" style={{ width: "100%" }}>
                  <Meter v={c.match_pct} seg={8} />
                  <span className="metric-sm" style={{ width: 40, textAlign: "right" }}>
                    {c.match_pct}
                    <span className="caption">%</span>
                  </span>
                </div>
                {c.up.length > 0 && (
                  <div
                    className="body-sm muted"
                    style={{ gridColumn: "3 / 5", lineHeight: 1.45 }}
                  >
                    {c.up.map((u) => u.label).join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </BlurFade>
        </>
      ) : r.health ? (
        <BlurFade>
          <div className="row between g3">
            <div>
              <div className="label">Health index</div>
              <div className="display-md" style={{ marginTop: 4 }}>
                {r.health.band}
              </div>
              <div className="muted body-sm mt1">
                {CROPS[e.currentCrop ?? ""]?.name} · {r.health.index} of 100
              </div>
            </div>
            <Ring
              value={r.health.index}
              size={104}
              stroke={9}
              color={bandColor(r.health.band)}
              label="Health"
            />
          </div>
          <div className="rings mt4" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
            {r.health.drivers.map((d) => (
              <Ring
                key={d.key}
                value={d.value ?? 0}
                size={72}
                stroke={6}
                color={d.value == null ? "var(--divider)" : "var(--primary)"}
                noNum={d.value == null}
                center={
                  d.value == null ? (
                    <span className="caption">—</span>
                  ) : (
                    <span style={{ font: "300 18px/1 var(--font-display)" }}>{d.value}</span>
                  )
                }
                label={d.label}
                sub={d.note}
              />
            ))}
          </div>
          {r.health.consider_instead && (
            <div className="rowitem mt4" style={{ background: "var(--accent-tint)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
              <CropIcon id={r.health.consider_instead.crop} s={40} />
              <div className="grow">
                <div className="title-sm">Consider instead</div>
                <div className="body-sm muted">{r.health.consider_instead.reason}</div>
              </div>
              <span className="metric-sm">{r.health.consider_instead.index}</span>
            </div>
          )}
        </BlurFade>
      ) : null}

      {/* Mandatory disclaimer (blueprint 11.3). Never behind a tooltip. */}
      <div className="alert info">
        <Ic n="Info" w="fill" s={20} />
        <div className="body-sm">
          <b>Reference-based estimate.</b> From GAEZ suitability data and environmental datasets.
          This is not a field test or a guarantee of yield.
        </div>
      </div>
    </div>
  );
}

function RelSheet({
  tier,
  comps,
}: {
  tier: "high" | "medium" | "low";
  comps: EntryResult["reliability"]["comps"];
}) {
  const m = RELI[tier];
  const supV = { typical: 100, unusual: 60, atypical: 20 }[comps.feature_support];
  const bar = (l: string, v: number, txt: string) => (
    <div className="col g1">
      <div className="row between body-sm">
        <span style={{ fontWeight: 650 }}>{l}</span>
        <span className="mono muted">{txt}</span>
      </div>
      <Meter v={v} color={v >= 80 ? "var(--growth)" : v >= 50 ? "var(--heat)" : "var(--risk)"} />
    </div>
  );

  return (
    <div className="col g4">
      <div className="row g4">
        <Badge tone={m.tone} icon={m.icon} lg>
          {m.l} reliability
        </Badge>
        <div className="grow body-sm muted">
          Rule-based, from four checks. High: all model features present, values inside plausible
          ranges, inputs typical for the training data, and model confidence 0.60 or more. Medium:
          at least 80% of features present, not atypical, and confidence 0.40 or more. Otherwise
          Low. A degraded run is capped at Medium.
        </div>
      </div>
      {bar("Data completeness", comps.completeness * 100, Math.round(comps.completeness * 100) + "% of model features")}
      {bar("Input quality", comps.input_quality * 100, Math.round(comps.input_quality * 100) + "% passed checks")}
      {bar("Typicality", supV, SUP_LBL[comps.feature_support])}
      {bar("Model confidence", comps.confidence * 100, Math.round(comps.confidence * 100) + "% top class")}
      <div className="alert info">
        <Ic n="Info" w="fill" s={18} />
        <div className="body-sm">
          <b>Not an accuracy measure.</b> Rule-based. Based on data completeness and how typical the
          inputs are. Not validated against field outcomes yet.
        </div>
      </div>
    </div>
  );
}

function MiniWeek({
  week,
  settings,
}: {
  week: NonNullable<EntryResult["week"]>;
  settings: ReturnType<typeof useApp>["settings"];
}) {
  return (
    <div className="week" style={{ gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}>
      {week.map((d) => (
        <div key={d.ts} className="wd" style={{ padding: "8px 2px", gap: 5 }}>
          <span className="dn" style={{ fontSize: 10.5 }}>
            {new Date(d.ts).toLocaleString("en-US", { timeZone: "Asia/Manila", weekday: "narrow" })}
          </span>
          <Ic n={WX[d.code].i} w="duotone" s={22} c={wxIcon(d.code)} />
          <span className="caption" style={{ color: "var(--foreground)" }}>
            {fTn(d.hi, settings)}°
          </span>
          <span className="caption c-water">{d.pop}%</span>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: d.workable ? "var(--growth)" : "var(--divider)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function TrustPanel({ r }: { r: EntryResult }) {
  const L: Record<string, [string, string]> = {
    soil: ["Mountains", "Soil"],
    terrain: ["ArrowLineUp", "Terrain"],
    climate: ["Thermometer", "Climate"],
    weather: ["CloudSun", "Forecast"],
  };

  return (
    <div>
      {r.data_quality.map((q) => {
        const tone = q.status === "ok" ? "ok" : q.status === "fallback" || q.status === "partial" ? "warn" : "bad";
        return (
          <Acc
            key={q.layer}
            head={
              <div className="row g3">
                <Dot s={tone} />
                <Ic n={L[q.layer][0]} w="duotone" s={22} c="var(--muted)" />
                <div className="grow">
                  <div className="title-sm">
                    {L[q.layer][1]}{" "}
                    <span className="muted" style={{ fontWeight: 500 }}>
                      · {q.status === "failed" ? "unavailable" : q.source}
                      {q.status === "partial" ? " (partial)" : ""}
                    </span>
                  </div>
                </div>
                <Badge tone={PROV_TONE[q.kind] || ""}>{PROV_LBL[q.kind] || q.kind}</Badge>
              </div>
            }
          >
            <div className="body-sm muted" style={{ lineHeight: 1.55 }}>
              {q.note}
            </div>
            {q.flags.length > 0 && (
              <div className="tag-row mt2">
                {q.flags.map((f) => (
                  <Badge key={f} tone="heat" icon="Flag">
                    {FLAG_LBL[f] || f}
                  </Badge>
                ))}
              </div>
            )}
          </Acc>
        );
      })}
      {r.flags.includes("moisture_mismatch") && (
        <div className="alert warn mt3">
          <Ic n="Info" w="fill" s={20} />
          <div className="body-sm">
            Your moisture reading differs from modeled soil moisture by 2 or more classes. Your value
            is kept and the uncertainty is widened.
          </div>
        </div>
      )}
      <div className="caption mt3">
        Measured values come only from your own entries. Everything else is modeled, derived,
        reanalysis or forecast.
      </div>
    </div>
  );
}

function DetailSkel() {
  return (
    <div className="col g4 mt4">
      <div className="row g4">
        <Skel w={150} h={150} r="50%" />
        <div className="grow col g3">
          <Skel w="60%" h={28} />
          <Skel w="40%" h={14} />
          <Skel w="80%" h={14} />
        </div>
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="row g3">
          <Skel w={44} h={44} r="12px" />
          <div className="grow col g2">
            <Skel w="45%" h={14} />
            <Skel w="25%" h={11} />
          </div>
        </div>
      ))}
    </div>
  );
}
