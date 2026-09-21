import * as fs from "node:fs";
import * as path from "node:path";

/** Follow actual relative static imports so source invariants survive module extraction. */
export function readEdgeSourceClosure(entry: string): string {
  const seen = new Set<string>();
  const visit = (file: string): string => {
    const absolute = path.resolve(file);
    if (seen.has(absolute)) return "";
    seen.add(absolute);
    const source = fs.readFileSync(absolute, "utf8");
    const dependencies = [
      ...source.matchAll(
        /import\s+(?:type\s+)?[\s\S]*?\sfrom\s+["'](\.[^"']+)["']/g
      ),
    ];
    return [
      source,
      ...dependencies.map((match) =>
        visit(path.resolve(path.dirname(absolute), match[1]!))
      ),
    ].join("\n");
  };
  return visit(entry);
}
