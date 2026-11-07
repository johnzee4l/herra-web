"use client";

/* Fields: the gallery (blueprint 7.1). Transcribed from the mockup's Fields
   and FieldCard. */

import { useRouter } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import { Badge, BlurFade, Btn, Empty, Ring, Skel, useLoad } from "@/components/ui/primitives";
import { Page } from "@/components/shell/Page";
import { useApp } from "@/lib/state";
import { cx } from "@/lib/utils";
import { t } from "@/lib/i18n/en";
import { fA } from "@/lib/units/format";
import { bandColor } from "@/lib/codes";
import { CROPS } from "@/lib/spec/crops";
import { topOf } from "@/lib/fixtures";
import { liveEntriesOfField, liveLatestByField, liveMyFields } from "@/lib/store";
import { useDb } from "@/lib/useDb";
import type { Field } from "@/lib/types";

export function Fields() {
  const { bp, user, settings } = useApp();
  const router = useRouter();
  useDb();
  const fl = liveMyFields(user.id);
  const loading = useLoad("fields" + user.id, 550);
  const wide = bp !== "xs" && bp !== "sm";

  return (
    <Page
      title={t("fields")}
      wide
      right={
        <Btn sz="sm" icon="PenNib" onClick={() => router.push("/farmer/fields/new")}>
          New
        </Btn>
      }
    >
      <BlurFade>
        <div className={wide ? "display-lg" : "display-md"} style={{ margin: "6px 0 20px" }}>
          {t("fields")}
        </div>
      </BlurFade>

      {loading ? (
        <div className="fgrid">
          {[0, 1, 2].map((i) => (
            <Skel key={i} h={250} r="20px" />
          ))}
        </div>
      ) : fl.length ? (
        <div className="fgrid">
          {fl.map((f) => (
            <FieldCard
              key={f.id}
              f={f}
              settings={settings}
              onClick={() => router.push(`/farmer/fields/${f.id}`)}
            />
          ))}
        </div>
      ) : (
        <Empty
          icon="Polygon"
          title="No fields yet"
          sub="Draw your first field on the satellite map. It takes about 20 seconds."
          action={t("newfield")}
          onAction={() => router.push("/farmer/fields/new")}
        />
      )}
    </Page>
  );
}

function FieldCard({
  f,
  settings,
  onClick,
}: {
  f: Field;
  settings: ReturnType<typeof useApp>["settings"];
  onClick: () => void;
}) {
  const e = liveLatestByField(f.id);
  const ok = !!e && !!e.result && e.status !== "abstained";
  const v = ok ? (e!.kind === "recommend" ? topOf(e)?.match_pct ?? 0 : e!.result!.health?.index ?? 0) : 0;
  const col = !ok
    ? "var(--subtle)"
    : e!.kind === "checkup"
    ? bandColor(e!.result!.health!.band)
    : "var(--primary)";
  const n = liveEntriesOfField(f.id).length;

  return (
    <div className="card hov" onClick={onClick}>
      <div className="thumb" style={{ aspectRatio: "16/9" }}>
        <div className="tbg" style={{ backgroundImage: `url(${f.thumb})` }} />
        <div
          className="abs"
          style={{ right: 12, bottom: 12, zIndex: 3, background: "#000b", borderRadius: "50%", padding: 4 }}
        >
          <Ring
            id={"fc" + f.id}
            value={v}
            size={56}
            stroke={5}
            color={col}
            suffix={ok ? "%" : ""}
            center={ok ? undefined : <Ic n="Minus" s={18} c="var(--subtle)" />}
          />
        </div>
      </div>
      <div style={{ padding: "14px 16px 16px" }}>
        <div className="title-md">{f.name}</div>
        <div className="body-sm muted">
          {f.place.municipality} · {f.place.province}
        </div>
        <div className="row g2 mt3 wrap">
          <Badge>{fA(f.area, settings)}</Badge>
          {f.current_crop && <Badge tone="growth">{CROPS[f.current_crop].name}</Badge>}
          <Badge cls="outline">{n} {n === 1 ? "entry" : "entries"}</Badge>
        </div>
      </div>
      <div className="spot" />
    </div>
  );
}


