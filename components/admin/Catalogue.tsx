"use client";

/* Crop catalog and advisory. Transcribed from the mockup's CropCatalog,
   CropEditor and Advisory. Edits change readiness and health only; reference
   suitability labels come from GAEZ and are never touched here. */

import { useState } from "react";
import { CropIcon } from "@/components/ui/CropIcon";
import { Ic } from "@/components/ui/Ic";
import {
  Alert,
  Badge,
  Btn,
  Chip,
  Field,
  Meter,
  NumField,
  Ring,
  SecHead,
  Seg,
  Switch,
  Table,
} from "@/components/ui/primitives";
import { AdminPage } from "@/components/shell/AdminShell";
import { useApp } from "@/lib/state";
import { fT } from "@/lib/units/format";
import { updateAdvisoryRule, updateCropConfig, updateHealthWeights } from "@/app/actions/admin";
import { CROP_IDS } from "@/lib/spec/crops";
import {
  CATALOGUE,
  CROP_FAMILIES,
  RULES,
  WEIGHTS,
  WEIGHT_COLOR,
  WEIGHT_LABEL,
  coldLimit,
  cropConfig,
  mergeCropOverrides,
  ruleLabel,
} from "@/lib/admin";

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- crop catalog ---------- */

export function CropCatalog() {
  const { openSheet, settings } = useApp();
  const [fam, setFam] = useState("all");
  const [version, setVersion] = useState(() => CATALOGUE.version);

  const rows = CROP_IDS.filter((c) => fam === "all" || cropConfig(c).family === fam);

  return (
    <AdminPage
      title="Crop catalog"
      sub={`Crop roster and readiness thresholds · catalogue v${version}. This changes readiness and health only. Reference labels are not affected.`}
    >
      <div className="pill-tabs" style={{ marginBottom: 16 }}>
        {CROP_FAMILIES.map((f) => (
          <Chip key={f} sm on={fam === f} onClick={() => setFam(f)}>
            {cap(f)}
          </Chip>
        ))}
      </div>
      <Table
        cols={[
          {
            h: "Crop",
            r: (id: string) => (
              <div className="row g3">
                <CropIcon id={id} s={38} />
                <div>
                  <b>{cropConfig(id).name}</b>
                  <div className="caption">{cropConfig(id).family}</div>
                </div>
              </div>
            ),
          },
          {
            h: "Water need",
            r: (id: string) => <Badge tone="water">{cap(cropConfig(id).water)}</Badge>,
          },
          { h: "Heat limit", num: true, r: (id: string) => fT(cropConfig(id).heat, settings) },
          { h: "Cold limit", num: true, r: (id: string) => fT(coldLimit(id), settings) },
          { h: "Wind sensitive", r: (id: string) => (cropConfig(id).wind ? "Yes" : "No") },
          { h: "Soil pH", r: (id: string) => cropConfig(id).tol.ph.join("–") },
          { h: "Clay", r: (id: string) => cropConfig(id).tol.clay.join("–") + "%" },
          { h: "Ideal moisture", num: true, r: (id: string) => cropConfig(id).ideal.toFixed(1) },
        ]}
        rows={rows}
        onRow={(id) =>
          openSheet({
            title: "Readiness and health thresholds",
            drawer: true,
            wide: true,
            render: (close) => (
              <CropEditor id={id} close={close} onSaved={(v) => setVersion(v)} />
            ),
          })
        }
      />
    </AdminPage>
  );
}

function CropEditor({
  id,
  close,
  onSaved,
}: {
  id: string;
  close: () => void;
  onSaved: (v: number) => void;
}) {
  const { toast } = useApp();
  const c = cropConfig(id);
  const [busy, setBusy] = useState(false);
  const [d, setD] = useState({
    water: c.water,
    heat: c.heat,
    cold: coldLimit(id),
    wind: !!c.wind,
    ideal: c.ideal,
    ph: [...c.tol.ph] as [number, number],
    clay: [...c.tol.clay] as [number, number],
  });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD({ ...d, [k]: v });

  const bad = !(d.ph[0] <= d.ph[1] && d.clay[0] <= d.clay[1] && d.cold < d.heat);

  return (
    <div className="col g5">
      <div className="row g3">
        <CropIcon id={id} s={56} />
        <div>
          <div className="title-lg">{c.name}</div>
          <div className="muted">{c.family}</div>
        </div>
      </div>

      <div className="alert info">
        <Ic n="Info" w="fill" s={20} />
        <div className="body-sm">
          <b>Saves this crop's readiness and health thresholds. Reference labels are not affected.</b>
          Saving creates a new catalogue version.
        </div>
      </div>

      <Field label="Water need">
        <Seg
          block
          opts={[
            { k: "low", l: "Low" },
            { k: "moderate", l: "Moderate" },
            { k: "high", l: "High" },
          ]}
          v={d.water}
          on={(v) => set("water", v)}
        />
      </Field>

      <div className="grid cols2 g3">
        <Field label="Heat limit">
          <NumField v={d.heat} on={(v) => set("heat", v)} min={28} max={42} step={0.5} suffix="°C" />
        </Field>
        <Field label="Cold limit">
          <NumField v={d.cold} on={(v) => set("cold", v)} min={10} max={25} step={0.5} suffix="°C" />
        </Field>
      </div>

      <div className="row between">
        <span className="title-sm">Wind sensitive</span>
        <Switch on={d.wind} onChange={(v) => set("wind", v)} label="Wind sensitive" />
      </div>

      <Field label="Ideal moisture (1 to 5)">
        <NumField v={d.ideal} on={(v) => set("ideal", v)} min={1} max={5} step={0.1} />
      </Field>

      <div>
        <div className="label">Soil tolerance · pH</div>
        <div className="grid cols2 g3 mt2">
          <NumField v={d.ph[0]} on={(v) => set("ph", [v, d.ph[1]])} min={3} max={9} step={0.1} />
          <NumField v={d.ph[1]} on={(v) => set("ph", [d.ph[0], v])} min={3} max={9} step={0.1} />
        </div>
      </div>

      <div>
        <div className="label">Soil tolerance · clay %</div>
        <div className="grid cols2 g3 mt2">
          <NumField v={d.clay[0]} on={(v) => set("clay", [v, d.clay[1]])} min={0} max={90} step={1} />
          <NumField v={d.clay[1]} on={(v) => set("clay", [d.clay[0], v])} min={0} max={90} step={1} />
        </div>
      </div>

      {bad && (
        <div className="err-msg">
          <Ic n="Warning" w="fill" s={15} />
          The minimum must not exceed the maximum, and the cold limit must sit below the heat limit.
        </div>
      )}

      <Btn
        sz="lg"
        disabled={bad || busy}
        icon="Check"
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          const patch = {
            water: d.water,
            heat: d.heat,
            cold: d.cold,
            wind: d.wind ? 1 : 0,
            ideal: d.ideal,
            ph: d.ph,
            clay: d.clay,
          };
          try {
            const result = await updateCropConfig(id, patch);
            if ("error" in result) throw new Error(result.error);
            mergeCropOverrides(id, patch);
            CATALOGUE.version = result.version;
            onSaved(result.version);
            close();
            toast(`${c.name} saved as catalogue v${result.version}`, { icon: "Check" });
          } catch (error) {
            toast(error instanceof Error ? error.message : "Could not save this crop", {
              icon: "Warning",
              tone: "risk",
            });
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving..." : "Save as new version"}
      </Btn>
    </div>
  );
}

/* ---------- advisory ---------- */

export function Advisory() {
  const { toast } = useApp();
  const [rules, setRules] = useState(RULES);
  const [w, setW] = useState({ ...WEIGHTS });
  const [busy, setBusy] = useState(false);

  const tot = +Object.values(w).reduce((a, b) => a + b, 0).toFixed(2);
  const okW = Math.abs(tot - 1) < 0.005;
  const sample = [78, 64, 82, 70];
  const prev = Math.round(
    sample[0] * w.fit + sample[1] * w.water + sample[2] * w.thermal + sample[3] * w.soil
  );

  return (
    <AdminPage
      title="Advisory"
      sub="Rules that turn data into ranked tips, and the weights behind the Health Index."
    >
      <div className="twocol" style={{ gap: 48 }}>
        <div>
          <SecHead label={`Rules · ${rules.filter((r) => r.active).length} active`} />
          {rules.map((r) => (
            <div
              key={r.id}
              className="row g3"
              style={{
                padding: "12px 0",
                borderBottom: "1px solid color-mix(in oklab,var(--divider) 45%,transparent)",
              }}
            >
              <span
                className="dot"
                style={{
                  background:
                    r.severity === "risk"
                      ? "var(--risk)"
                      : r.severity === "warn"
                      ? "var(--heat)"
                      : "var(--sky)",
                }}
              />
              <div className="grow">
                <div style={{ fontWeight: 650, fontSize: 14 }}>{ruleLabel(r.desc)}</div>
                <div className="caption mono">{r.id}</div>
              </div>
              <Switch
                on={r.active}
                label={r.id}
                onChange={(v) => {
                  setRules((list) => list.map((x) => (x.id === r.id ? { ...x, active: v } : x)));
                  void updateAdvisoryRule(r.id, { active: v })
                    .then((result) => {
                      if (result.error) throw new Error(result.error);
                    })
                    .catch((error: unknown) => {
                      setRules((list) => list.map((x) => (x.id === r.id ? { ...x, active: !v } : x)));
                      toast(error instanceof Error ? error.message : "Could not update this rule", {
                        icon: "Warning",
                        tone: "risk",
                      });
                    });
                }}
              />
            </div>
          ))}
        </div>

        <div className="stick">
          <SecHead label="Health Index weights" />
          <div className="col g4">
            {Object.keys(w).map((k) => (
              <div key={k} className="col g1">
                <div className="row between">
                  <span style={{ fontWeight: 650 }}>{WEIGHT_LABEL[k]}</span>
                  <span className="mono">{w[k].toFixed(2)}</span>
                </div>
                <input
                  className="range"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={w[k]}
                  onChange={(e) => setW({ ...w, [k]: +e.target.value })}
                  style={{ accentColor: WEIGHT_COLOR[k] }}
                />
              </div>
            ))}

            <div className={"alert " + (okW ? "ok" : "warn")}>
              <Ic n={okW ? "CheckCircle" : "Warning"} w="fill" s={18} />
              <div className="body-sm">
                <b>Sum {tot.toFixed(2)}</b>
                {okW ? "Weights are valid." : "Weights must add up to 1.00."}
              </div>
            </div>

            <div className="row g4">
              <Ring id={"adv" + prev} value={prev} size={90} stroke={8} color="var(--growth)" label="Sample field" />
              <div className="body-sm muted">
                Fit 78 · Water 64 · Thermal 82 · Soil 70 → live preview with your weights.
              </div>
            </div>

            <Btn
              disabled={!okW || busy}
              icon="Check"
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                try {
                  const result = await updateHealthWeights({
                    fit: w.fit,
                    water: w.water,
                    thermal: w.thermal,
                    soil: w.soil,
                  });
                  if (result.error) throw new Error(result.error);
                  toast("Weights saved", { icon: "Check" });
                } catch (error) {
                  toast(error instanceof Error ? error.message : "Could not save weights", {
                    icon: "Warning",
                    tone: "risk",
                  });
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : "Save weights"}
            </Btn>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

