"use client";

/* Processing view (blueprint 9.2, step 7). The ring holds for at least about
   one second so the animation completes, then opens the entry. Layers read as
   pending until the response arrives, then settle from the profile's
   provenance. The view never invents progress. */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import { Btn, Dot, Empty, Ring } from "@/components/ui/primitives";
import { useApp } from "@/lib/state";
import { t } from "@/lib/i18n/en";
import { CROPS } from "@/lib/spec/crops";
import { liveEntry, liveField } from "@/lib/store";
import { useDb } from "@/lib/useDb";

const LAYERS: [string, string, string, string][] = [
  ["soil", "Mountains", "Soil & terrain", "Environment Grid"],
  ["climate", "Thermometer", "Climate", "Environment Grid"],
  ["weather", "CloudSun", "Forecast", "Open-Meteo"],
  ["input", "Drop", "Your input", "Field form"],
];

export function Processing({ id }: { id: string }) {
  const { reduced } = useApp();
  const router = useRouter();
  useDb();
  const e = liveEntry(id);
  const F = e ? liveField(e.fieldId) : undefined;
  const nav = useRef(false);
  const [hold, setHold] = useState(true);
  const [mounted, setMounted] = useState(false);

  /* The action already ran before this view mounted, so the ring is a
     presentation hold, not a fake progress bar. */
  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setHold(false), 1100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!e || hold || nav.current) return;
    nav.current = true;
    const t = setTimeout(() => router.replace(`/farmer/entries/${id}`), 260);
    return () => clearTimeout(t);
  }, [e, hold, id, router]);

  /* The store hydrates from localStorage on the client. Render the same
     neutral hold on the server and first client pass so a fresh assessment
     never flashes "Nothing processing". */
  if (!mounted) {
    return (
      <div className="focus">
        <div className="focus-body">
          <div className="focus-in">
            <div className="hero-ring proc-hero" style={{ padding: "16px 0 0" }}>
              <div className="glow" />
              <div className="orbit-stage">
                <div className="orbit-ring" />
                <div className="orbit-core">
                  <Ring
                    id="procboot"
                    value={0}
                    size={140}
                    stroke={10}
                    color="var(--primary)"
                    center={<Ic n="ArrowsClockwise" cls="sync-spin" s={34} c="var(--primary)" />}
                  />
                </div>
              </div>
            </div>
            <div className="tc mt2">
              <div className="title-lg">Reading your field</div>
              <div className="muted body-sm mt1">Loading your assessment…</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!e) {
    return (
      <div className="focus">
        <Empty
          icon="ArrowsClockwise"
          title="Nothing processing"
          action="Back home"
          onAction={() => router.push("/farmer")}
        />
      </div>
    );
  }

  const finished = !!e.result && !hold;
  const status = e.result?.status ?? "ok";

  /* Layer state from the stored data quality, never invented. */
  const layerState = (k: string): "ok" | "fallback" | "failed" | "pending" => {
    if (!e.result) return "pending";
    if (k === "input") return "ok";
    const dq = e.result.data_quality.find((d) => d.layer === k);
    if (!dq) return "failed";
    return dq.status === "ok" ? "ok" : dq.status === "failed" ? "failed" : "fallback";
  };

  const txt: Record<string, Record<string, string>> = {
    weather: {
      ok: "7-day forecast loaded · used for readiness",
      fallback: "Forecast partly available",
      failed: "Forecast unavailable · readiness omitted",
      pending: "Reading the forecast…",
    },
    climate: {
      ok: "Climate normals read from the grid",
      fallback: "Nearest grid cell used",
      failed: "No climate values for this location",
      pending: "Reading climate normals…",
    },
    soil: {
      ok: "Grid cells read for your field",
      fallback: "Only the 0–30 cm layer available",
      failed: "Grid has no cells here · coverage reduced",
      pending: "Reading soil and terrain…",
    },
    input: {
      ok: `${t("moisture")}: ${t("m" + e.moisture)}${
        e.kind === "checkup" && e.currentCrop ? " · " + CROPS[e.currentCrop].name : ""
      }`,
      pending: "Waiting for input",
    },
  };

  return (
    <div className="focus">
      <div className="focus-top">
        <button
          className="iconbtn"
          aria-label="Close"
          onClick={() => router.replace("/farmer/entries")}
        >
          <Ic n="X" s={24} />
        </button>
        <span className="caption">
          {F?.name} · {t(e.kind)}
        </span>
        <span style={{ width: 44 }} />
      </div>

      <div className="focus-body">
        <div className="focus-in">
          <div className="hero-ring proc-hero" style={{ padding: "16px 0 0" }}>
            <div className="glow" />
            <div
              className={"orbit-stage" + (reduced ? " reduced" : "")}
              style={
                finished
                  ? { transform: "scale(1.08)", transition: "transform .8s var(--spring-soft)" }
                  : undefined
              }
            >
              <div className="orbit-ring" />
              <div className="orbit-spin">
                {LAYERS.map(([k, ic], i) => {
                  const ls = layerState(k);
                  return (
                    <div
                      key={k}
                      className={
                        "orbiter " +
                        (ls === "ok" ? "ok" : ls === "fallback" ? "fb" : ls === "failed" ? "fail" : "")
                      }
                      style={{ ["--i" as string]: i }}
                    >
                      <div className="orb-ic" style={{ ["--i" as string]: i }}>
                        <Ic
                          n={ic}
                          w={ls === "pending" ? "regular" : "fill"}
                          s={24}
                          c={
                            ls === "pending"
                              ? "var(--muted)"
                              : ls === "ok"
                              ? "var(--primary-fg)"
                              : "var(--background)"
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="orbit-core">
                <Ring
                  id={"proc" + id}
                  value={finished ? 100 : 0}
                  size={140}
                  stroke={10}
                  color={status === "abstained" ? "var(--risk)" : "var(--primary)"}
                  center={
                    finished ? (
                      <Ic
                        n={status === "abstained" ? "ShieldSlash" : "Check"}
                        w="bold"
                        s={44}
                        c={status === "abstained" ? "var(--risk)" : "var(--primary)"}
                      />
                    ) : (
                      <Ic n="ArrowsClockwise" cls="sync-spin" s={34} c="var(--primary)" />
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="tc mt2">
            <div className="title-lg">
              {finished
                ? status === "abstained"
                  ? "Not enough data"
                  : "Analysis ready"
                : "Reading your field"}
            </div>
            <div className="muted body-sm mt1">
              {finished
                ? "Opening your result…"
                : "Your environmental profile is built first, then the model reads it."}
            </div>
          </div>

          <div className="mt4">
            {LAYERS.map(([k, ic, lb, src]) => {
              const ls = layerState(k);
              return (
                <div className="lstat" key={k}>
                  <Dot
                    s={ls === "ok" ? "ok" : ls === "fallback" ? "warn" : ls === "failed" ? "bad" : "info"}
                    live={ls === "pending"}
                  />
                  <Ic n={ic} w="duotone" s={22} c="var(--muted)" />
                  <div className="grow">
                    <div style={{ fontWeight: 650 }}>{lb}</div>
                    <div className="caption">{txt[k][ls] || ""}</div>
                  </div>
                  <span className="st caption">
                    {ls === "pending" ? src : ls === "ok" ? "coverage 100%" : ls === "fallback" ? "partial" : ls}
                  </span>
                </div>
              );
            })}
          </div>

          {!finished && (
            <div className="mt4">
              <Btn block cls="ghost" onClick={() => router.replace("/farmer/entries")}>
                Back to entries
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
