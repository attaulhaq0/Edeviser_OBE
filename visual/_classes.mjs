// Temp: enumerate top-level class selectors defined in prototype/shared.css. Deleted after use.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const proto = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "prototype");
const css = fs.readFileSync(path.join(proto, "shared.css"), "utf8");

// Collect class names that appear as rule selectors (start of a selector token).
const re = /\.([a-zA-Z][\w-]+)/g;
const counts = new Map();
let m;
while ((m = re.exec(css))) {
  counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
}
// Filter to likely component classes (defined, i.e. appear reasonably often) and sort.
const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
console.log("distinct classes:", rows.length, "| css KB:", (css.length / 1024).toFixed(1));
console.log(rows.map(([c, n]) => `${c}(${n})`).join("  "));
