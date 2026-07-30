// Temp verification of captured references vs screen-map — deleted after use.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(dir, "screen-map.ts"), "utf8");
const re = /id:\s*"([^"]+)",\s*prototype:/g;
const ids = [];
let m;
while ((m = re.exec(src))) ids.push(m[1]);

const viewports = ["mobile", "tablet", "laptop", "desktop"];
const refDir = path.join(dir, "references");
const all = fs.existsSync(refDir) ? fs.readdirSync(refDir).filter((f) => f.endsWith(".png")) : [];

const missing = [];
const tiny = [];
let expected = 0;
for (const id of ids) {
  for (const vp of viewports) {
    expected++;
    const f = `${id}__${vp}.png`;
    const p = path.join(refDir, f);
    if (!fs.existsSync(p)) { missing.push(f); continue; }
    const kb = fs.statSync(p).size / 1024;
    if (kb < 10) tiny.push(`${f} (${kb.toFixed(1)}KB)`);
  }
}
// Orphan references (on disk but not expected by the map)
const expectedSet = new Set(ids.flatMap((id) => viewports.map((vp) => `${id}__${vp}.png`)));
const orphans = all.filter((f) => !expectedSet.has(f));

console.log("map ids:", ids.length, "| expected refs:", expected);
console.log("png files on disk:", all.length);
console.log("missing:", missing.length ? missing.join(", ") : "none");
console.log("suspicious (<10KB):", tiny.length ? tiny.join(", ") : "none");
console.log("orphan refs (not in map):", orphans.length ? orphans.join(", ") : "none");
