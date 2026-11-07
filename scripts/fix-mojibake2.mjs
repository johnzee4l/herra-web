// Second pass: repair lines where the lossy round-trip left leftover characters.
import { readFileSync, writeFileSync } from "node:fs";

const EDITS = {
  "components/domain/Analyze.tsx": [
    ['map \u2014" place name', "map \u2014 place name"],
    ['Skip photo \u2014" you', "Skip photo \u2014 you"],
  ],
  "components/domain/EntryCard.tsx": [['"\u2014""', '"\u2014"']],
  "components/domain/FieldCapture.tsx": [
    ['"\u2014""', '"\u2014"'],
    ['SoilGrids 0\u2014"30\u201330-30 cm', "SoilGrids 0\u201330 cm"],
    ['ERA5-Land 1991-2020\u20132020\u2014"2020', "ERA5-Land 1991\u20132020"],
  ],
  "components/domain/Spaces.tsx": [['far \u2014" ERA5', "far \u2014 ERA5"]],
  "components/domain/Tools.tsx": [
    ['"\u2014""', '"\u2014"'],
    ['logged \u2014" thank', "logged \u2014 thank"],
  ],
  "components/map/MapView.tsx": [['corners \u2014" close', "corners \u2014 close"]],
};

for (const [f, pairs] of Object.entries(EDITS)) {
  let s = readFileSync(f, "utf8");
  for (const [from, to] of pairs) {
    const n = s.split(from).length - 1;
    s = s.split(from).join(to);
    console.log(`${f}: "${from}" x${n}`);
  }
  writeFileSync(f, s, "utf8");
}
