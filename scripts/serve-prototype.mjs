// Dependency-free static file server for the `prototype/` folder.
// Used by the visual-regression harness (playwright.visual.config.ts) to serve
// the approved prototype as the pixel-parity reference. No new npm deps.
//
// Usage: node scripts/serve-prototype.mjs   (PROTOTYPE_PORT env, default 4180)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../prototype/", import.meta.url));
const PORT = Number(process.env.PROTOTYPE_PORT ?? 4180);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (urlPath === "/" || urlPath.endsWith("/")) urlPath += "roles.html";

    // Block path traversal: normalize and ensure the resolved path stays in ROOT.
    const safe = normalize(urlPath).replace(/^([.][.](\/|\\|$))+/, "");
    const filePath = join(ROOT, safe);
    if (filePath !== ROOT.slice(0, -1) && !filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const info = await stat(filePath).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404);
      res.end(`Not found: ${urlPath}`);
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end("Server error");
  }
});

server.listen(PORT, () => {
  console.log(`[serve-prototype] serving ${ROOT.split(sep).slice(-2).join(sep)} at http://localhost:${PORT}`);
});
