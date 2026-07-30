// Temp integrity check for screen-map.ts — deleted after use.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(dir, "screen-map.ts"), "utf8");
const re = /id:\s*"([^"]+)",\s*prototype:\s*"([^"]+)"/g;
const ids = [];
const missing = [];
let m;
while ((m = re.exec(src))) {
  ids.push(m[1]);
  const proto = path.join(dir, "..", "prototype", m[2]);
  if (!fs.existsSync(proto)) missing.push(`${m[1]} -> ${m[2]}`);
}
const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
console.log("entries:", ids.length);
console.log("duplicate ids:", dupes.length ? [...new Set(dupes)].join(", ") : "none");
console.log("missing prototype files:", missing.length ? missing.join("; ") : "none");
