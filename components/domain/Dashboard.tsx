"use client";

/* Dashboard. Transcribed from the mockup's Dashboard function: same markup,
   class names, ring sizes, stagger delays and copy. Data comes from the
   fixture layer instead of the mockup's in-memory store. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import { CropIcon } from "@/components/ui/CropIcon";
import {
  BlurFade,
  Dot,
  Empty,
  Meter,
  Ring,
  SecHead,
  Skel,
  TextAnimate,
  useLoad,
} from "@/components/ui/primitives";
import { Page } from "@/components/shell/Page";
import { EntryCard } from "@/components/domain/EntryCard";
import { useApp } from "@/lib/state";
import { avg, cx } from "@/lib/utils";
import { t } from "@/lib/i18n/en";
import { fLong, fTn } from "@/lib/units/format";
import { RELI, WX, bandColor, bandTone, wxIcon } from "@/lib/codes";
import { CROPS } from "@/lib/spec/crops";
import { topOf, weekFor } from "@/lib/fixtures";
import { liveLatestByField, liveMyEntries, liveMyFields } from "@/lib/store";
import { useDb } from "@/lib/useDb";
import type { Entry, Field } from "@/lib/types";

const DAY = 864e5;

function greet() {
  const hh = +new Date().toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    hour12: false,
  });
  return hh < 12 ? t("gm") : hh < 18 ? t("ga") : t("ge");
}

function latestForDash(fields: Field[]) {
  return fields
    .map((f) => ({ f, e: liveLatestByField(f.id) }))
    .filter((x): x is { f: Field; e: Entry } => !!x.e && !!x.e.result);
}

export function Dashboard() {
  const { bp, user, space, settings } = useApp();
  const router = useRouter();
  const ph = bp !== "xs" && bp !== "sm";
  const loading = useLoad("dash" + user.id, 650);
  useDb();

  const fields = liveMyFields(user.id, space?.id);
  const rows = latestForDash(fields);
  const ents = liveMyEntries(user.id).filter((e) => !space || e.spaceId === space.id);
  const mo = ents.filter((e) => Date.now() - e.observed_at < 30 * DAY);

  const matches = rows.map(({ e }) =>
    e.kind === "recommend" ? topOf(e)!.match_pct : e.result!.health!.index
  );
  const avgM = Math.round(avg(matches) || 0);
  const hiShare = rows.length
    ? rows.filter(({ e }) => e.result!.reliability.tier === "high").length / rows.length
    : 0;
  const tier = hiShare >= 0.5 ? "high" : hiShare >= 0.25 ? "medium" : "low";
  const rs = ph ? (bp === "md" ? 104 : 124) : 76;
  const stroke = ph ? 9 : 7;

  if (!space) {
    return (
      <Page title={t("home")}>
        <Empty
          icon="Stack"
          title={"Welcome, " + user.name.split(" ")[0]}
          sub="Join your cooperative with the access code your admin gave you. Then capture a field and run your first analysis."
          action={t("joinspace")}
        />
      </Page>
    );
  }

  const wxF = fields[0];
  const week = wxF ? weekFor(wxF.id) : null;

  return (
    <Page title={t("home")} wide>
      <div style={{ position: "relative", marginTop: 6 }}>
        <div className="glow" style={{ top: 140, left: "30%" }} />

        <BlurFade>
          <div className={ph ? "display-lg" : "display-md"} style={{ margin: "6px 0 4px" }}>
            <TextAnimate
              parts={[
                { t: greet() + ", ", w: 200 },
                { t: user.name.split(" ")[0], w: 800 },
              ]}
            />
          </div>
          <div className="muted body-lg">
            {fLong(Date.now())} · {space.place.municipality}
          </div>
        </BlurFade>

        <BlurFade delay={60} cls="sec" style={{ marginTop: 28 }}>
          <div className="rings" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
            {loading ? (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="col" style={{ alignItems: "center", gap: 10 }}>
                  <Skel w={rs} h={rs} r="50%" />
                  <Skel w={56} h={10} />
                </div>
              ))
            ) : (
              <>
                <Ring
                  id={"d-m" + space.id}
                  value={avgM}
                  size={rs}
                  stroke={stroke}
                  suffix="%"
                  label={t("avgMatch")}
                  delta={3}
                />
                <Ring
                  id={"d-f" + space.id}
                  value={fields.length}
                  max={8}
                  size={rs}
                  stroke={stroke}
                  color="var(--sky)"
                  label={t("fieldsL")}
                  sub="of 8 slots"
                />
                <Ring
                  id={"d-e" + space.id}
                  value={mo.length}
                  max={20}
                  size={rs}
                  stroke={stroke}
                  color="var(--water)"
                  label={t("entriesMo")}
                />
                <Ring
                  id={"d-r" + space.id}
                  value={Math.round(hiShare * 100)}
                  size={rs}
                  stroke={stroke}
                  color={"var(--" + RELI[tier as "high"].tone + ")"}
                  label={t("reliability")}
                  center={
                    <span
                      className={"title-sm c-" + RELI[tier as "high"].tone}
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        // The mockup uses rs*.24 for every centre label, which
                        // overflows the ring for a 6-character word like
                        // "Medium". Cap it so the label stays inside the
                        // inner diameter.
                        fontSize:
                          Math.round(
                            Math.min(
                              rs * 0.24,
                              (rs - stroke * 2 - 10) / (RELI[tier as "high"].l.length * 0.62)
                            )
                          ) + "px",
                      }}
                    >
                      {RELI[tier as "high"].l}
                    </span>
                  }
                />
              </>
            )}
          </div>
        </BlurFade>

        <div className="sec twocol" style={{ marginTop: 44 }}>
          <div>
            <BlurFade>
              <SecHead
                label={t("topCrops")}
                right={
                  <Link href="/farmer/entries" className="body-sm primary-c" style={{ fontWeight: 650 }}>
                    {t("all")}
                  </Link>
                }
              />
              {loading ? (
                [0, 1, 2].map((i) => (
                  <div key={i} className="rowitem">
                    <Skel w={40} h={40} r="12px" />
                    <div className="grow col g2">
                      <Skel w="50%" h={14} />
                      <Skel w="30%" h={11} />
                    </div>
                  </div>
                ))
              ) : rows.length ? (
                rows.map(({ f, e }) => {
                  const isR = e.kind === "recommend";
                  const tp = isR ? topOf(e) : e.result!.current;
                  const pct = isR ? tp!.match_pct : e.result!.health!.index;
                  const cropId = isR ? tp!.crop : e.currentCrop!;
                  return (
                    <div
                      key={e.id}
                      className="rowitem hv"
                      onClick={() => router.push(`/farmer/entries/${e.id}`)}
                    >
                      <CropIcon id={cropId} s={44} />
                      <div className="grow">
                        <div className="title-sm">
                          {CROPS[cropId]?.name}
                          {!isR && (
                            <span
                              className={cx("badge", bandTone(e.result!.health!.band))}
                              style={{ marginLeft: 6 }}
                            >
                              {e.result!.health!.band}
                            </span>
                          )}
                        </div>
                        <div className="body-sm muted ellip">
                          {f.name} · {isR ? "Recommended" : "Check-up"}
                        </div>
                      </div>
                      <div className="row g3" style={{ width: "44%", maxWidth: 210 }}>
                        <Meter
                          v={pct}
                          seg={8}
                          color={isR ? undefined : bandColor(e.result!.health!.band)}
                        />
                        <span className="metric-sm" style={{ width: 46, textAlign: "right" }}>
                          {pct}
                          <span className="caption">%</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <Empty
                  icon="Sparkle"
                  title="No analyses yet"
                  sub="Run a Recommend or Check-up on one of your fields to see ranked crops here."
                  action="Analyze a field"
                  onAction={() => router.push("/farmer/analyze")}
                />
              )}
            </BlurFade>
          </div>

          <div>
            <BlurFade delay={40}>
              <SecHead label={t("fieldStatus")} />
              <div className="row g4 hide-sb" style={{ overflowX: "auto", padding: "8px 2px 4px" }}>
                {fields.length ? (
                  fields.map((f) => {
                    const e = liveLatestByField(f.id);
                    const ok = !!e && !!e.result;
                    const v = ok
                      ? e!.kind === "recommend"
                        ? topOf(e)!.match_pct
                        : e!.result!.health!.index
                      : 0;
                    const col = !ok
                      ? "var(--subtle)"
                      : e!.kind === "checkup"
                      ? bandColor(e!.result!.health!.band)
                      : "var(--primary)";
                    return (
                      <button
                        key={f.id}
                        className="col"
                        style={{ alignItems: "center", gap: 8, flexShrink: 0, width: 84 }}
                        onClick={() => router.push(`/farmer/fields/${f.id}`)}
                      >
                        <Ring
                          id={"fs" + f.id}
                          value={v}
                          size={68}
                          stroke={6}
                          color={col}
                          suffix={ok ? "%" : ""}
                          center={ok ? undefined : <Ic n="ShieldSlash" c="var(--subtle)" s={22} />}
                        />
                        <span className="body-sm ellip" style={{ maxWidth: 84, fontWeight: 600 }}>
                          {f.name.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <span className="muted body-sm">Capture a field to see its status ring.</span>
                )}
              </div>
            </BlurFade>
          </div>
        </div>

        <BlurFade cls="sec">
          <SecHead
            label={t("thisWeek")}
            right={
              <span className="caption row g1">
                <Dot s="ok" live />
                Open-Meteo · 2 h ago
              </span>
            }
          />
          {week ? (
            <div className={cx("week", !ph && "snap")} style={{ marginTop: 4 }}>
              {week.map((d, i) => (
                <div key={d.ts} className={cx("wd", i === 0 && "today")}>
                  <span className="dn">
                    {i === 0
                      ? t("today")
                      : new Date(d.ts).toLocaleString("en-US", {
                          timeZone: "Asia/Manila",
                          weekday: "short",
                        })}
                  </span>
                  <Ic n={WX[d.code].i} w="duotone" s={30} c={wxIcon(d.code)} />
                  <span className="hl">
                    {fTn(d.hi, settings)}
                    <span className="subtle">/{fTn(d.lo, settings)}°</span>
                  </span>
                  <span className="rp">
                    <Ic n="Drop" w="fill" s={11} />
                    {d.pop}%
                  </span>
                  <span className={cx("wk", d.workable ? "y" : d.score > 45 ? "m" : "n")}>
                    <Ic
                      n={d.workable ? "CheckCircle" : d.score > 45 ? "Minus" : "X"}
                      w="bold"
                      s={11}
                    />
                    {d.workable ? t("workable") : d.score > 45 ? "Maybe" : "Wait"}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </BlurFade>

        <BlurFade cls="sec">
          <SecHead
            label={t("recent")}
            right={
              <Link href="/farmer/entries" className="body-sm primary-c" style={{ fontWeight: 650 }}>
                {t("all")}
              </Link>
            }
          />
          <div className="strip hide-sb">
            {ents.slice(0, 8).map((e) => (
              <div key={e.id} style={{ width: ph ? 190 : 158 }}>
                <EntryCard e={e} />
              </div>
            ))}
            {!ents.length && <span className="muted body-sm">Nothing yet.</span>}
          </div>
        </BlurFade>
      </div>
    </Page>
  );
}

