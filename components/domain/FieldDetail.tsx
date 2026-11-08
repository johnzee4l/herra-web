"use client";

/* Field detail (blueprint 7.1). Latest result, health timeline, outcomes,
   boundary map, and the field's own stats. */

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/ui/Ic";
import { CropIcon } from "@/components/ui/CropIcon";
import {
  Badge,
  BlurFade,
  Btn,
  Empty,
  Ring,
  SecHead,
  StatRow,
} from "@/components/ui/primitives";
import { useConfirm } from "@/components/ui/overlays";
import { Page } from "@/components/shell/Page";
import { useApp } from "@/lib/state";
import { t } from "@/lib/i18n/en";
import { fA, fCoord, fDT, fDay, fL } from "@/lib/units/format";
import { fnum } from "@/lib/utils";
import { RELI, bandColor } from "@/lib/codes";
import { CROPS } from "@/lib/spec/crops";
import { getSpace, topOf } from "@/lib/fixtures";
import {
  archiveField,
  liveEntriesOfField,
  liveField,
  liveOutcomesOfField,
  unarchiveField,
  updateField,
} from "@/lib/store";
import { useDb } from "@/lib/useDb";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => <div className="skel" style={{ height: 280, borderRadius: 20 }} />,
});

export function FieldDetail({ id }: { id: string }) {
  const { bp, settings, toast, openSheet } = useApp();
  const router = useRouter();
  const confirm = useConfirm();
  useDb();

  const f = liveField(id);
  const ph = bp !== "xs" && bp !== "sm";

  if (!f || f.archived) {
    return (
      <Page title="Field" backTo="/farmer/fields">
        <Empty
          icon="Polygon"
          title="Field not found"
          action="Back to fields"
          onAction={() => router.push("/farmer/fields")}
        />
      </Page>
    );
  }

  const ents = liveEntriesOfField(id).filter((e) => e.result && e.status !== "failed");
  const le = ents[0];
  const outs = liveOutcomesOfField(id);
  const sp = getSpace(f.spaceId);

  const delF = () =>
    confirm({
      title: "Archive this field?",
      body: "Its entries stay in your history. You can restore it from settings later.",
      confirm: "Archive field",
      onOk: () => {
        archiveField(f.id);
        router.push("/farmer/fields");
        toast("Field archived", {
          icon: "Archive",
          tone: "heat",
          action: "Undo",
          onAction: () => {
            void unarchiveField(f.id);
          },
        });
      },
    });

  return (
    <Page title={f.name} backTo="/farmer/fields" wide>
      <div
        className="thumb mt2"
        style={{ aspectRatio: ph ? "21/8" : "16/10", borderRadius: "var(--r-xl)" }}
      >
        <div className="tbg" style={{ backgroundImage: `url(${f.thumb})` }} />
        <div className="abs" style={{ left: 16, bottom: 14, zIndex: 3, color: "#fff" }}>
          <div className="display-md" style={{ fontSize: 30 }}>
            {f.name}
          </div>
          <div className="body-sm" style={{ opacity: 0.85 }}>
            {f.place.municipality} · {fA(f.area, settings)} · {sp?.name}
          </div>
        </div>
      </div>

      <div className="twocol mt6" style={{ gap: 40 }}>
        <div>
          <BlurFade>
            <SecHead label="Latest result" />
            {le ? (
              <div
                className="rowitem hv"
                onClick={() => router.push(`/farmer/entries/${le.id}`)}
              >
                {le.kind === "recommend" ? (
                  <Ring
                    id={"fd" + le.id}
                    value={topOf(le)?.match_pct ?? 0}
                    size={84}
                    stroke={8}
                    suffix="%"
                  />
                ) : (
                  <Ring
                    id={"fd" + le.id}
                    value={le.result!.health!.index}
                    size={84}
                    stroke={8}
                    color={bandColor(le.result!.health!.band)}
                  />
                )}
                <div className="grow">
                  <div className="title-md">
                    {le.kind === "recommend"
                      ? topOf(le)
                        ? CROPS[topOf(le)!.crop].name
                        : "Abstained"
                      : le.result!.health!.band}
                  </div>
                  <div className="body-sm muted">
                    {t(le.kind)} · {fDT(le.observed_at)}
                  </div>
                  <div className="mt2">
                    <Badge
                      tone={RELI[le.result!.reliability.tier].tone}
                      icon={RELI[le.result!.reliability.tier].icon}
                    >
                      {RELI[le.result!.reliability.tier].l} reliability
                    </Badge>
                  </div>
                </div>
                <Ic n="CaretRight" s={18} c="var(--subtle)" />
              </div>
            ) : (
              <Empty
                icon="Sparkle"
                title="No analysis yet"
                sub="Run one to see crops and health for this field."
                action={t("analyze")}
                onAction={() => router.push(`/farmer/analyze?field=${id}`)}
              />
            )}
          </BlurFade>

          <BlurFade cls="sec">
            <SecHead label="Health timeline" right={<span className="caption">Ring per entry</span>} />
            <div className="row g4 hide-sb" style={{ overflowX: "auto", padding: "8px 2px 6px" }}>
              {ents.length ? (
                ents
                  .slice()
                  .reverse()
                  .map((e) => {
                    const v =
                      e.kind === "recommend"
                        ? topOf(e)?.match_pct ?? 0
                        : e.result!.health?.index ?? 0;
                    const col =
                      e.kind === "recommend"
                        ? "var(--primary)"
                        : bandColor(e.result!.health!.band);
                    return (
                      <button
                        key={e.id}
                        className="tl-ring"
                        onClick={() => router.push(`/farmer/entries/${e.id}`)}
                      >
                        <Ring id={"tl" + e.id} value={v} size={64} stroke={6} color={col} />
                        <span className="caption">{fDay(e.observed_at)}</span>
                        <Ic
                          n={e.kind === "recommend" ? "Sparkle" : "Heartbeat"}
                          s={13}
                          w="fill"
                          c="var(--subtle)"
                        />
                      </button>
                    );
                  })
              ) : (
                <span className="muted body-sm">Entries appear here as rings.</span>
              )}
            </div>
          </BlurFade>

          <BlurFade cls="sec">
            <SecHead
              label="Outcomes"
              right={
                <button
                  className="body-sm primary-c"
                  style={{ fontWeight: 650 }}
                  onClick={() => router.push(`/farmer/tools/outcomes?field=${id}`)}
                >
                  Log outcome
                </button>
              }
            />
            {outs.length ? (
              outs.map((o) => (
                <div className="rowitem" key={o.id} style={{ cursor: "default" }}>
                  <CropIcon id={o.crop} s={40} />
                  <div className="grow">
                    <div className="title-sm">
                      {CROPS[o.crop].name} · {o.result}
                    </div>
                    <div className="caption">Season end {o.seasonEnd}</div>
                  </div>
                  <Badge tone="heat" icon="Hourglass">
                    Submitted
                  </Badge>
                </div>
              ))
            ) : (
              <div className="muted body-sm" style={{ padding: "10px 0" }}>
                No outcomes logged for this field yet.
              </div>
            )}
          </BlurFade>
        </div>

        <div className="col g6">
          <BlurFade>
            <SecHead label="Boundary" />
            <MapView
              height={280}
              center={f.centroid}
              zoom={16}
              fields={[f]}
              bound={sp?.boundary}
              selected={f.id}
              hideLabels
              noCtl={!ph}
              fit={f.geom}
            />
          </BlurFade>

          <BlurFade>
            <div className="col">
              <StatRow label="Area" value={fnum(settings.area === "ac" ? f.area * 2.4711 : f.area, 2)} unit={settings.area === "ac" ? "ac" : "ha"} />
              <StatRow
                label="Terrain"
                value={fL(12, settings)}
                sub={`Slope 4% · centroid ${fCoord(f.centroid[0], f.centroid[1])}`}
              />
              <StatRow label="Entries" value={String(liveEntriesOfField(f.id).length)} />
            </div>
          </BlurFade>

          <BlurFade>
            <div className="col g2">
              <Btn icon="Sparkle" onClick={() => router.push(`/farmer/analyze?field=${id}`)}>
                {t("analyze")} this field
              </Btn>
              <div className="grid cols2 g2">
                <Btn
                  cls="secondary"
                  icon="PenNib"
                  onClick={() => router.push(`/farmer/fields/${id}/edit`)}
                >
                  Edit boundary
                </Btn>
                <Btn
                  cls="secondary"
                  icon="Plant"
                  onClick={() =>
                    openSheet({
                      title: "Currently planted",
                      render: (close) => (
                        <div className="cropgrid" role="radiogroup">
                          {Object.values(CROPS).map((c) => (
                            <button
                              key={c.id}
                              className={"cropcell" + (f.current_crop === c.id ? " on" : "")}
                              role="radio"
                              aria-checked={f.current_crop === c.id}
                              onClick={() => {
                                updateField(f.id, { current_crop: c.id });
                                close();
                                toast(c.name + " set as current crop", { icon: "Plant" });
                              }}
                            >
                              <CropIcon id={c.id} s={44} />
                              <span>{c.name}</span>
                            </button>
                          ))}
                        </div>
                      ),
                    })
                  }
                >
                  Current crop
                </Btn>
              </div>
              <Btn cls="destructive" icon="Archive" onClick={delF}>
                Archive field
              </Btn>
            </div>
          </BlurFade>
        </div>
      </div>
    </Page>
  );
}

