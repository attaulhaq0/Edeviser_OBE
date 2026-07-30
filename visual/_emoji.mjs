// Temp: extract distinct emoji + usage context from prototype/. Deleted after use.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const proto = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "prototype");
const files = fs.readdirSync(proto).filter((f) => f.endsWith(".html") || f.endsWith(".js") || f.endsWith(".css"));

// Emoji (Extended_Pictographic), optionally with variation selector / ZWJ sequences.
const re = /(\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*)/gu;
const map = new Map(); // glyph -> { count, files:Set, samples:[] }

for (const f of files) {
  const txt = fs.readFileSync(path.join(proto, f), "utf8");
  let m;
  while ((m = re.exec(txt))) {
    const g = m[1].replace(/\uFE0F/g, "");
    if (!map.has(g)) map.set(g, { count: 0, files: new Set(), samples: [] });
    const e = map.get(g);
    e.count++;
    e.files.add(f);
    if (e.samples.length < 2) {
      const s = Math.max(0, m.index - 24);
      const ctx = txt.slice(s, m.index + 24).replace(/\s+/g, " ").trim();
      e.samples.push(`${f}: …${ctx}…`);
    }
  }
}

const rows = [...map.entries()].sort((a, b) => b[1].count - a[1].count);
console.log("distinct emoji:", rows.length);
for (const [g, e] of rows) {
  const cp = [...g].map((c) => "U+" + c.codePointAt(0).toString(16).toUpperCase()).join(" ");
  console.log(`\n${g}  (${cp})  x${e.count}  [${[...e.files].length} files]`);
  for (const s of e.samples) console.log("   " + s.slice(0, 90));
}
