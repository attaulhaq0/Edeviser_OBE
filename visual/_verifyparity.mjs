// Temp: verify PARITY.md §C covers all screen-map ids exactly once. Deleted after use.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const map = fs.readFileSync(path.join(dir, "screen-map.ts"), "utf8");
const parity = fs.readFileSync(path.join(dir, "..", "src", "design-system", "PARITY.md"), "utf8");

const ids = [];
const reId = /id:\s*"([^"]+)",\s*prototype:/g;
let m;
while ((m = reId.exec(map))) ids.push(m[1]);

const cStart = parity.indexOf("## §C");
const cEnd = parity.indexOf("## §D");
const cSec = parity.slice(cStart, cEnd);

const missing = [];
const dup = [];
for (const id of ids) {
  // count backticked occurrences of this exact id
  const re = new RegExp("`" + id.replace(/[-]/g, "\\-") + "`", "g");
  const n = (cSec.match(re) || []).length;
  if (n === 0) missing.push(id);
  else if (n > 1) dup.push(`${id}×${n}`);
}
console.log("screen-map ids:", ids.length);
console.log("missing from §C:", missing.length ? missing.join(", ") : "none");
console.log("duplicated in §C:", dup.length ? dup.join(", ") : "none");
