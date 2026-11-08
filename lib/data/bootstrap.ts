/* Server-side data bootstrap.

   One read per layout, then the client store is hydrated with exactly these
   rows. Nothing in the UI invents data: if a table is empty the screen shows
   its empty state. Service-role reads are confined to the ML registry and
   admin-only tables; a farmer's rows are always fetched through their own
   session so RLS applies. */

import { supabaseAdmin, supabaseServer } from "@/lib/supabase/client";
import {
  toAnnouncement,
  toEntry,
  toField,
  toMember,
  toNotification,
  toSpace,
  toUser,
} from "@/lib/data/mappers";
import type { CropOverrides, Dataset, Model, Rule, AuditRow, Gate } from "@/lib/admin";
import type { OutcomeRow } from "@/lib/store";
import type {
  Announcement,
  Entry,
  Field,
  Member,
  Notification,
  Space,
  User,
} from "@/lib/types";

export interface AdminBootstrap {
  models: Model[];
  datasets: Dataset[];
  rules: Rule[];
  audit: AuditRow[];
  outcomes: OutcomeRow[];
  accessCodes: Record<string, unknown>[];
  crops: Record<string, CropOverrides>;
  catalogueVersion: number;
}

export interface Bootstrap {
  user: User;
  spaces: Space[];
  fields: Field[];
  entries: Entry[];
  members: Member[];
  users: User[];
  notifications: Notification[];
  announcements: Announcement[];
  outcomes: OutcomeRow[];
  admin: AdminBootstrap | null;
}

async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  try {
    const { data } = await supabaseAdmin().storage.from("field-photos").createSignedUrls(paths, 3600);
    const out: Record<string, string> = {};
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
    }
    return out;
  } catch {
    return {};
  }
}

export function outcomeFromRow(row: Record<string, any>): OutcomeRow {
  return {
    id: String(row.id),
    fieldId: row.field_id ?? null,
    entryId: row.assessment_id ?? null,
    userId: row.user_id ?? null,
    crop: row.crop_id,
    result: row.result_tag,
    seasonEnd: row.season_end ?? null,
    note: row.note ?? null,
    reviewStatus: row.review_status,
    createdAt: Date.parse(row.created_at) || 0,
  };
}

function modelFromRow(row: Record<string, any>): Model {
  const metrics = row.metrics ?? {};
  const report = row.report ?? {};
  const gateJson = row.gate ?? {};
  const gate: Record<string, boolean> = {
    G1: Boolean(gateJson.G1),
    G2: Boolean(gateJson.G2),
    G3: Boolean(gateJson.G3),
    G4: Boolean(row.parity_pass),
  };
  const gates: Gate[] = [
    { id: "G1", label: "Dataset and splits are valid", value: gate.G1 ? "passed" : "failed", pass: gate.G1 },
    {
      id: "G2",
      label: "Training and holdout evaluation complete",
      value: gate.G2 ? "complete" : "missing",
      pass: gate.G2,
    },
    {
      id: "G3",
      label: "Macro-F1 above the crop prior by the required margin",
      value: gate.G3 ? "above prior" : "below prior",
      pass: gate.G3,
    },
    {
      id: "G4",
      label: "Artefacts reproduce the golden vectors",
      value: row.parity_pass ? "match" : "not verified",
      pass: Boolean(row.parity_pass),
    },
  ];

  return {
    id: row.id,
    name: `XGBoost ${String(row.created_at ?? "").slice(0, 10)}`,
    status: row.status,
    cm: Array.isArray(report.confusion_matrix) ? report.confusion_matrix : null,
    metrics: {
      acc: Number(metrics.test_accuracy ?? metrics.accuracy ?? 0),
      bacc: Number(metrics.test_balanced_accuracy ?? metrics.balanced_accuracy ?? 0),
      mf1: Number(metrics.test_macro_f1 ?? metrics.macro_f1 ?? 0),
      wf1: Number(metrics.test_weighted_f1 ?? metrics.weighted_f1 ?? 0),
    },
    dataset: row.dataset_id,
    validation: gate.G1 ? "passed" : "failed",
    holdout: gate.G2 ? "complete" : "missing",
    parity: row.parity_pass ? "pass" : "fail",
    feature_schema_hash: row.feature_schema_hash,
    grid_hash: row.grid_hash,
    holdout_acc: report.holdout_accuracy != null ? Number(report.holdout_accuracy) : undefined,
    fingerprint: String(row.manifest_sha256 ?? "").slice(0, 12),
    params: String(report.params ?? ""),
    trained: Date.parse(row.created_at ?? "") || 0,
    gate,
    gates,
    gate_pass: Boolean(row.gate_pass),
    parity_pass: Boolean(row.parity_pass),
    rows: Number(report.n_training_samples ?? 0) || undefined,
    locations: Number(report.n_locations ?? 0) || undefined,
  };
}

function datasetFromRow(row: Record<string, any>): Dataset {
  const m = row.manifest ?? {};
  const counts = m.counts ?? {};
  const sourceNames = m.sources ?? [];
  const sources = (Array.isArray(sourceNames) ? sourceNames : []).map((s: any) =>
    typeof s === "string"
      ? { name: s, version: "", licence: "" }
      : { name: String(s.name ?? ""), version: String(s.version ?? ""), licence: String(s.licence ?? "") }
  );
  return {
    id: row.id,
    name: row.id.replace(/^ds-/, "").replace(/-/g, " "),
    rows: Number(counts.total_samples ?? counts.rows ?? 0),
    rejected: Number(m.rejected_pct ?? 0),
    blocks: {
      train: Number(m.splits?.train ?? 0),
      val: Number(m.splits?.val ?? 0),
      test: Number(m.splits?.test ?? 0),
    },
    guard: Number(m.splits?.guard ?? 0),
    sources,
    hash: String(m.grid_hash ?? row.grid_hash ?? ""),
    created: Date.parse(row.created_at ?? "") || 0,
  };
}

async function hydrateEntries(rows: Record<string, any>[]): Promise<Entry[]> {
  const paths = rows
    .map((r) => r.photo_path)
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  const photos = await signedPhotoUrls(paths);
  return rows.map((row) =>
    toEntry({ ...row, photo_path: row.photo_path ? photos[row.photo_path] ?? null : null })
  );
}

/** hi_config.crop_overrides is { cropId: { heat, cold, ... } }; keep only the
    keys the admin console can edit so a bad row cannot leak into the table. */
function cropOverridesFromConfig(value: unknown): Record<string, CropOverrides> {
  const out: Record<string, CropOverrides> = {};
  if (!value || typeof value !== "object") return out;
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    const row = (raw ?? {}) as Record<string, unknown>;
    const o: CropOverrides = {};
    if (row.water === "low" || row.water === "moderate" || row.water === "high") {
      o.water = row.water;
    }
    if (typeof row.heat === "number") o.heat = row.heat;
    if (typeof row.cold === "number") o.cold = row.cold;
    if (typeof row.wind === "number") o.wind = row.wind;
    if (typeof row.ideal === "number") o.ideal = row.ideal;
    if (Array.isArray(row.ph) && row.ph.length === 2) {
      o.ph = [Number(row.ph[0]), Number(row.ph[1])];
    }
    if (Array.isArray(row.clay) && row.clay.length === 2) {
      o.clay = [Number(row.clay[0]), Number(row.clay[1])];
    }
    out[id] = o;
  }
  return out;
}

async function adminBlock(outcomeRows: Record<string, any>[]): Promise<AdminBootstrap> {
  try {
    const adm = supabaseAdmin();
    const [
      { data: modelRows },
      { data: datasetRows },
      { data: ruleRows },
      { data: auditRows },
      { data: codeRows },
      { data: configRows },
    ] =
      await Promise.all([
        adm.from("hi_models").select("*").order("created_at", { ascending: false }),
        adm.from("hi_datasets").select("*").order("created_at", { ascending: false }),
        adm.from("advisory_rules").select("*").order("trigger_code"),
        adm.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100),
        adm.from("access_codes").select("*").order("created_at", { ascending: false }),
        adm.from("hi_config").select("*").in("key", ["crop_overrides", "crops_version"]),
      ]);

    const config = (configRows ?? []) as { key: string; value: unknown }[];
    const savedVersion = Number(config.find((r) => r.key === "crops_version")?.value);

    return {
      models: (modelRows ?? []).map(modelFromRow),
      datasets: (datasetRows ?? []).map(datasetFromRow),
      rules: (ruleRows ?? []).map((r) => ({
        id: r.trigger_code,
        kind: r.trigger_code.replace(/^tip\./, ""),
        severity: r.severity,
        desc: r.text_key,
        active: Boolean(r.active),
      })),
      audit: (auditRows ?? []).map((a) => {
        const meta = a.meta ?? {};
        return {
          id: String(a.id),
          actor: String(a.actor_id ?? ""),
          action: a.action,
          type: a.target_type,
          target: String(a.target_id ?? ""),
          meta:
            typeof meta === "string"
              ? meta
              : Object.entries(meta)
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(" · "),
          ts: Date.parse(a.created_at) || 0,
        };
      }),
      outcomes: outcomeRows.map(outcomeFromRow),
      accessCodes: (codeRows ?? []) as Record<string, unknown>[],
      crops: cropOverridesFromConfig(config.find((r) => r.key === "crop_overrides")?.value),
      catalogueVersion: Number.isFinite(savedVersion) && savedVersion > 0 ? savedVersion : 7,
    };
  } catch {
    return {
      models: [],
      datasets: [],
      rules: [],
      audit: [],
      outcomes: outcomeRows.map(outcomeFromRow),
      accessCodes: [],
      crops: {},
      catalogueVersion: 7,
    };
  }
}

export async function loadBootstrap(userId: string, email: string): Promise<Bootstrap | null> {
  const sb = await supabaseServer();
  const { data: profile } = await sb
    .from("profiles")
    .select("id, role, display_name, settings, status, created_at, updated_at, email")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;

  const isAdmin = profile.role === "admin";
  const user = toUser({ ...profile, email: profile.email ?? email });

  let spaces: Space[] = [];
  if (isAdmin) {
    const { data } = await sb.from("spaces_geo").select("*").order("name");
    spaces = (data ?? []).map(toSpace);
  } else {
    const { data: rows } = await sb.from("space_members").select("space_id").eq("user_id", userId);
    const ids = (rows ?? []).map((r) => r.space_id);
    if (ids.length) {
      const { data } = await sb.from("spaces_geo").select("*").in("id", ids).order("name");
      spaces = (data ?? []).map(toSpace);
    }
  }

  const fieldsQuery = sb
    .from("fields_geo")
    .select("*")
    .is("archived_at", null)
    .order("created_at");
  const entriesQuery = sb
    .from("assessments")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const [{ data: fieldRows }, { data: entryRows }] = await Promise.all([
    isAdmin ? fieldsQuery : fieldsQuery.eq("owner_id", userId),
    isAdmin ? entriesQuery : entriesQuery.eq("user_id", userId),
  ]);

  const fields = (fieldRows ?? []).map(toField);
  const entries = await hydrateEntries(entryRows ?? []);

  let members: Member[] = [];
  if (spaces.length) {
    const { data } = await sb
      .from("space_members")
      .select("*")
      .in("space_id", spaces.map((s) => s.id));
    members = (data ?? []).map(toMember);
  }

  let users: User[] = [user];
  if (isAdmin) {
    const { data } = await sb.from("profiles").select("*").order("display_name");
    users = (data ?? []).map(toUser);
  } else {
    const ids = [...new Set([userId, ...members.map((m) => m.userId)])];
    if (ids.length) {
      const { data } = await sb.from("profiles").select("*").in("id", ids).order("display_name");
      if (data?.length) users = data.map(toUser);
    }
  }

  const [{ data: notificationRows }, { data: announcementRows }, { data: outcomeRows }] =
    await Promise.all([
      sb.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      spaces.length
        ? sb
            .from("announcements")
            .select("*")
            .in("space_id", spaces.map((s) => s.id))
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      isAdmin
        ? sb.from("outcomes").select("*").order("created_at", { ascending: false })
        : sb.from("outcomes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

  const admin = isAdmin ? await adminBlock((outcomeRows ?? []) as Record<string, any>[]) : null;

  return {
    user,
    spaces,
    fields,
    entries,
    members,
    users,
    notifications: (notificationRows ?? []).map(toNotification),
    announcements: (announcementRows ?? []).map(toAnnouncement),
    outcomes: (outcomeRows ?? []).map(outcomeFromRow),
    admin,
  };
}

/** Read-only bootstrap for an admin spectating a farmer. All reads use the
 *  service client because the admin legitimately has access, while the store
 *  still contains only the farmer's data. */
export async function loadSpectate(targetId: string): Promise<Bootstrap | null> {
  const adm = supabaseAdmin();
  const { data: profile } = await adm.from("profiles").select("*").eq("id", targetId).maybeSingle();
  if (!profile) return null;

  const user = toUser(profile);
  const { data: memberRows } = await adm.from("space_members").select("*").eq("user_id", targetId);
  const memberships = (memberRows ?? []).map(toMember);
  const spaceIds = memberships.map((m) => m.spaceId);

  const [{ data: spaceRows }, { data: fieldRows }, { data: entryRows }] = await Promise.all([
    spaceIds.length
      ? adm.from("spaces_geo").select("*").in("id", spaceIds).order("name")
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    adm.from("fields_geo").select("*").eq("owner_id", targetId).is("archived_at", null).order("created_at"),
    adm
      .from("assessments")
      .select("*")
      .eq("user_id", targetId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const spaces = (spaceRows ?? []).map(toSpace);
  const fields = (fieldRows ?? []).map(toField);
  const entries = await hydrateEntries((entryRows ?? []) as Record<string, any>[]);

  const { data: rosterRows } = spaceIds.length
    ? await adm.from("space_members").select("*").in("space_id", spaceIds)
    : { data: [] as Record<string, unknown>[] };
  const members = (rosterRows ?? []).map(toMember);
  const userIds = [...new Set([targetId, ...members.map((m) => m.userId)])];
  const { data: profileRows } = userIds.length
    ? await adm.from("profiles").select("*").in("id", userIds).order("display_name")
    : { data: [] as Record<string, unknown>[] };

  const [{ data: notificationRows }, { data: announcementRows }, { data: outcomeRows }] =
    await Promise.all([
      adm.from("notifications").select("*").eq("user_id", targetId).order("created_at", { ascending: false }),
      spaceIds.length
        ? adm
            .from("announcements")
            .select("*")
            .in("space_id", spaceIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      adm.from("outcomes").select("*").eq("user_id", targetId).order("created_at", { ascending: false }),
    ]);

  return {
    user,
    spaces,
    fields,
    entries,
    members,
    users: (profileRows ?? []).map(toUser),
    notifications: (notificationRows ?? []).map(toNotification),
    announcements: (announcementRows ?? []).map(toAnnouncement),
    outcomes: (outcomeRows ?? []).map(outcomeFromRow),
    admin: null,
  };
}
