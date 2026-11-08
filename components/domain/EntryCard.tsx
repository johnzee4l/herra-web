"use client";

/* Entry card. Transcribed from the mockup: thumbnail with kind chip, status
   badge, meta block, hover metric overlay, long-press select. */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import { CropIcon } from "@/components/ui/CropIcon";
import { Badge, haptic } from "@/components/ui/primitives";
import { cx, sum } from "@/lib/utils";
import { t } from "@/lib/i18n/en";
import { fDT, fR } from "@/lib/units/format";
import { RELI } from "@/lib/codes";
import { liveField } from "@/lib/store";
import { useApp } from "@/lib/state";
import type { Entry } from "@/lib/types";

function entrySummary(e: Entry) {
  if (!e.result) return { label: "Processing", tone: "sky" };
  if (e.result.status === "abstained")
    return { label: "Abstained", tone: "risk", crop: e.currentCrop };
  if (e.kind === "recommend") {
    const top = e.result.match?.[0];
    return {
      label: top ? "Recommended" : "No ranking",
      crop: top?.crop,
      pct: top?.match_pct,
      tone: "growth",
    };
  }
  const h = e.result.health;
  return {
    label: h?.band ?? "Check-up",
    crop: e.currentCrop,
    idx: h?.index,
    tone: "water",
  };
}

export function EntryCard({
  e,
  sel,
  selMode,
  onSelect,
  onLong,
  hideKind,
}: {
  e: Entry;
  sel?: boolean;
  selMode?: boolean;
  onSelect?: (e: Entry) => void;
  onLong?: (e: Entry) => void;
  hideKind?: boolean;
}) {
  const F = liveField(e.fieldId);
  const sm = entrySummary(e);
  const [lp, setLp] = useState(false);
  const tm = useRef<ReturnType<typeof setTimeout> | null | undefined>(undefined);
  const router = useRouter();
  const { settings } = useApp();
  const rel = e.result?.reliability;

  const spot = (ev: React.MouseEvent<HTMLDivElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    ev.currentTarget.style.setProperty("--mx", ev.clientX - r.left + "px");
    ev.currentTarget.style.setProperty("--my", ev.clientY - r.top + "px");
  };

  const start = () => {
    tm.current = setTimeout(() => {
      tm.current = null;
      haptic("ok");
      if (onLong) onLong(e);
      else {
        setLp(true);
        setTimeout(() => setLp(false), 2200);
      }
    }, 460);
  };
  const end = () => {
    if (tm.current) clearTimeout(tm.current);
  };

  const open = () => {
    if (tm.current === null) {
      tm.current = undefined;
      return;
    }
    if (selMode) {
      onSelect?.(e);
      return;
    }
    router.push(`/farmer/entries/${e.id}`);
  };

  const proc = e.status === "queued" || e.status === "processing";

  return (
    <div
      className={cx("card hov entrycard", lp && "lp", sel && "sel")}
      onMouseMove={spot}
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(ev) => ev.key === "Enter" && open()}
    >
      <div className="thumb">
        <div className="tbg" style={{ backgroundImage: `url("${e.photo.url}")` }} />
        {!hideKind && (
          <span className="kind">
            <Ic n={e.kind === "recommend" ? "Sparkle" : "Heartbeat"} w="fill" s={16} />
          </span>
        )}
        {selMode ? (
          <span className="check">
            <Ic n="Check" w="bold" s={14} />
          </span>
        ) : (
          <span className="stat">
            {e.status === "degraded" ? (
              <Badge tone="heat" icon="Warning">
                Degraded
              </Badge>
            ) : proc ? (
              <Badge tone="sky" icon="ArrowsClockwise">
                Processing
              </Badge>
            ) : e.status === "abstained" ? (
              <Badge tone="risk" icon="ShieldSlash">
                Abstained
              </Badge>
            ) : null}
          </span>
        )}
        <div className="meta">
          <div className="t">{F ? F.name : "Field"}</div>
          <div className="s">{fDT(e.observed_at)}</div>
          <div className="b">
            {sm.crop && <CropIcon id={sm.crop} s={26} />}
            <span>{sm.label}</span>
            <span className="grow" />
            {sm.pct != null ? (
              <span className="metric-sm" style={{ fontWeight: 500 }}>
                {sm.pct}%
              </span>
            ) : sm.idx != null ? (
              <span className="metric-sm" style={{ fontWeight: 500 }}>
                {sm.idx}
              </span>
            ) : null}
          </div>
        </div>
        <div className="ovl">
          <div className="m" style={{ ["--i" as string]: 0 }}>
            <span>
              <Ic n={e.kind === "recommend" ? "Sparkle" : "Heartbeat"} s={14} w="fill" />
              {e.kind === "recommend" ? "Suitability" : "Health"}
            </span>
            <b>{sm.pct != null ? sm.pct + "%" : sm.idx != null ? sm.idx : "—"}</b>
          </div>
          <div className="m" style={{ ["--i" as string]: 1 }}>
            <span>
              <Ic n="ShieldCheck" s={14} w="fill" />
              Reliability
            </span>
            <b>{rel ? RELI[rel.tier].l : "—"}</b>
          </div>
          <div className="m" style={{ ["--i" as string]: 2 }}>
            <span>
              <Ic n="Drop" s={14} w="fill" />
              Moisture
            </span>
            <b>{t("m" + e.moisture)}</b>
          </div>
          <div className="m" style={{ ["--i" as string]: 3 }}>
            <span>
              <Ic n="CloudRain" s={14} w="fill" />
              7-day rain
            </span>
            <b>{e.result?.week?.length ? fR(sum(e.result.week.map((d) => d.rain)), settings) : "—"}</b>
          </div>
        </div>
      </div>
      <div className="spot" />
      {proc && <div className="beam" />}
    </div>
  );
}

