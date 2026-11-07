"use client";

/* Farmer analytics (blueprint F-23, P2). Suitability mix, reliability mix,
   health bands, reported moisture and a field table. */

import { useState } from "react";
import { Ic } from "@/components/ui/Ic";
import {
  BlurFade,
  Chip,
  Meter,
  Ring,
  SecHead,
  Seg,
  SegBar,
  SegRing,
  Skel,
  Table,
  useLoad,
} from "@/components/ui/primitives";
import { Page } from "@/components/shell/Page";
import { useApp } from "@/lib/state";
import { t } from "@/lib/i18n/en";
import { avg } from "@/lib/utils";
import { MOIST, bandColor } from "@/lib/codes";
import { CROPS } from "@/lib/spec/crops";
import { topOf } from "@/lib/fixtures";
import { liveMyEntries, liveMySpaces, liveField } from "@/lib/store";
import { useDb } from "@/lib/useDb";

const DAY = 864e5;

type Range = "30" | "90" | "365";

export function Analytics() {
  const { bp, user } = useApp();
  useDb();
  const [rg, setRg] = useState<Range>("90");
  const [sid, setSid] = useState("all");
  const ms = liveMySpaces(user.id);
  const loading = useLoad("an" + user.id, 600);
  const wide = bp !== "xs" && bp !== "sm";

  const es = liveMyEntries(user.id).filter(
    (e) =>
      e.result &&
      e.status !== "failed" &&
      Date.now() - e.observed_at < +rg * DAY &&
      (sid === "all" || e.spaceId === sid)
  );

  return (
    <Page title={t("analytics")} wide>
      <BlurFade>
        <div className={wide ? "display-lg" : "display-md"} style={{ margin: "6px 0 16px" }}>
          {t("analytics")}
        </div>
      </BlurFade>

      <div className="row g2 wrap">
        <Seg
          opts={[
            { k: "30" as Range, l: "30 d" },
            { k: "90" as Range, l: "90 d" },
            { k: "365" as Range, l: "Season" },
          ]}
          v={rg}
          on={setRg}
        />
        {ms.length > 1 && (
          <div className="pill-tabs">
            <Chip sm on={sid === "all"} onClick={() => setSid("all")}>
              All spaces
            </Chip>
            {ms.map((x) => (
              <Chip key={x.id} sm on={sid === x.id} onClick={() => setSid(x.id)}>
                {x.name.split(" ")[0]}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt6">
          <Skel h={220} r="20px" />
        </div>
      ) : (
        <AnalyticsBody es={es} ph={wide} />
      )}
    </Page>
  );
}

function AnalyticsBody({ es, ph }: { es: ReturnType<typeof liveMyEntries>; ph: boolean }) {
  const rec = es.filter((e) => e.kind === "recommend" && topOf(e));
  const chk = es.filter((e) => e.kind === "checkup" && e.result?.health);
  const matches = rec.map((e) => topOf(e)!.match_pct);
  const rel = es.map((e) => (e.result!.reliability.tier === "high" ? 1 : 0));

  const dist: Record<string, number> = {};
  rec.forEach((e) => {
    const c = topOf(e)!.crop;
    dist[c] = (dist[c] || 0) + 1;
  });
  const dl = Object.entries(dist).sort((a, b) => b[1] - a[1]);

  const relC = { high: 0, medium: 0, low: 0 };
  es.forEach((e) => relC[e.result!.reliability.tier]++);

  const bands: Record<string, number> = { Thriving: 0, Steady: 0, Watch: 0, "At risk": 0 };
  chk.forEach((e) => bands[e.result!.health!.band]++);

  const mo = [0, 0, 0, 0, 0];
  es.forEach((e) => {
    if (e.moisture >= 1 && e.moisture <= 5) mo[e.moisture - 1]++;
  });

  const byField: Record<string, { f: NonNullable<ReturnType<typeof liveField>>; n: number; m: number[]; r: number[] }> = {};
  es.forEach((e) => {
    const f = liveField(e.fieldId);
    if (!f) return;
    byField[f.id] = byField[f.id] || { f, n: 0, m: [], r: [] };
    byField[f.id].n++;
    byField[f.id].r.push(e.result!.reliability.tier === "high" ? 1 : 0);
    if (e.kind === "recommend" && topOf(e)) byField[f.id].m.push(topOf(e)!.match_pct);
  });
  const bf = Object.values(byField).sort((a, b) => avg(b.m) - avg(a.m));

  const palette = [
    "var(--cereal)",
    "var(--vegetable)",
    "var(--plantation)",
    "var(--fruit)",
    "var(--root)",
    "var(--fiber)",
    "var(--legume)",
    "var(--herb)",
  ];
  const rs = ph ? 112 : 84;

  return (
    <div>
      <BlurFade cls="sec" style={{ marginTop: 28 }}>
        <div className="rings" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
          <Ring id="an1" value={Math.round(avg(matches) || 0)} size={rs} suffix="%" label="Avg suitability" />
          <Ring
            id="an2"
            value={Math.round(avg(rel) * 100 || 0)}
            size={rs}
            color="var(--growth)"
            suffix="%"
            label="High reliability"
          />
          <Ring id="an3" value={es.length} max={Math.max(20, es.length)} size={rs} color="var(--water)" label="Entries" />
          <Ring
            id="an4"
            value={Object.keys(byField).length}
            max={Math.max(8, Object.keys(byField).length)}
            size={rs}
            color="var(--sky)"
            label="Fields"
          />
        </div>
      </BlurFade>

      <div className="twocol mt8 sec" style={{ gap: 48 }}>
        <BlurFade>
          <SecHead label="Crop distribution" />
          {dl.length ? (
            <div className="row g5 wrap">
              <SegRing
                items={dl.slice(0, 8).map(([c, n], i) => ({ v: n, c: palette[i % 8], l: CROPS[c].name }))}
                size={ph ? 170 : 140}
                stroke={18}
                center={
                  <div className="tc">
                    <div className="metric-md">{rec.length}</div>
                    <div className="caption">top picks</div>
                  </div>
                }
              />
              <div className="grow col" style={{ minWidth: 150 }}>
                {dl.slice(0, 6).map(([c, n], i) => (
                  <div
                    className="row g2"
                    key={c}
                    style={{
                      padding: "7px 0",
                      borderBottom: "1px solid color-mix(in oklab,var(--divider) 45%,transparent)",
                    }}
                  >
                    <i style={{ width: 10, height: 10, borderRadius: 3, background: palette[i % 8] }} />
                    <span className="grow" style={{ fontWeight: 600 }}>
                      {CROPS[c].name}
                    </span>
                    <span className="mono muted">{n}</span>
                    <span className="mono" style={{ width: 40, textAlign: "right" }}>
                      {Math.round((n / rec.length) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="muted body-sm">Run a Recommend to see which crops rank first.</div>
          )}
        </BlurFade>

        <div className="col g8">
          <BlurFade>
            <SecHead label="Reliability distribution" />
            <SegBar
              h={14}
              items={[
                { v: relC.high, c: "var(--growth)", l: "High" },
                { v: relC.medium, c: "var(--heat)", l: "Medium" },
                { v: relC.low, c: "var(--risk)", l: "Low" },
              ]}
            />
            <div className="legend mt2">
              <span>
                <i style={{ background: "var(--growth)" }} />
                High {relC.high}
              </span>
              <span>
                <i style={{ background: "var(--heat)" }} />
                Medium {relC.medium}
              </span>
              <span>
                <i style={{ background: "var(--risk)" }} />
                Low {relC.low}
              </span>
            </div>
          </BlurFade>

          <BlurFade>
            <SecHead label="Check-up health bands" />
            <SegBar
              h={14}
              items={Object.entries(bands).map(([k, v]) => ({ v, c: bandColor(k), l: k }))}
            />
            <div className="legend mt2">
              {Object.entries(bands).map(([k, v]) => (
                <span key={k}>
                  <i style={{ background: bandColor(k) }} />
                  {k} {v}
                </span>
              ))}
            </div>
          </BlurFade>

          <BlurFade>
            <SecHead label="Reported moisture" />
            <div className="bars">
              {mo.map((n, i) => (
                <div className="brow" key={i}>
                  <span className="bl row g2">
                    <Ic n={MOIST[i].i} w="fill" s={15} c="var(--water)" />
                    {t("m" + (i + 1))}
                  </span>
                  <Meter v={n} max={Math.max(1, ...mo)} color="var(--water)" />
                  <span className="bv">{n}</span>
                </div>
              ))}
            </div>
          </BlurFade>
        </div>
      </div>

      <BlurFade cls="sec">
        <SecHead label="Suitability by field" />
        <Table
          cols={[
            { h: "Field", r: (b) => <span style={{ fontWeight: 650 }}>{b.f.name}</span> },
            { h: "Entries", num: true, r: (b) => b.n },
            {
              h: "Avg suitability",
              num: true,
              r: (b) =>
                b.m.length ? (
                  <div className="row g2 end">
                    <div style={{ width: 70 }}>
                      <Meter v={avg(b.m)} />
                    </div>
                    <span className="mono">{Math.round(avg(b.m))}%</span>
                  </div>
                ) : (
                  "—"
                ),
            },
            { h: "High reliability", num: true, r: (b) => Math.round(avg(b.r) * 100) + "%" },
          ]}
          rows={bf.slice(0, 8)}
        />
      </BlurFade>
    </div>
  );
}
