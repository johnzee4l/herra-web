"use client";

/* Entries gallery. Transcribed from the mockup: sticky filter bar, day
   groups, long-press multi-select, skeleton on first load. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import {
  BlurFade,
  Btn,
  Chip,
  Empty,
  Seg,
  Skel,
  useLoad,
} from "@/components/ui/primitives";
import { Page } from "@/components/shell/Page";
import { EntryCard } from "@/components/domain/EntryCard";
import { useApp } from "@/lib/state";
import { cx } from "@/lib/utils";
import { t } from "@/lib/i18n/en";
import { dayKey, fdate } from "@/lib/units/format";
import { CROPS } from "@/lib/spec/crops";
import { topOf } from "@/lib/fixtures";
import { liveMyEntries, liveMyFields, removeEntries, restoreEntries } from "@/lib/store";
import { useDb } from "@/lib/useDb";
import type { Entry } from "@/lib/types";

const DAY = 864e5;

type Kind = "all" | "recommend" | "checkup";

export function Entries() {
  const { bp, user, openSheet, toast } = useApp();
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("all");
  const [fF, setFF] = useState<{ field: string | null; crop: string | null }>({
    field: null,
    crop: null,
  });
  const [selMode, setSM] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const loading = useLoad("entries" + user.id, 600);
  useDb();

  const all = liveMyEntries(user.id);
  const list = all.filter(
    (e) =>
      (kind === "all" || e.kind === kind) &&
      (!fF.field || e.fieldId === fF.field) &&
      (!fF.crop || topOf(e)?.crop === fF.crop || e.currentCrop === fF.crop)
  );

  const counts = {
    all: all.length,
    recommend: all.filter((e) => e.kind === "recommend").length,
    checkup: all.filter((e) => e.kind === "checkup").length,
  };

  const groups: { k: string; ts: number; items: Entry[] }[] = [];
  list.forEach((e) => {
    const k = dayKey(e.observed_at);
    let g = groups[groups.length - 1];
    if (!g || g.k !== k) {
      g = { k, ts: e.observed_at, items: [] };
      groups.push(g);
    }
    g.items.push(e);
  });

  const toggle = (e: Entry) =>
    setSel((x) => (x.includes(e.id) ? x.filter((i) => i !== e.id) : [...x, e.id]));
  const startSel = (e: Entry) => {
    setSM(true);
    setSel([e.id]);
  };

  const dayLbl = (ts: number) =>
    dayKey(ts) === dayKey(Date.now())
      ? "Today"
      : dayKey(ts) === dayKey(Date.now() - DAY)
      ? "Yesterday"
      : fdate(ts, { weekday: "long", month: "short", day: "numeric" });

  const delSel = () => {
    const n = sel.length;
    const removed = removeEntries(sel);
    setSM(false);
    setSel([]);
    toast(`${n} entr${n > 1 ? "ies" : "y"} deleted`, {
      icon: "Trash",
      tone: "risk",
      action: "Undo",
      onAction: () => restoreEntries(removed),
    });
  };

  const filtered = !!(fF.field || fF.crop || kind !== "all");

  return (
    <Page title={t("entries")} wide>
      <BlurFade>
        <div
          className={bp === "xs" || bp === "sm" ? "display-md" : "display-lg"}
          style={{ margin: "6px 0 16px" }}
        >
          {t("entries")}
        </div>
      </BlurFade>

      <div
        style={{
          position: "sticky",
          top: 60,
          zIndex: 20,
          background: "var(--background)",
          margin: "0 -16px",
          padding: "8px 16px 10px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="row between g2">
          <Seg
            opts={[
              { k: "all" as Kind, l: t("all"), n: counts.all },
              { k: "recommend" as Kind, l: t("recommend"), i: "Sparkle" },
              { k: "checkup" as Kind, l: t("checkup"), i: "Heartbeat" },
            ]}
            v={kind}
            on={setKind}
          />
          <button
            className={cx("iconbtn bordered", (fF.field || fF.crop) && "on")}
            aria-label="Filters"
            onClick={() =>
              openSheet({
                title: "Filters",
                render: (close) => (
                  <EntryFilters fF={fF} setFF={setFF} close={close} />
                ),
              })
            }
            style={fF.field || fF.crop ? { borderColor: "var(--primary)" } : undefined}
          >
            <Ic n="Funnel" s={20} w={fF.field || fF.crop ? "fill" : "regular"} />
          </button>
        </div>

        {selMode && (
          <div className="row between mt2">
            <span className="body-sm" style={{ fontWeight: 650 }}>
              {sel.length} selected
            </span>
            <div className="row g2">
              <Btn
                cls="secondary"
                sz="sm"
                icon="ArrowsLeftRight"
                disabled={sel.length !== 2}
                onClick={() => router.push(`/farmer/tools/compare?a=${sel[0]}&b=${sel[1]}`)}
              >
                {t("compare")}
              </Btn>
              <Btn cls="destructive" sz="sm" icon="Trash" disabled={!sel.length} onClick={delSel}>
                {t("del")}
              </Btn>
              <Btn
                cls="ghost"
                sz="sm"
                onClick={() => {
                  setSM(false);
                  setSel([]);
                }}
              >
                {t("cancel")}
              </Btn>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="egrid mt4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skel key={i} w="100%" h={230} r="20px" />
          ))}
        </div>
      ) : groups.length ? (
        groups.map((g) => (
          <div key={g.k}>
            <div className="label daysep">{dayLbl(g.ts)}</div>
            <div className="egrid">
              {g.items.map((e) => (
                <EntryCard
                  key={e.id}
                  e={e}
                  selMode={selMode}
                  sel={sel.includes(e.id)}
                  onSelect={toggle}
                  onLong={selMode ? toggle : startSel}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <Empty
          icon="Images"
          title="No entries match"
          sub={
            filtered
              ? "Try clearing a filter."
              : "Every analysis you run lands here with its photo and result."
          }
          action={filtered ? "Clear filters" : "Analyze a field"}
          onAction={() => {
            if (filtered) {
              setFF({ field: null, crop: null });
              setKind("all");
            } else router.push("/farmer/analyze");
          }}
        />
      )}

      {!selMode && groups.length > 0 && (
        <div className="caption tc mt8">Long-press a card to select · hover to peek at metrics</div>
      )}
    </Page>
  );
}

function EntryFilters({
  close,
  fF,
  setFF,
}: {
  close: () => void;
  fF: { field: string | null; crop: string | null };
  setFF: (v: { field: string | null; crop: string | null }) => void;
}) {
  const { user } = useApp();
  const [l, setL] = useState(fF);
  const fields = liveMyFields(user.id);
  const crops = [
    ...new Set(
      liveMyEntries(user.id)
        .map((e) => topOf(e)?.crop || e.currentCrop)
        .filter((c): c is string => !!c)
    ),
  ];

  return (
    <div className="col g5">
      <div>
        <div className="label mb2">Field</div>
        <div className="tag-row mt2">
          {fields.map((f) => (
            <Chip
              key={f.id}
              on={l.field === f.id}
              onClick={() => setL({ ...l, field: l.field === f.id ? null : f.id })}
              icon="Polygon"
            >
              {f.name}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <div className="label">Crop</div>
        <div className="tag-row mt2">
          {crops.map((c) => (
            <Chip
              key={c}
              on={l.crop === c}
              onClick={() => setL({ ...l, crop: l.crop === c ? null : c })}
            >
              {CROPS[c]?.name}
            </Chip>
          ))}
        </div>
      </div>
      <div className="row g2">
        <Btn
          cls="secondary"
          block
          onClick={() => {
            setFF({ field: null, crop: null });
            close();
          }}
        >
          Clear
        </Btn>
        <Btn
          block
          onClick={() => {
            setFF(l);
            close();
          }}
        >
          Show results
        </Btn>
      </div>
    </div>
  );
}

