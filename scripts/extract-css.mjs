// Extracts the mockup stylesheet into styles/globals.css, applying the
// removals listed in web_designtokens.md section 20 (demo chrome only).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync("herra-ai-mockup.html", "utf8").split(/\r?\n/);
const line = (n) => src[n - 1]; // 1-based

// Section 20 removals: mockup-only chrome + the reduced-motion collapse
// that section 9.4 replaces.
const REMOVE = new Set([
  720, 721, // reduced-motion 0.01ms collapse (replaced by 10.9)
  763, 764, 765, 766, 767, 768, 769, 770, 771, 772, 773, 774, 775, 776, 777,
  778, 779, 780, 781, 782, 783, 784, // stage + device frames + hap keyframes
  785, 786, 787, 788, 789, 790, 791, 792, 793, // browser frame, stage fab
  805, // .phone .app:not(.bp-md) .topbar
  1170, // stage-bar media query
  1178, // .screen-d, .phone .screen
  1180, // .phone.tablet rules
  1194, // .demo-row
  1198, // .stagefab
]);

// Appendix A: Leaflet 1.9.4 + Geoman 2.17.0 CSS. The mockup inlines this
// vendor CSS, but its inlined copy of the Geoman icon data-URIs is corrupted
// (mangled SVG payloads that only a browser's error recovery tolerates).
// The pinned packages ship the same stylesheet intact, so we read it from
// node_modules and keep the herra stylesheet byte-identical below it.
const vendor = [
  "/* ===== Leaflet 1.9.4 (Appendix A) ===== */",
  readFileSync("node_modules/leaflet/dist/leaflet.css", "utf8").replace(
    /url\(images\//g,
    "url(/leaflet-images/"
  ),
  "/* ===== Leaflet-Geoman 2.17.0 (Appendix A) ===== */",
  readFileSync("node_modules/@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css", "utf8"),
];

// Herra stylesheet (mockup lines 676-1224).
const herra = [];
for (let n = 676; n <= 1224; n++) {
  if (REMOVE.has(n)) continue;
  let l = line(n);
  // Section 20: --stage token removed, body background follows --background.
  l = l.replace(/--stage:#E4E1D6;/g, "").replace(/--stage:#050605;/g, "");
  l = l.replace(/background:var\(--stage\)/g, "background:var(--background)");
  herra.push(l);
}

const header = `/* ==========================================================================
   Herra Web - global stylesheet
   Ported verbatim from herra-ai-mockup.html (web_designtokens.md R4).
   Do not convert to utility classes. Do not wrap in @layer: the mockup CSS
   is unlayered so it wins over Tailwind's layers (section 5).
   Demo chrome (stage, device frames, status bar, browser frame, haptic jolt,
   reduced-motion collapse) removed per section 20.
   ========================================================================== */

`;

mkdirSync("styles", { recursive: true });
writeFileSync(
  "styles/globals.css",
  header + vendor.join("\n") + "\n\n" + herra.join("\n") + "\n\n" +
    readFileSync("styles/overrides.css", "utf8")
);
console.log("globals.css written:", (vendor.length + herra.length), "lines");
