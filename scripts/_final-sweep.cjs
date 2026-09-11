const fs = require("fs");
const path = require("path");
function walk(d) {
  let r = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "__tests__") r.push(...walk(p));
    else if (e.name.endsWith(".tsx")) r.push(p);
  }
  return r;
}

const allFiles = walk("src");
let fixed = 0;

allFiles.forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  const orig = c;
  
  // Final sweep: any bg-{color}-50 on a line with icon/Icon/lucide or rounded
  const lines = c.split("\n");
  const newLines = lines.map(line => {
    if (!line.match(/bg-(blue|green|yellow|red|purple|indigo|pink|orange|teal|cyan|emerald|amber|lime|rose|violet|fuchsia|sky)-50/)) return line;
    if (!line.match(/icon|Icon|rounded|size-/i)) return line;
    return line.replace(/bg-(blue|green|yellow|red|purple|indigo|pink|orange|teal|cyan|emerald|amber|lime|rose|violet|fuchsia|sky)-50/g, "bg-transparent");
  });
  
  c = newLines.join("\n");
  if (c !== orig) { fs.writeFileSync(f, c); fixed++; }
});

console.log("Final sweep: " + fixed + " files fixed");
