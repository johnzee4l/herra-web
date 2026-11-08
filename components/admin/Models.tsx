"use client";

/* Model Lab, datasets and data health. Transcribed from the mockup's ModelLab,
   ModelDetail, PromoteSheet, DatasetSheet, Datasets and DataHealth. The
   promotion gate is evaluated from the confusion matrix, never asserted. */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ic } from "@/components/ui/Ic";
import {
  Alert,
  Badge,
  Btn,
  Dot,
  Empty,
  Field,
  Meter,
  Ring,
  SecHead,
  Table,
  useLoad,
} from "@/components/ui/primitives";
import { AdminPage } from "@/components/shell/AdminShell";
import { useApp } from "@/lib/state";
import { fnum } from "@/lib/utils";
import { fDT, fDay } from "@/lib/units/format";
import {
  CLASS_KEYS,
  DATASETS,
  FEATURES,
  GRID,
  MET_ROWS,
  MODELS,
  PROVIDERS,
  STAT_TONE,
  allGatesPass,
  champion,
  metricsOf,
  datasetById,
  fmtMetric,
  gatesOf,
  type Model,
} from "@/lib/admin";

/* ---------- model lab ---------- */

export function ModelLab() {
  const router = useRouter();
  return (
    <AdminPage
      title="Model Lab"
      sub="Training-run history from the ML registry. The serving model and its hashes are in Data health."
    >
      <Table
        cols={[
          {
            h: "Model",
            r: (m: Model) => (
              <div>
                <b>{m.name}</b>
                <div className="caption mono ellip">{m.id}</div>
              </div>
            ),
          },
          {
            h: "Status",
            r: (m: Model) => <Badge tone={STAT_TONE[m.status]}>{cap(m.status)}</Badge>,
          },
          { h: "Macro-F1", num: true, r: (m: Model) => fmtMetric(m, "mf1") },
          {
            h: "Dataset",
            r: (m: Model) => (
              <span className="mono" style={{ fontSize: 12 }}>
                {m.dataset}
              </span>
            ),
          },
          {
            h: "Gates",
            r: (m: Model) => {
              if (m.status === "champion") return <span className="caption">Serving</span>;
              const ok = allGatesPass(m);
              return <Badge tone={ok ? "growth" : "risk"}>{ok ? "G1–G4 passed" : "Gate failed"}</Badge>;
            },
          },
        ]}
        rows={MODELS}
        onRow={(m) => router.push(`/admin/models/${m.id}`)}
      />
    </AdminPage>
  );
}

export function ModelDetail({ id }: { id: string }) {
  const router = useRouter();
  const { openSheet, openDialog, toast } = useApp();
  const [events, setEvents] = useState<{ kind: string; model: string; ts: number; actor: string; reason: string }[]>([]);
  const m = MODELS.find((x) => x.id === id);

  if (!m) {
    return (
      <AdminPage title="Model not found">
        <Empty title="Unknown model" action="Model Lab" onAction={() => router.push("/admin/models")} />
      </AdminPage>
    );
  }

  const ch = champion();
  const d = metricsOf(m);
  const gates = m.status === "champion" ? null : gatesOf(m);
  const allPass = gates ? gates.every((g) => g.pass) : false;
  const ds = datasetById(m.dataset);
  const hold = m.holdout_acc ?? null;

  const promote = () =>
    openSheet({
      title: "Promotion gate",
      drawer: true,
      render: (close) => {
        const gs = gatesOf(m);
        const ok = gs.every((g) => g.pass);
        return (
          <div className="col g4">
            <div className="muted body-sm">
              Gates G1–G4 run on the held-out geographic test blocks and the holdout region.
              Promotion is refused unless all four pass.
            </div>
            {gs.map((g) => (
              <div key={g.id} className="lstat">
                <Dot s={g.pass ? "ok" : "bad"} />
                <div className="grow">
                  <div style={{ fontWeight: 650 }}>
                    {g.id} · {g.label}
                  </div>
                  <div className="caption">{g.value}</div>
                </div>
                <span className="st">
                  <Ic
                    n={g.pass ? "CheckCircle" : "XCircle"}
                    w="fill"
                    s={22}
                    c={g.pass ? "var(--growth)" : "var(--risk)"}
                  />
                </span>
              </div>
            ))}
            {ok ? (
              <Alert tone="ok" title="All gates passed">
                {m.name} can be promoted. The previous champion stays warm for rollback.
              </Alert>
            ) : (
              <Alert tone="risk" title="Gate failed">
                Promotion is blocked. Fix the failing criterion and retrain.
              </Alert>
            )}
            <PromoteForm
              disabled={!ok}
              onPromote={(reason) => {
                setEvents((e) => [
                  { kind: "promote", model: m.name, ts: Date.now(), actor: "You", reason },
                  ...e,
                ]);
                close();
                toast(`${m.name} is now the champion`, { icon: "Medal" });
              }}
            />
          </div>
        );
      },
    });

  const rollback = () =>
    openDialog({
      render: (close) => (
        <RollbackForm
          name={ch?.name ?? "the previous champion"}
          onRollback={(reason) => {
            setEvents((e) => [
              { kind: "rollback", model: ch?.name ?? "", ts: Date.now(), actor: "You", reason },
              ...e,
            ]);
            close();
            toast("Rolled back", { icon: "ArrowCounterClockwise" });
          }}
          close={close}
        />
      ),
    });

  return (
    <AdminPage
      title={m.name}
      sub={m.id}
      crumbs={[
        ["Model Lab", "/admin/models"],
        [m.name, `/admin/models/${m.id}`],
      ]}
      right={
        <>
          <Badge lg tone={STAT_TONE[m.status]}>
            {cap(m.status)}
          </Badge>
          {gates && (
            <Badge lg tone={allPass ? "growth" : "risk"}>
              {allPass ? "Gates G1–G4 passed" : "Gate failed"}
            </Badge>
          )}
          {m.status === "candidate" && (
            <Btn icon="Medal" disabled={!allPass} onClick={promote}>
              Promote…
            </Btn>
          )}
          {m.status === "champion" && ch && (
            <Btn cls="secondary" icon="ArrowCounterClockwise" onClick={rollback}>
              Roll back
            </Btn>
          )}
        </>
      }
    >
      <div className="rings" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
        <Ring
          id={"md1" + m.id}
          value={Math.round(d.acc * 100)}
          size={104}
          suffix="%"
          label="Accuracy"
          sub={ch ? "Champion " + Math.round(metricsOf(ch).acc * 100) + "%" : "No champion"}
        />
        <Ring
          id={"md2" + m.id}
          value={Math.round(d.mf1 * 100)}
          size={104}
          color="var(--sky)"
          suffix="%"
          label="Macro-F1"
          sub={m.status === "champion" ? "Serving" : m.gate_pass ? "Gate passed" : "Gate failed"}
        />
        <Ring
          id={"md4" + m.id}
          value={hold == null ? 0 : Math.round(hold * 100)}
          size={104}
          color="var(--water)"
          suffix="%"
          label="Holdout region"
          sub={hold == null ? "not reported" : "unseen region"}
        />
      </div>

      <div className="twocol mt8" style={{ gap: 40 }}>
        <div>
          <SecHead label="Against the baselines" />
          <Table
            cols={[
              { h: "Metric", r: (x: [string, string]) => x[1] },
              { h: "This model", num: true, r: (x: [string, string]) => fmtMetric(m, x[0] as never) },
              {
                h: "Champion",
                num: true,
                r: (x: [string, string]) => (ch && ch.id !== m.id ? fmtMetric(ch, x[0] as never) : "—"),
              },
            ]}
            rows={MET_ROWS as unknown as [string, string][]}
          />
          {gates && (
            <div className="mt8">
              <SecHead
                label="Gates G1–G4"
                right={<span className="caption">{allPass ? "All criteria met" : "Blocked"}</span>}
              />
              {gates.map((g) => (
                <div key={g.id} className="lstat">
                  <Dot s={g.pass ? "ok" : "bad"} />
                  <span style={{ fontWeight: 650 }}>
                    {g.id} · {g.label}
                  </span>
                  <span className="st mono">{g.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <SecHead
            label="Confusion matrix · test blocks"
            right={<span className="caption">rows true · columns predicted</span>}
          />
          <ConfusionTable cm={m.cm} />
          <div className="mt6">
            <SecHead label="By class" />
            <Table
              cols={[
                { h: "Class", r: (x) => x.k },
                { h: "Precision", num: true, r: (x) => Math.round(x.p * 100) + "%" },
                { h: "Recall", num: true, r: (x) => Math.round(x.r * 100) + "%" },
                { h: "F1", num: true, r: (x) => x.f.toFixed(2) },
                { h: "Support", num: true, r: (x) => fnum(x.s) },
              ]}
              rows={d.per}
            />
          </div>
        </div>
      </div>

      <div className="mt8">
        <SecHead label="Holdout results" right={<span className="caption">unseen region</span>} />
        <Table
          cols={[
            { h: "Scope", r: (x: [string, number]) => x[0] },
            { h: "Accuracy", num: true, r: (x: [string, number]) => (x[1] * 100).toFixed(1) + "%" },
          ]}
          rows={[
            ["Test blocks (geographic split)", d.acc],
            ...(hold == null ? [] : [["Holdout region", hold] as [string, number]]),
          ]}
        />
      </div>

      <div className="twocol mt8" style={{ gap: 40 }}>
        <div>
          <SecHead label="Feature importance" right={<span className="caption">mean |contribution|</span>} />
          {FEATURES.length ? (
            <div className="bars">
              {FEATURES.map(([k, v, l, c]) => (
                <div key={k} className="brow">
                  <span className="bl" style={{ width: 170, fontSize: 13 }}>
                    {l}
                  </span>
                  <Meter v={v} max={0.35} color={c} />
                  <span className="bv">{v.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted body-sm">No feature-importance data was published with this run.</div>
          )}
        </div>
        <div>
          <SecHead label="Champion history" />
          {events.length === 0 && <div className="muted body-sm">No promotions in this session.</div>}
          {events.map((ev, i) => (
            <div key={i} className="rowitem" style={{ cursor: "default" }}>
              <Ic
                n={ev.kind === "promote" ? "Medal" : "ArrowCounterClockwise"}
                w="duotone"
                s={22}
                c="var(--primary)"
              />
              <div className="grow">
                <div className="title-sm">
                  {ev.kind === "promote" ? "Promoted" : "Rolled back"} · {ev.model}
                </div>
                <div className="caption">
                  {fDT(ev.ts)} · {ev.actor} · {ev.reason}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt8">
        <SecHead label="Training run" />
        <div className="grid cols2 g4" style={{ fontSize: 13.5 }}>
          <div>
            <span className="label">Dataset</span>
            <div className="mono mt1" style={{ wordBreak: "break-all" }}>
              {m.dataset}
            </div>
          </div>
          <div>
            <span className="label">Feature schema</span>
            <div className="mono mt1">{m.feature_schema_hash}</div>
          </div>
          <div>
            <span className="label">Split (blocks)</span>
            <div className="mt1">
              {ds
                ? ds.blocks.train + ds.blocks.val + ds.blocks.test === 0
                  ? "not recorded"
                  : `${ds.blocks.train} / ${ds.blocks.val} / ${ds.blocks.test}`
                : "—"}
            </div>
          </div>
          <div>
            <span className="label">Guard blocks removed</span>
            <div className="mt1">{ds ? (ds.guard === 0 ? "not recorded" : ds.guard) : "—"}</div>
          </div>
          <div>
            <span className="label">Calibration</span>
            <div className="mt1">Off (default): raw probabilities</div>
          </div>
          <div>
            <span className="label">Tuning</span>
            <div className="mt1">Baseline first; tuning when beneficial</div>
          </div>
          <div>
            <span className="label">Label semantics</span>
            <div className="mt1">Reference reproduction (GAEZ)</div>
          </div>
          <div>
            <span className="label">Fingerprint</span>
            <div className="mono mt1">{m.fingerprint}</div>
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <span className="label">Parameters</span>
            <div className="mono mt1" style={{ fontSize: 12, lineHeight: 1.5 }}>
              {m.params}
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

function PromoteForm({ disabled, onPromote }: { disabled: boolean; onPromote: (why: string) => void }) {
  const [why, setWhy] = useState("");
  return (
    <>
      <Field label="Reason (required)">
        <input
          className="input"
          value={why}
          placeholder="Why this candidate should serve"
          onChange={(e) => setWhy(e.target.value)}
        />
      </Field>
      <Btn sz="lg" disabled={disabled || !why.trim()} icon="Medal" onClick={() => onPromote(why.trim())}>
        Promote to champion
      </Btn>
    </>
  );
}

function RollbackForm({
  name,
  onRollback,
  close,
}: {
  name: string;
  onRollback: (why: string) => void;
  close: () => void;
}) {
  const [why, setWhy] = useState("");
  return (
    <div className="col g4">
      <div className="title-md">Roll back to {name}?</div>
      <div className="body-sm muted">
        The previous champion is still warm. Assessments switch on the next request.
      </div>
      <Field label="Reason (required)">
        <input className="input" value={why} onChange={(e) => setWhy(e.target.value)} />
      </Field>
      <div className="row g2 end">
        <Btn cls="secondary" onClick={close}>
          Cancel
        </Btn>
        <Btn disabled={!why.trim()} icon="ArrowCounterClockwise" onClick={() => onRollback(why.trim())}>
          Roll back
        </Btn>
      </div>
    </div>
  );
}

function ConfusionTable({ cm }: { cm: number[][] | null }) {
  if (!cm) return <div className="muted body-sm">This run did not publish a confusion matrix.</div>;
  return (
    <div className="tscroll">
      <table className="table" style={{ fontSize: 12, tableLayout: "fixed", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ padding: "8px 4px" }}>True / pred.</th>
            {CLASS_KEYS.map((k) => (
              <th key={k} className="num" style={{ padding: "8px 4px" }}>
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cm.map((row, i) => {
            const tot = row.reduce((a, b) => a + b, 0);
            return (
              <tr key={i}>
                <td style={{ fontWeight: 650 }}>{CLASS_KEYS[i]}</td>
                {row.map((v, j) => (
                  <td
                    key={j}
                    className="num"
                    style={{
                      padding: "8px 4px",
                      background:
                        i === j
                          ? `color-mix(in oklab,var(--primary) ${Math.round((v / tot) * 100)}%,transparent)`
                          : "transparent",
                      fontWeight: i === j ? 700 : 500,
                    }}
                  >
                    {fnum(v)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- datasets ---------- */

export function Datasets() {
  const { openSheet } = useApp();
  return (
    <AdminPage
      title="Datasets"
      sub="Versioned training sets built from regional packs. Read-only: runs are started from the notebook pipeline."
    >
      <Table
        cols={[
          {
            h: "Dataset",
            r: (d) => (
              <div>
                <b>{d.name}</b>
                <div className="caption mono ellip">{d.id}</div>
              </div>
            ),
          },
          { h: "Rows", num: true, r: (d) => fnum(d.rows) },
          { h: "Rejected (monitored)", num: true, r: (d) => (d.rejected * 100).toFixed(1) + "%" },
          {
            h: "Train / val / test",
            r: (d) => {
              const tot = d.blocks.train + d.blocks.val + d.blocks.test;
              /* A dataset published without split counts has nothing to show; say so
                 instead of rendering NaN. */
              if (!tot) return "not recorded";
              return `${Math.round((d.blocks.train / tot) * 100)} / ${Math.round((d.blocks.val / tot) * 100)} / ${Math.round((d.blocks.test / tot) * 100)}%`;
            },
          },
          {
            h: "Sources",
            r: (d) => (
              <div className="tag-row">
                {d.sources.slice(0, 2).map((x) => (
                  <Badge key={x.name}>{x.name}</Badge>
                ))}
                {d.sources.length > 2 && <Badge cls="outline">+{d.sources.length - 2}</Badge>}
              </div>
            ),
          },
          { h: "Created", r: (d) => fDay(d.created) },
        ]}
        rows={DATASETS}
        onRow={(d) =>
          openSheet({ title: "Dataset", drawer: true, render: () => <DatasetSheet id={d.id} /> })
        }
      />
    </AdminPage>
  );
}

function DatasetSheet({ id }: { id: string }) {
  const d = DATASETS.find((x) => x.id === id)!;
  const used = MODELS.filter((m) => m.dataset === id);
  return (
    <div className="col g4">
      <div>
        <div className="title-lg">{d.name}</div>
        <div className="caption mono" style={{ wordBreak: "break-all" }}>
          {d.id}
        </div>
      </div>
      <div className="grid cols2 g3">
        <div>
          <div className="label">Rows</div>
          <div className="metric-md">{fnum(d.rows)}</div>
        </div>
        <div>
          <div className="label">Rejected (monitored)</div>
          <div className="metric-md">{(d.rejected * 100).toFixed(1)}%</div>
        </div>
      </div>
      <div>
        <div className="label">Geographic split</div>
        <div className="mt2 body-sm">
          {d.blocks.train + d.blocks.val + d.blocks.test === 0 && d.guard === 0
            ? "No split counts recorded for this dataset."
            : `${d.blocks.train} training blocks · ${d.blocks.val} validation · ${d.blocks.test} test · ${d.guard} guard blocks removed from training`}
        </div>
      </div>
      <div>
        <div className="label">Sources, versions and licences</div>
        <div className="col g1 mt2">
          {d.sources.map((x) => (
            <div key={x.name} className="lstat">
              <span className="grow" style={{ fontWeight: 600 }}>
                {x.name}
              </span>
              <span className="st caption">{x.licence}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="label">Content hash</div>
        <div className="mono mt1" style={{ wordBreak: "break-all" }}>
          {d.hash}
        </div>
      </div>
      <div>
        <div className="label">Used by</div>
        {used.length ? (
          used.map((m) => (
            <div key={m.id} className="rowitem">
              <Ic n="Cpu" w="duotone" s={22} />
              <span className="grow">{m.name}</span>
              <Badge tone={STAT_TONE[m.status]}>{cap(m.status)}</Badge>
            </div>
          ))
        ) : (
          <div className="muted body-sm">No model has been trained on this dataset yet.</div>
        )}
      </div>
    </div>
  );
}

/* ---------- data health ---------- */

export function DataHealth() {
  const { toast } = useApp();
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [checks, setChecks] = useState<Record<string, { ms: number; at: number }>>({});
  const champ = champion();
  const gridOk = champ?.grid_hash === GRID.hash;
  const schemaOk = champ?.feature_schema_hash === GRID.schema;

  const test = async (k: string) => {
    setBusy((b) => ({ ...b, [k]: true }));
    try {
      const response = await fetch("/api/health/providers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: k }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || data.detail || `HTTP ${response.status}`);
      }
      setChecks((c) => ({ ...c, [k]: { ms: data.ms, at: Date.now() } }));
      toast(`${data.label} responded in ${data.ms} ms`, { icon: "CheckCircle" });
    } catch (error) {
      toast(`${k}: ${error instanceof Error ? error.message : "probe failed"}`, {
        icon: "XCircle",
        tone: "risk",
      });
    } finally {
      setBusy((b) => ({ ...b, [k]: false }));
    }
  };

  return (
    <AdminPage
      title="Data health"
      sub="Environment Grid manifest, champion status and four live provider checks. The grid is built offline, so the app does not poll its source datasets."
    >
      <div className="twocol" style={{ gap: 40 }}>
        <div>
          <SecHead label="Environment Grid" right={<span className="caption">built {fDay(GRID.built)}</span>} />
          <div className="grid cols2 g4" style={{ fontSize: 13.5, marginBottom: 14 }}>
            <div>
              <span className="label">Cells</span>
              <div className="mt1">{GRID.cells}</div>
            </div>
            <div>
              <span className="label">Resolution</span>
              <div className="mt1">{GRID.res}</div>
            </div>
            <div>
              <span className="label">Coverage</span>
              <div className="mt1">{GRID.coverage}</div>
            </div>
            <div>
              <span className="label">Built by</span>
              <div className="mono mt1" style={{ fontSize: 12 }}>
                {GRID.run}
              </div>
            </div>
          </div>
          {GRID.sources.map(([n, v, l, d]) => (
            <div key={n} className="lstat">
              <Dot s="ok" />
              <div className="grow">
                <div style={{ fontWeight: 650 }}>{n}</div>
                <div className="caption">
                  {v} · {l} · retrieved {d}
                </div>
              </div>
            </div>
          ))}
          <div className="caption mt3 mono" style={{ wordBreak: "break-all" }}>
            grid_hash {GRID.hash}
          </div>
        </div>

        <div>
          <SecHead label="Serving model" />
          <div className="col g3">
            <div className="rowitem" style={{ cursor: "default" }}>
              <Ic n="Medal" w="duotone" s={24} c="var(--primary)" />
              <div className="grow">
                <div className="title-sm">{champ?.name ?? "No champion model"}</div>
                <div className="caption mono">{champ?.id ?? "—"}</div>
              </div>
              <Badge tone={champ ? "growth" : "risk"}>{champ ? "serving" : "missing"}</Badge>
            </div>
            <div className="grid cols2 g3" style={{ fontSize: 13.5 }}>
              <div>
                <span className="label">Macro-F1</span>
                <div className="mt1">{champ ? (champ.metrics.mf1 * 100).toFixed(1) + "%" : "—"}</div>
              </div>
              <div>
                <span className="label">Balanced accuracy</span>
                <div className="mt1">{champ ? (champ.metrics.bacc * 100).toFixed(1) + "%" : "—"}</div>
              </div>
              <div>
                <span className="label">Training rows</span>
                <div className="mt1">{champ?.rows ? fnum(champ.rows) : "—"}</div>
              </div>
              <div>
                <span className="label">Locations</span>
                <div className="mt1">{champ?.locations ? fnum(champ.locations) : "—"}</div>
              </div>
            </div>
            <div className="lstat">
              <Dot s={schemaOk ? "ok" : "bad"} />
              <span className="grow">Feature schema matches the Environment Grid</span>
              <span className="st caption">{schemaOk ? "match" : "mismatch"}</span>
            </div>
            <div className="lstat">
              <Dot s={gridOk ? "ok" : "bad"} />
              <span className="grow">Grid hash matches the champion&apos;s record</span>
              <span className="st caption">{gridOk ? "match" : "mismatch"}</span>
            </div>
            <div className="caption">
              Holdout-evaluated against GAEZ reference labels. Not validated against field outcomes.
            </div>
          </div>
        </div>
      </div>

      <div className="mt8">
        <SecHead label="Provider checks" right={<span className="caption">results saved for this session</span>} />
        {PROVIDERS.map(([k, l, sub]) => {
          const r = checks[k];
          return (
            <div key={k} className="rowitem" style={{ cursor: "default" }}>
              <Dot s={r ? "ok" : "info"} />
              <div className="grow">
                <div className="title-sm">{l}</div>
                <div className="caption">
                  {sub} · {r ? `${r.ms} ms · ${fDT(r.at)}` : "not tested yet"}
                </div>
              </div>
              <Btn cls="secondary" sz="sm" icon="Pulse" disabled={!!busy[k]} onClick={() => test(k)}>
                {busy[k] ? "Testing…" : "Test now"}
              </Btn>
            </div>
          );
        })}
      </div>
    </AdminPage>
  );
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
