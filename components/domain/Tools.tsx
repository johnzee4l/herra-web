"use client";

/* Tools (blueprint 7.1, P2): compare, planting window, outcome log.
   The outcome log stores feedback. It does not train the model, and the
   screen says so before submission (blueprint section 12). */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import { CropIcon } from "@/components/ui/CropIcon";
import {
  Alert,
  Badge,
  BlurFade,
  Btn,
  Chip,
  Delta,
  Empty,
  Field,
  Meter,
  Ring,
  SecHead,
  haptic,
} from "@/components/ui/primitives";
import { Page } from "@/components/shell/Page";
import { useApp } from "@/lib/state";
import { t } from "@/lib/i18n/en";
import { clamp, sum, uid } from "@/lib/utils";
import { fDT, fdate } from "@/lib/units/format";
import { CLASS_L, WX, bandColor, wxIcon } from "@/lib/codes";
import { CROPS } from "@/lib/spec/crops";
import { topOf, weekFor } from "@/lib/fixtures";
import { CROP_IDS } from "@/lib/spec/crops";
import { addOutcome, db, liveEntry, liveField, liveMyEntries, liveMyFields } from "@/lib/store";
import { useForecast } from "@/lib/useForecast";
import { useDb } from "@/lib/useDb";
import type { Entry } from "@/lib/types";

/* ---------- tool index ---------- */

export function Tools() {
  const { bp } = useApp();
  const router = useRouter();
  const wide = bp !== "xs" && bp !== "sm";

  const items: [string, string, string, string][] = [
    ["compare", "Compare", "Two entries or fields side by side", "ArrowsLeftRight"],
    ["planting-window", "Planting window", "Workable days across the next 7", "CalendarCheck"],
    ["outcomes", "Outcome log", "Tell us how a season went", "Flag"],
  ];

  return (
    <Page title={t("tools")} wide>
      <BlurFade>
        <div className={wide ? "display-lg" : "display-md"} style={{ margin: "6px 0 20px" }}>
          {t("tools")}
        </div>
      </BlurFade>
      <div className="cap68">
        {items.map(([k, l, sub, ic], i) => (
          <BlurFade key={k} delay={i * 50}>
            <div
              className="rowitem hv"
              style={{ padding: "20px 0" }}
              onClick={() => router.push(`/farmer/tools/${k}`)}
            >
              <span
                className="cropico"
                style={{ width: 52, height: 52, background: "var(--accent-tint)", color: "var(--primary)" }}
              >
                <Ic n={ic} w="duotone" s={28} />
              </span>
              <div className="grow">
                <div className="title-md">{l}</div>
                <div className="body-sm muted">{sub}</div>
              </div>
              <Ic n="CaretRight" s={18} c="var(--subtle)" />
            </div>
          </BlurFade>
        ))}
      </div>
    </Page>
  );
}

function ToolPage({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  const { bp } = useApp();
  const router = useRouter();
  const wide = bp !== "xs" && bp !== "sm";
  return (
    <Page title={title} backTo="/farmer/tools" wide>
      <BlurFade>
        <div className={wide ? "display-md" : "title-lg"} style={{ margin: "6px 0 4px" }}>
          {title}
        </div>
        {sub && <div className="muted">{sub}</div>}
      </BlurFade>
      <div className="mt6">{children}</div>
    </Page>
  );
}

/* ---------- compare ---------- */

export function Compare() {
  const q = useSearchParams();
  const { openSheet } = useApp();
  useDb();
  const [a, setA] = useState<string | null>(q.get("a"));
  const [b, setB] = useState<string | null>(q.get("b"));

  const ea = a ? liveEntry(a) || undefined : undefined;
  const eb = b ? liveEntry(b) || undefined : undefined;

  const col = (e: Entry | undefined, pk: "a" | "b") =>
    !e ? (
      <button
        className="card hov"
        style={{
          padding: "36px 16px",
          borderStyle: "dashed",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
        onClick={() =>
          openSheet({
            title: "Pick an entry",
            render: (close) => (
              <EntryPick
                close={close}
                exclude={pk === "a" ? b : a}
                on={(id) => {
                  if (pk === "a") setA(id);
                  else setB(id);
                }}
              />
            ),
          })
        }
      >
        <Ic n="Plus" s={28} c="var(--primary)" />
        <span className="title-sm">Choose entry {pk.toUpperCase()}</span>
      </button>
    ) : (
      <div className="col g4" style={{ alignItems: "center" }}>
        <div className="thumb" style={{ width: "100%", aspectRatio: "16/10", borderRadius: 18 }}>
          <div className="tbg" style={{ backgroundImage: `url("${e.photo.url}")` }} />
        </div>
        <div className="tc">
          <div className="title-md">{liveField(e.fieldId)?.name}</div>
          <div className="caption">
            {t(e.kind)} · {fDT(e.observed_at)}
          </div>
        </div>
        {e.kind === "recommend" && topOf(e) ? (
          <Ring
            id={"cm" + e.id}
            value={topOf(e)!.match_pct}
            size={110}
            suffix="%"
            label={CROPS[topOf(e)!.crop].name}
            sub={CLASS_L[topOf(e)!.class]}
          />
        ) : e.result?.health ? (
          <Ring
            id={"cm" + e.id}
            value={e.result.health.index}
            size={110}
            color={bandColor(e.result.health.band)}
            label={e.result.health.band}
          />
        ) : null}
      </div>
    );

  const val = (e?: Entry) =>
    e ? (e.kind === "recommend" ? topOf(e)?.match_pct ?? 0 : e.result?.health?.index ?? 0) : 0;

  const rows: [string, number, number, string][] =
    ea && eb
      ? [
          ["Score", val(ea), val(eb), "%"],
          ["Moisture reported", ea.moisture, eb.moisture, ""],
          [
            "Rain, next 7 days",
            Math.round(sum((ea.result?.week ?? []).map((d) => d.rain))),
            Math.round(sum((eb.result?.week ?? []).map((d) => d.rain))),
            " mm",
          ],
          ...(ea.kind === "checkup" && eb.kind === "checkup" && ea.result?.health && eb.result?.health
            ? (["fit", "water", "thermal", "soil"] as const).map((k) => {
                const dv = (h: { drivers: { key: string; value: number | null }[] } | undefined) =>
                  h?.drivers.find((d) => d.key === k)?.value ?? 0;
                return [
                  k[0].toUpperCase() + k.slice(1),
                  dv(ea.result!.health),
                  dv(eb.result!.health),
                  "",
                ] as [string, number, number, string];
              })
            : []),
        ]
      : [];

  const lab = (x?: string) => (x === "high" ? "High" : x === "medium" ? "Medium" : "Low");

  return (
    <ToolPage title="Compare" sub="Suitability, reliability and factors for two entries.">
      <div className="grid cols2 g4">
        {col(ea, "a")}
        {col(eb, "b")}
      </div>

      {rows.length > 0 && (
        <div className="mt8 cap68">
          <SecHead label="Differences" />
          {rows.map(([l, x, y, u]) => {
            const d = x - y;
            return (
              <div
                className="row"
                key={l}
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid color-mix(in oklab,var(--divider) 45%,transparent)",
                }}
              >
                <span className="grow" style={{ fontWeight: 650 }}>
                  {l}
                </span>
                <span className="metric-sm" style={{ width: 70, textAlign: "right" }}>
                  {x}
                  {u}
                </span>
                <span style={{ width: 96, textAlign: "center" }}>
                  {d !== 0 ? <Delta v={d} /> : <span className="delta eq">same</span>}
                </span>
                <span className="metric-sm" style={{ width: 70 }}>
                  {y}
                  {u}
                </span>
              </div>
            );
          })}
          <div className="row" style={{ padding: "14px 0" }}>
            <span className="grow" style={{ fontWeight: 650 }}>
              Reliability
            </span>
            <span className="title-sm" style={{ width: 70, textAlign: "right" }}>
              {lab(ea?.result?.reliability.tier)}
            </span>
            <span style={{ width: 96, textAlign: "center" }}>
              <span className="delta eq">
                {ea?.result?.reliability.tier === eb?.result?.reliability.tier ? "same" : "differs"}
              </span>
            </span>
            <span className="title-sm" style={{ width: 70 }}>
              {lab(eb?.result?.reliability.tier)}
            </span>
          </div>
        </div>
      )}
    </ToolPage>
  );
}

function EntryPick({
  close,
  on,
  exclude,
}: {
  close: () => void;
  on: (id: string) => void;
  exclude?: string | null;
}) {
  const { user } = useApp();
  const es = liveMyEntries(user.id)
    .filter((e) => e.result && e.status !== "abstained" && e.id !== exclude)
    .slice(0, 14);

  return (
    <div className="col">
      {es.map((e) => {
        const isR = e.kind === "recommend";
        const pct = isR ? topOf(e)?.match_pct : e.result?.health?.index;
        return (
          <button
            key={e.id}
            className="rowitem hv"
            onClick={() => {
              on(e.id);
              close();
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: `url("${e.photo.url}") center/cover`,
                flexShrink: 0,
              }}
            />
            <div className="grow">
              <div className="title-sm">{liveField(e.fieldId)?.name}</div>
              <div className="caption">
                {t(e.kind)} · {fDT(e.observed_at)}
              </div>
            </div>
            <b>{pct != null ? `${pct}%` : "—"}</b>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- planting window ---------- */

export function Planting() {
  const { user, bp } = useApp();
  const router = useRouter();
  useDb();
  const fl = liveMyFields(user.id);
  const [fid, setF] = useState(fl[0]?.id);
  const f = fid ? liveField(fid) : undefined;
  const [cr, setCr] = useState(f?.current_crop || "maize");
  const [day, setDay] = useState(0);
  const wide = bp !== "xs" && bp !== "sm";
  const storedWeek = f ? weekFor(f.id) : [];
  const { week: forecast, loading: wxLoading, error: wxError } = useForecast(
    f?.centroid[0],
    f?.centroid[1],
    storedWeek
  );

  if (!f) {
    return (
      <ToolPage title="Planting window">
        <Empty
          icon="Polygon"
          title="Add a field first"
          action={t("newfield")}
          onAction={() => router.push("/farmer/fields/new")}
        />
      </ToolPage>
    );
  }

  const c = CROPS[cr];
  const week = forecast.map((d) => {
    const rainS = clamp(100 - d.pop * 1.1, 0, 100);
    const windS = clamp(100 - Math.max(0, d.wind - 15) * 3.2, 0, 100);
    const heatS = clamp(100 - Math.max(0, d.hi - (c.heat - 5)) * 16, 0, 100);
    const soilS = clamp(100 - Math.abs(d.rain - 62) * 2.2, 0, 100);
    return {
      ...d,
      rainS,
      windS,
      heatS,
      soilS,
      sc: Math.round(rainS * 0.4 + windS * 0.2 + heatS * 0.15 + soilS * 0.25),
    };
  });
  const best = [...week].sort((a, b) => b.sc - a.sc).slice(0, 3).map((d) => d.ts);
  if (!week.length) {
    return (
      <ToolPage title="Planting window" sub="Scores each of the next 7 days for rain, wind, heat and soil moisture.">
        <Alert tone="info" title={wxLoading ? "Fetching the forecast" : "Forecast unavailable"}>
          {wxLoading
            ? "Open-Meteo is returning the next 7 days for this field."
            : wxError || "No forecast is available for this field yet."}
        </Alert>
      </ToolPage>
    );
  }
  const sel = week[day] ?? week[0];

  const tips = [
    ...new Set(
      [
        f.current_crop,
        topOf(liveMyEntries(user.id)[0])?.crop,
        "maize",
        "rice",
        "cassava",
        "coconut",
        "cabbage",
        "banana",
      ].filter(Boolean) as string[]
    ),
  ].slice(0, 6);

  return (
    <ToolPage
      title="Planting window"
      sub="Scores each of the next 7 days for rain, wind, heat and soil moisture."
    >
      <div className="col g4">
        <div className="tag-row">
          {fl.map((x) => (
            <Chip
              key={x.id}
              sm
              on={x.id === fid}
              icon="Polygon"
              onClick={() => {
                setF(x.id);
                setDay(0);
              }}
            >
              {x.name}
            </Chip>
          ))}
        </div>
        <div className="tag-row">
          {tips.map((x) => (
            <Chip key={x} sm on={x === cr} onClick={() => setCr(x)}>
              {CROPS[x]?.name ?? x}
            </Chip>
          ))}
        </div>
      </div>

      <div className="week mt6" style={{ margin: "24px 0 0" }}>
        {week.map((d, i) => (
          <button
            key={d.ts}
            className={"wd" + (i === day ? " today" : "")}
            onClick={() => {
              haptic("tick");
              setDay(i);
            }}
            style={i === day ? { background: "var(--accent-tint)", borderRadius: 16 } : undefined}
          >
            <span className="dn">
              {i === 0
                ? t("today")
                : fdate(d.ts, { weekday: "short" })}
            </span>
            <Ring
              id={"pw" + fid + cr + i}
              value={d.sc}
              size={wide ? 64 : 44}
              stroke={5}
              color={d.sc >= 70 ? "var(--growth)" : d.sc >= 50 ? "var(--heat)" : "var(--risk)"}
              center={
                <span style={{ font: `500 ${wide ? 16 : 12}px var(--font-display)` }}>{d.sc}</span>
              }
            />
            <Ic n={WX[d.code].i} w="duotone" s={22} c={wxIcon(d.code)} />
            {best.includes(d.ts) ? <span className="wk y">Best</span> : <span className="wk n">·</span>}
          </button>
        ))}
      </div>

      <div className="mt8 cap68">
        <SecHead
          label={`${fdate(sel.ts, { weekday: "long", month: "short", day: "numeric" })} · why ${sel.sc}`}
        />
        <div className="bars mt3">
          {(
            [
              ["Rain", sel.rainS, "CloudRain", `${sel.pop}% chance · ${sel.rain.toFixed(1)} mm`, "var(--water)"],
              ["Wind", sel.windS, "Wind", `${sel.wind} km/h`, "var(--sky)"],
              ["Heat", sel.heatS, "Thermometer", `High ${sel.hi}°C vs ${c.name} limit ${c.heat}°C`, "var(--heat)"],
              ["Soil moisture", sel.soilS, "Drop", `Modeled ${Math.round(sel.rain)}% saturation`, "var(--soil)"],
            ] as [string, number, string, string, string][]
          ).map(([l, v, ic, note, colr]) => (
            <div className="col g1" key={l}>
              <div className="row between">
                <span className="row g2" style={{ fontWeight: 650 }}>
                  <Ic n={ic} w="duotone" s={18} c={colr} />
                  {l}
                </span>
                <span className="caption">{note}</span>
              </div>
              <Meter v={v} color={colr} />
            </div>
          ))}
        </div>
      </div>
    </ToolPage>
  );
}

/* ---------- outcome log ---------- */

export function Outcomes() {
  const { user, toast } = useApp();
  const q = useSearchParams();
  useDb();
  const fl = liveMyFields(user.id);
  const pre = q.get("e") ? liveEntry(q.get("e")!) : undefined;

  const [fid, setF] = useState<string | undefined>(
    q.get("field") || pre?.fieldId || fl[0]?.id
  );
  const f = fid ? liveField(fid) : undefined;
  const [crop, setCrop] = useState<string | undefined>(f?.current_crop);
  const [tag, setTag] = useState<string | null>(null);
  const [end, setEnd] = useState("This month");
  const [note, setNote] = useState("");

  const rc = f
    ? ([...new Set([f.current_crop, ...liveMyEntries(user.id).map((e) => topOf(e)?.crop), ...CROP_IDS].filter(Boolean) as string[])])
    : [];

  const mine = db.outcomes.filter((o) => o.userId === user.id);

  const submit = async () => {
    if (!fid || !crop || !tag) return;
    const seasonMap: Record<string, "this_week" | "this_month" | "last_month" | "earlier"> = {
      "This week": "this_week",
      "This month": "this_month",
      "Last month": "last_month",
      Earlier: "earlier",
    };
    try {
      await addOutcome({
        fieldId: fid,
        entryId: pre?.id,
        crop,
        result: tag,
        seasonEnd: seasonMap[end] ?? "this_month",
        note,
      });
      haptic("ok");
      toast("Outcome logged — thank you!", { icon: "Flag" });
      setTag(null);
      setNote("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not log the outcome", {
        icon: "Warning",
        tone: "heat",
      });
    }
  };

  return (
    <ToolPage
      title="Outcome log"
      sub="Tell us how the season went. Your report helps us review the model later. It does not change today's results."
    >
      <div className="col g6 cap68">
        <div>
          <div className="label">Field</div>
          <div className="tag-row mt2">
            {fl.map((x) => (
              <Chip
                key={x.id}
                sm
                on={x.id === fid}
                onClick={() => {
                  setF(x.id);
                  setCrop(x.current_crop);
                }}
              >
                {x.name}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="label">What did you plant?</div>
          <div className="tag-row mt2">
            {rc.map((c) => (
              <Chip key={c} on={c === crop} onClick={() => setCrop(c)}>
                <CropIcon id={c} s={18} bare />
                {CROPS[c].name}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="label">How did it go?</div>
          <div className="tag-row mt2">
            {(
              [
                ["good", "Good yield", "Plant"],
                ["average", "Average", "Leaf"],
                ["poor", "Poor", "Warning"],
                ["failed", "Failed", "WarningOctagon"],
              ] as [string, string, string][]
            ).map(([k, l, ic]) => (
              <Chip key={k} on={tag === k} icon={ic} onClick={() => setTag(k)}>
                {l}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="label">Season ended</div>
          <div className="tag-row mt2">
            {["This week", "This month", "Last month", "Earlier"].map((l) => (
              <Chip key={l} sm on={end === l} onClick={() => setEnd(l)}>
                {l}
              </Chip>
            ))}
          </div>
        </div>

        <Field label="Note (optional)">
          <textarea
            className="input"
            rows={2}
            placeholder="Anything we should know?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        <Btn sz="lg" disabled={!crop || !tag || !fid} icon="Flag" onClick={submit}>
          Log outcome
        </Btn>

        {mine.length > 0 && (
          <div>
            <SecHead label="Your outcomes" />
            {mine.slice(0, 6).map((o) => (
              <div className="rowitem" key={o.id} style={{ cursor: "default" }}>
                <CropIcon id={o.crop} s={38} />
                <div className="grow">
                  <div className="title-sm">
                    {CROPS[o.crop].name} · {o.result}
                  </div>
                  <div className="caption">
                    {o.fieldId ? liveField(o.fieldId)?.name ?? "Field" : "Field"} · {o.seasonEnd}
                  </div>
                </div>
                <Badge tone="heat" icon="Hourglass">
                  Submitted
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolPage>
  );
}




