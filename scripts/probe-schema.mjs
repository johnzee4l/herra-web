/* Schema probe. Reads credentials from the sibling intelligence repo's env
   file and reports which tables exist. Never prints key material. */
import fs from "node:fs";

const envPath = "../herra-intelligence/.env";
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const url = env.SUPABASE_URL.replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY;

const tables = [
  "profiles",
  "spaces",
  "memberships",
  "access_codes",
  "join_attempts",
  "fields",
  "entries",
  "outcomes",
  "notifications",
  "announcements",
  "audit_log",
  "hi_models",
  "hi_datasets",
  "hi_config",
  "advisory_rules",
  "app_settings",
];

for (const t of tables) {
  const r = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (r.ok) {
    const j = await r.json();
    const cols = j[0] ? Object.keys(j[0]).join(",") : "(empty table)";
    console.log(`${t.padEnd(16)} OK   cols: ${cols}`);
  } else {
    const txt = (await r.text()).slice(0, 100);
    console.log(`${t.padEnd(16)} ${r.status} ${txt}`);
  }
}
