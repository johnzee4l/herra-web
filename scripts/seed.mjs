#!/usr/bin/env node
/* Seed the deployed data plane with a real cooperative, fields and the
   verified ML champion. Idempotent: rerunning updates the same rows. */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import * as turf from "@turf/turf";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Supabase service credentials are missing");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PEOPLE = [
  {
    key: "admin",
    email: env.DEMO_ADMIN_EMAIL || "admin@herra.app",
    password: env.DEMO_ADMIN_PASSWORD || "HerraAdmin-2026!",
    name: "Aileen Reyes",
    role: "admin",
  },
  {
    key: "farmer",
    email: env.DEMO_FARMER_EMAIL || "jose@herra.app",
    password: env.DEMO_FARMER_PASSWORD || "HerraFarmer-2026!",
    name: "Jose Mendoza",
    role: "farmer",
  },
  {
    key: "farmer2",
    email: env.DEMO_FARMER2_EMAIL || "maria@herra.app",
    password: env.DEMO_FARMER2_PASSWORD || "HerraFarmer2-2026!",
    name: "Maria Santos",
    role: "farmer",
  },
];

const SPACE = {
  name: "Socorro Farmers Cooperative",
  description: "Rainfed lowland and upland plots in Socorro, Oriental Mindoro.",
  place: { municipality: "Socorro", province: "Oriental Mindoro", region: "MIMAROPA" },
  cropFocus: ["rice", "coconut", "maize"],
  boundary: [
    [121.32, 13.04],
    [121.38, 13.04],
    [121.38, 13.085],
    [121.32, 13.085],
    [121.32, 13.04],
  ],
};

const FIELDS = [
  {
    name: "Bangkao Paddy",
    crop: "rice",
    ring: [
      [121.34, 13.05],
      [121.3415, 13.05],
      [121.3415, 13.051],
      [121.34, 13.051],
      [121.34, 13.05],
    ],
  },
  {
    name: "Coconut Grove",
    crop: "coconut",
    ring: [
      [121.35, 13.06],
      [121.3515, 13.06],
      [121.3515, 13.061],
      [121.35, 13.061],
      [121.35, 13.06],
    ],
  },
  {
    name: "Upland Maize Plot",
    crop: "maize",
    ring: [
      [121.33, 13.07],
      [121.3315, 13.07],
      [121.3315, 13.071],
      [121.33, 13.071],
      [121.33, 13.07],
    ],
  },
];

const ACCESS_CODE = "HRA-7K2M-9QX4";
const accessPepper = env.ACCESS_CODE_PEPPER || env.HMAC_PEPPER || "";
if (!accessPepper) throw new Error("HMAC_PEPPER is required to hash access codes");

function wktPolygon(ring) {
  return `POLYGON((${ring.map(([lng, lat]) => `${lng} ${lat}`).join(", ")}))`;
}

/** Small SVG of the stored boundary, used by field cards and the report map. */
function thumbFor(ring) {
  const points = ring.slice(0, -1);
  const midLat = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const xs = points.map((p) => p[0] * kx);
  const ys = points.map((p) => -p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = 168 / Math.max(maxX - minX, maxY - minY, 1e-9);
  const ox = (200 - (maxX - minX) * scale) / 2;
  const oy = (200 - (maxY - minY) * scale) / 2;
  const path = points
    .map((_, i) => `${(ox + (xs[i] - minX) * scale).toFixed(1)},${(oy + (ys[i] - minY) * scale).toFixed(1)}`)
    .join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#17201b"/><polygon points="${path}" fill="#C6F135" fill-opacity="0.38" stroke="#C6F135" stroke-width="2" stroke-linejoin="round"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function normalizeCode(code) {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/[OU]/g, "0");
}

function hashCode(code) {
  return crypto.createHmac("sha256", accessPepper).update(normalizeCode(code)).digest("hex");
}

async function ensureUser(person) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  let user = data.users.find((row) => row.email === person.email);

  if (!user) {
    const created = await supabase.auth.admin.createUser({
      email: person.email,
      password: person.password,
      email_confirm: true,
      user_metadata: { display_name: person.name },
    });
    if (created.error) throw created.error;
    user = created.data.user;
  } else {
    const updated = await supabase.auth.admin.updateUserById(user.id, {
      password: person.password,
      email_confirm: true,
      user_metadata: { display_name: person.name },
    });
    if (updated.error) throw updated.error;
    user = updated.data.user;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      role: person.role,
      display_name: person.name,
      email: person.email,
      status: "active",
      settings: {},
    },
    { onConflict: "id" }
  );
  if (profileError) throw profileError;

  return { ...person, id: user.id };
}

async function ensureSpace() {
  const { data: existing, error } = await supabase
    .from("spaces")
    .select("id,name")
    .eq("name", SPACE.name)
    .limit(1);
  if (error) throw error;
  if (existing?.length) return existing[0];

  const { data, error: insertError } = await supabase
    .from("spaces")
    .insert({
      name: SPACE.name,
      description: SPACE.description,
      boundary: wktPolygon(SPACE.boundary),
      status: "ok",
      crop_focus: SPACE.cropFocus,
      place: SPACE.place,
    })
    .select("id,name")
    .single();
  if (insertError) throw insertError;
  return data;
}

async function ensureField(space, field, owner) {
  const { data: existing, error } = await supabase
    .from("fields")
    .select("id,name,thumb")
    .eq("space_id", space.id)
    .eq("name", field.name)
    .limit(1);
  if (error) throw error;
  if (existing?.length) {
    if (!existing[0].thumb) {
      const { error: thumbError } = await supabase
        .from("fields")
        .update({ thumb: thumbFor(field.ring) })
        .eq("id", existing[0].id);
      if (thumbError) throw thumbError;
    }
    return existing[0];
  }

  const polygon = turf.polygon([field.ring]);
  const middle = turf.centerOfMass(polygon).geometry.coordinates;
  const area = turf.area(polygon) / 10000;

  const { data, error: insertError } = await supabase
    .from("fields")
    .insert({
      space_id: space.id,
      owner_id: owner.id,
      name: field.name,
      geom: wktPolygon(field.ring),
      centroid: `POINT(${middle[0]} ${middle[1]})`,
      area_ha: Number(area.toFixed(4)),
      place: SPACE.place,
      current_crop: field.crop,
      thumb: thumbFor(field.ring),
    })
    .select("id,name")
    .single();
  if (insertError) throw insertError;
  return data;
}

async function main() {
  const people = [];
  for (const person of PEOPLE) people.push(await ensureUser(person));
  const admin = people.find((person) => person.role === "admin");
  const farmer = people.find((person) => person.key === "farmer");

  const space = await ensureSpace();
  for (const person of people) {
    const { error } = await supabase.from("space_members").upsert(
      { space_id: space.id, user_id: person.id },
      { onConflict: "space_id,user_id" }
    );
    if (error) throw error;
  }

  const fields = [];
  for (const field of FIELDS) fields.push(await ensureField(space, field, farmer));

  const { data: existingCode, error: codeLookupError } = await supabase
    .from("access_codes")
    .select("id")
    .eq("space_id", space.id)
    .eq("code_hint", ACCESS_CODE.slice(-4))
    .limit(1);
  if (codeLookupError) throw codeLookupError;

  if (existingCode?.length) {
    const { error } = await supabase
      .from("access_codes")
      .update({ code_hash: hashCode(ACCESS_CODE), revoked_at: null, max_uses: 50 })
      .eq("id", existingCode[0].id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("access_codes").insert({
      space_id: space.id,
      code_hash: hashCode(ACCESS_CODE),
      code_hint: ACCESS_CODE.slice(-4),
      max_uses: 50,
      created_by: admin.id,
    });
    if (error) throw error;
  }

  const { data: existingAnnouncement } = await supabase
    .from("announcements")
    .select("id")
    .eq("space_id", space.id)
    .eq("title", "Welcome to the 2026 wet season")
    .limit(1);
  if (!existingAnnouncement?.length) {
    const { error } = await supabase.from("announcements").insert({
      space_id: space.id,
      title: "Welcome to the 2026 wet season",
      body:
        "The cooperative map is live. Open a field to see its model assessment, " +
        "then record what you planted so the next reading is grounded in your results.",
      created_by: admin.id,
    });
    if (error) throw error;
  }

  for (const person of people) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", person.id)
      .eq("title_key", "seed.welcome")
      .limit(1);
    if (!existing?.length) {
      const { error } = await supabase.from("notifications").insert({
        user_id: person.id,
        kind: "announce",
        title_key: "seed.welcome",
        params: {
          title: "Your cooperative map is ready",
          body: "Fields now carry live model assessments and weather advisories.",
        },
        route: "/farmer/spaces",
      });
      if (error) throw error;
    }
  }

  const { data: existingAudit } = await supabase
    .from("audit_log")
    .select("id")
    .eq("action", "create_space")
    .eq("target_id", space.id)
    .limit(1);
  if (!existingAudit?.length) {
    const { error } = await supabase.from("audit_log").insert({
      actor_id: admin.id,
      action: "create_space",
      target_type: "space",
      target_id: space.id,
      meta: { name: SPACE.name, municipality: SPACE.place.municipality },
    });
    if (error) throw error;
  }

  const modelDir = path.resolve(
    root,
    "..",
    "herra-intelligence",
    "data",
    "models",
    "hi-xgb-20261107-1ea55688"
  );
  const manifest = JSON.parse(fs.readFileSync(path.join(modelDir, "manifest.json"), "utf8"));
  const report = JSON.parse(fs.readFileSync(path.join(modelDir, "report.json"), "utf8"));

  const { error: datasetError } = await supabase.from("hi_datasets").upsert(
    {
      id: manifest.dataset_id,
      manifest: JSON.parse(
        fs.readFileSync(
          path.resolve(
            root,
            "..",
            "herra-intelligence",
            "data",
            "datasets",
            manifest.dataset_id,
            "manifest.json"
          ),
          "utf8"
        )
      ),
      created_at: manifest.created_at,
    },
    { onConflict: "id" }
  );
  if (datasetError) throw datasetError;

  await supabase
    .from("hi_models")
    .update({ status: "retired" })
    .neq("id", manifest.model_id)
    .eq("status", "champion");

  const { error: modelError } = await supabase.from("hi_models").upsert(
    {
      id: manifest.model_id,
      dataset_id: manifest.dataset_id,
      status: "champion",
      gate_pass: manifest.gate_pass,
      parity_pass: manifest.parity_pass,
      gate: {
        G1: Boolean(manifest.gate?.G1?.pass),
        G2: Boolean(manifest.gate?.G2?.pass),
        G3: Boolean(manifest.gate?.G3?.pass),
        G4: Boolean(manifest.parity_pass),
      },
      metrics: manifest.metrics,
      report,
      artifact_path: `${manifest.model_id}/`,
      manifest_sha256: manifest.manifest_sha256,
      feature_schema_hash: manifest.feature_schema_hash,
      grid_hash: manifest.grid_hash,
      created_at: manifest.created_at,
    },
    { onConflict: "id" }
  );
  if (modelError) throw modelError;

  console.log(
    JSON.stringify(
      {
        users: people.map((person) => ({ email: person.email, role: person.role, id: person.id })),
        space: { id: space.id, name: space.name, fields: fields.map((field) => field.name) },
        accessCode: ACCESS_CODE,
        champion: manifest.model_id,
        assessmentRequired: true,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
