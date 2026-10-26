/**
 * Minimal static server for the built V6 Trader Assistance SPA.
 *
 * Mirrors the production config declared in
 * artifacts/v6-trader-assistance/.replit-artifact/artifact.toml:
 *   serve = "static", publicDir = dist/public, "/*" -> "/index.html"
 *
 * Binds 0.0.0.0:$PORT (required by the deployment proxy).
 */
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const PORT = Number(process.env.PORT || 80);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = resolve(process.env.STATIC_DIR || join(process.cwd(), "public"));
const INDEX_FILE = join(ROOT, "index.html");

/** Optional runtime Clerk key, injected into index.html so auth works after redeploy. */
const CLERK_KEY =
  process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || "";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webmanifest": "application/manifest+json",
};

function contentType(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function readIndexHtml() {
  const { readFile } = await import("node:fs/promises");
  let html = await readFile(INDEX_FILE, "utf8");
  if (CLERK_KEY) {
    const snippet = `<script>window.__V6_CLERK_PUBLISHABLE_KEY__=${JSON.stringify(
      CLERK_KEY,
    )};</script>`;
    html = html.includes("</head>")
      ? html.replace("</head>", `${snippet}</head>`)
      : `${snippet}${html}`;
  }
  return html;
}

function sendFile(res, filePath, statusCode = 200) {
  const headers = {
    "Content-Type": contentType(filePath),
    "X-Content-Type-Options": "nosniff",
  };
  if (filePath.startsWith(join(ROOT, "assets"))) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else if (extname(filePath) === ".html") {
    headers["Cache-Control"] = "no-cache";
  } else {
    headers["Cache-Control"] = "public, max-age=3600";
  }

  res.writeHead(statusCode, headers);
  const stream = createReadStream(filePath);
  stream.on("error", () => res.end());
  stream.pipe(res);
}

async function sendIndex(res, statusCode = 200) {
  const html = await readIndexHtml();
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(html);
}

async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const safe = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(ROOT, safe);
  if (!filePath.startsWith(ROOT + sep) && filePath !== ROOT) return null;
  try {
    const info = await stat(filePath);
    if (info.isFile()) return filePath;
  } catch {
    /* not a file */
  }
  return null;
}

const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end("Method Not Allowed");
    return;
  }

  const url = req.url || "/";

  if (url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  try {
    const filePath = await resolveFile(url);
    if (filePath) {
      sendFile(res, filePath);
      return;
    }

    // Missing hashed asset: never fall back to HTML, it breaks module loading.
    const isAssetRequest =
      url.startsWith("/assets/") || Boolean(extname(url.split("?")[0]));

    if (isAssetRequest) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    // SPA rewrite: every route (/, /sign-in, /sign-up, /dashboard, ...) -> index.html
    await sendIndex(res);
  } catch (error) {
    console.error("request failed", url, error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`V6 Trader Assistance serving ${ROOT} on http://${HOST}:${PORT}`);
});
