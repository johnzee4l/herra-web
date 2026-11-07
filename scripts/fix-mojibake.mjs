// One-off repair: restore characters destroyed by a lossy latin-1 round-trip.
// The corrupted sequences are U+FFFD followed by '?' (and one 'checking<FFFD>?<FFFD>').
import { readFileSync, writeFileSync } from "node:fs";

const FILES = [
  "components/domain/Analyze.tsx",
  "components/domain/EntryCard.tsx",
  "components/domain/FieldCapture.tsx",
  "components/domain/Spaces.tsx",
  "components/domain/Tools.tsx",
  "components/map/MapView.tsx",
];

const R = "\uFFFD";

// Order matters: most specific first.
const RULES = [
  [`checking${R}?${R}`, "checking\u2026"], // …
  [`0${R}?30 cm`, "0\u201330 cm"], // –
  [`1991${R}?2020`, "1991\u20132020"], // –
  [`${R}?C`, "\u00B0C"], // °C
  [`${R}?`, "\u2014"], // —
];

for (const f of FILES) {
  const before = readFileSync(f, "utf8");
  let s = before;
  for (const [from, to] of RULES) s = s.split(from).join(to);
  const left = (s.match(/\uFFFD/g) || []).length;
  writeFileSync(f, s, "utf8");
  console.log(`${f}: ${(before.match(/\uFFFD/g) || []).length} -> ${left}`);
}
