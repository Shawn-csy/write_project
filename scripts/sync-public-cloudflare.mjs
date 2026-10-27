import { spawnSync } from "node:child_process";
import { gunzipSync, gzipSync } from "node:zlib";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(repositoryRoot, "apps/public");
const wranglerCandidates = [join(appRoot, "node_modules/.bin/wrangler"), join(repositoryRoot, "node_modules/.bin/wrangler")];
const wrangler = wranglerCandidates.find((candidate) => existsSync(candidate)) || "wrangler";
const fallbackConfig = join(appRoot, "worker/wrangler.fallback.jsonc");
const preview = process.argv.includes("--preview");
const scheduled = process.argv.includes("--scheduled");

if (!preview) {
  throw new Error("This sync command is currently scoped to the preview D1 and R2 resources; pass --preview.");
}

const trimOrigin = (value) => (value || "").replace(/\/+$/, "");
const apiOrigin = trimOrigin(process.env.PUBLIC_SYNC_API_ORIGIN || "https://open-scripts.shawnup.com");
const mediaOrigin = trimOrigin(process.env.PUBLIC_SYNC_MEDIA_ORIGIN || apiOrigin);
const r2PublicOrigin = trimOrigin(process.env.PUBLIC_SYNC_R2_PUBLIC_ORIGIN || "");
const database = process.env.PUBLIC_SYNC_D1_DATABASE || "write-project-public-preview";
const bucket = process.env.PUBLIC_SYNC_R2_BUCKET || "write-project-public-preview-media";
const maxParallel = 4;
const sqlChunkLength = 60_000; // Keep every generated D1 statement below Cloudflare's 100 KB limit.
const maxD1RowBytes = 2_000_000;

if (!apiOrigin || !mediaOrigin) throw new Error("PUBLIC_SYNC_API_ORIGIN and PUBLIC_SYNC_MEDIA_ORIGIN must be non-empty origins.");

function runWrangler(args, options = {}) {
  const result = spawnSync(wrangler, args, {
    cwd: appRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`wrangler ${args.slice(0, 3).join(" ")} failed${detail ? `:\n${detail}` : ""}`);
  }
  return result.stdout || "";
}

async function mapLimit(items, limit, callback) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await callback(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchResponse(origin, path) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) return response;
      await response.body?.cancel().catch(() => undefined);
      const error = new Error(`GET ${path} returned ${response.status}`);
      error.status = response.status;
      if (response.status < 500 || attempt === 2) throw error;
    } catch (error) {
      if (error.status && error.status < 500) throw error;
      if (attempt === 2) throw new Error(`GET ${path} failed after 3 attempts: ${error.message}`, { cause: error });
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  throw new Error(`GET ${path} failed after 3 attempts.`);
}

const snapshots = new Map();
async function fetchSnapshot(path, expected = "json") {
  if (snapshots.has(path)) return snapshots.get(path);
  const response = await fetchResponse(apiOrigin, path);
  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || (expected === "text" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8");
  const body = bytes.toString("utf8");
  if (expected === "json") {
    try {
      JSON.parse(body);
    } catch {
      throw new Error(`${path} returned invalid JSON; refusing to publish a partial snapshot.`);
    }
  }
  const snapshot = { path, body, contentType, json: expected === "json" ? JSON.parse(body) : null };
  snapshots.set(path, snapshot);
  return snapshot;
}

function requireArray(value, path) {
  if (!Array.isArray(value)) throw new Error(`${path} did not return a JSON array.`);
  return value;
}

const bundleSnapshot = await fetchSnapshot("/api/public-bundle");
const bundle = bundleSnapshot.json;
if (!bundle || typeof bundle !== "object" || !Array.isArray(bundle.scripts)) {
  throw new Error("/api/public-bundle did not include a scripts array; refusing to publish an empty snapshot.");
}

const [personasSnapshot, organizationsSnapshot] = await Promise.all([
  fetchSnapshot("/api/public-personas"),
  fetchSnapshot("/api/public-organizations"),
]);
const personas = requireArray(personasSnapshot.json, "/api/public-personas");
const organizations = requireArray(organizationsSnapshot.json, "/api/public-organizations");

await Promise.all([
  fetchSnapshot("/api/public-terms-config"),
  fetchSnapshot("/api/themes/public"),
  fetchSnapshot("/api/public-scripts"),
]);

const publicScriptList = snapshots.get("/api/public-scripts").json;
const scripts = new Map();
for (const script of [...bundle.scripts, ...requireArray(publicScriptList, "/api/public-scripts")]) {
  if (script?.id) scripts.set(String(script.id), script);
}

const detailJobs = [];
for (const id of scripts.keys()) {
  const encoded = encodeURIComponent(id);
  detailJobs.push(`/api/public-scripts/${encoded}`, `/api/public-scripts/${encoded}/raw`);
}
for (const persona of personas) {
  if (!persona?.id) continue;
  const encoded = encodeURIComponent(String(persona.id));
  detailJobs.push(`/api/public-personas/${encoded}`, `/api/public-scripts?personaId=${encoded}`);
}
for (const organization of organizations) {
  if (!organization?.id) continue;
  const encoded = encodeURIComponent(String(organization.id));
  detailJobs.push(`/api/public-organizations/${encoded}`, `/api/public-scripts?organizationId=${encoded}`);
}

await mapLimit([...new Set(detailJobs)], maxParallel, (path) => fetchSnapshot(path, path.endsWith("/raw") ? "text" : "json"));

function mediaPathFromUrl(raw, allowedOrigin) {
  try {
    const parsed = new URL(raw, allowedOrigin);
    if (parsed.origin !== new URL(allowedOrigin).origin || !parsed.pathname.startsWith("/media/")) return null;
    const key = decodeURIComponent(parsed.pathname.slice(1));
    if (!key.startsWith("media/") || key.split("/").some((segment) => segment === "..")) return null;
    return { urlPath: parsed.pathname, key };
  } catch {
    return null;
  }
}

const mediaAssets = new Map();
function collectMedia(value, target = mediaAssets) {
  if (typeof value === "string") {
    const matches = value.matchAll(/(?:(https?:\/\/[^/\s"'<>]+))?(\/media\/[^\s"'<>?#),]+)/g);
    for (const match of matches) {
      const full = match[1] ? `${match[1]}${match[2]}` : match[2];
      const asset = mediaPathFromUrl(full, mediaOrigin);
      if (asset) target.set(asset.key, asset);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMedia(item, target);
    return;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) collectMedia(nested, target);
  }
}

for (const snapshot of snapshots.values()) {
  if (snapshot.json !== null) collectMedia(snapshot.json);
  else collectMedia(snapshot.body);
}

const externalCovers = new Map();
for (const item of bundle.externalPublicScripts || []) {
  if (!item?.id || !item.coverUrl || String(item.coverUrl).startsWith("/media/")) continue;
  const id = String(item.id);
  externalCovers.set(id, {
    key: `media/external-public-scripts/${id}`,
    path: `/api/public-media/external/${encodeURIComponent(id)}`,
    external: true,
    coverUrl: String(item.coverUrl),
  });
}

const localAssets = [...mediaAssets.values()].map((asset) => ({ ...asset, external: false }));
const allAssets = [...localAssets, ...externalCovers.values()];
let syncAssets = allAssets;

if (scheduled) {
  const previousOutput = runWrangler([
    "d1", "execute", database, "--remote", "--json", "--command",
    "SELECT snapshot.path, snapshot.content_type, snapshot.body_gzip FROM public_snapshot AS snapshot JOIN public_snapshot_state AS state ON state.active_generation = snapshot.generation WHERE state.id = 1 ORDER BY snapshot.path",
    "--config", fallbackConfig,
  ]);
  const previousRows = parseD1Rows(previousOutput);
  const previousSnapshots = new Map(previousRows.map((row) => {
    const body = gunzipSync(Buffer.from(row.body_gzip || "", "base64")).toString("utf8");
    let json = null;
    if ((row.content_type || "").includes("json")) {
      try { json = JSON.parse(body); } catch { /* Treat malformed stored data as changed below. */ }
    }
    return [row.path, { body, contentType: row.content_type, json }];
  }));
  let snapshotsChanged = previousSnapshots.size !== snapshots.size;
  let publicContentChanged = previousSnapshots.size !== snapshots.size;
  const normalizeCounters = (value) => {
    if (Array.isArray(value)) return value.map(normalizeCounters);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value)
        .filter(([key]) => key !== "views" && key !== "likes")
        .map(([key, nested]) => [key, normalizeCounters(nested)]));
    }
    return value;
  };
  const normalizedBody = (body, contentType) => {
    if (!(contentType || "").includes("json")) return body;
    try { return JSON.stringify(normalizeCounters(JSON.parse(body))); } catch { return body; }
  };

  for (const snapshot of snapshots.values()) {
    const previous = previousSnapshots.get(snapshot.path);
    if (!previous) {
      snapshotsChanged = true;
      publicContentChanged = true;
      continue;
    }
    if (previous.body === snapshot.body && previous.contentType === snapshot.contentType) continue;
    snapshotsChanged = true;
    if (
      previous.contentType !== snapshot.contentType ||
      normalizedBody(previous.body, previous.contentType) !== normalizedBody(snapshot.body, snapshot.contentType)
    ) {
      publicContentChanged = true;
    }
  }

  if (!snapshotsChanged) {
    console.log("Scheduled public sync: API snapshots are unchanged; skipping D1 and R2.");
    process.exit(0);
  }

  if (!publicContentChanged) {
    syncAssets = [];
  } else if (previousSnapshots.size > 0) {
    const previousMedia = new Map();
    for (const snapshot of previousSnapshots.values()) {
      if (snapshot.json !== null) collectMedia(snapshot.json, previousMedia);
      else collectMedia(snapshot.body, previousMedia);
    }
    const previousBundle = previousSnapshots.get("/api/public-bundle")?.json;
    const previousExternalCovers = new Map(
      (previousBundle?.externalPublicScripts || [])
        .filter((item) => item?.id && item.coverUrl && !String(item.coverUrl).startsWith("/media/"))
        .map((item) => [String(item.id), String(item.coverUrl)]),
    );
    const mutableMediaFolders = ["/外部台本封面/", "/外部台本圖片/"];
    syncAssets = allAssets.filter((asset) => {
      if (asset.external) return previousExternalCovers.get(asset.key.split("/").at(-1)) !== asset.coverUrl;
      const mutableInPlace = mutableMediaFolders.some((folder) => asset.key.includes(folder));
      return !previousMedia.has(asset.key) || mutableInPlace;
    });
  }
}

const temporaryRoot = mkdtempSync(join(tmpdir(), "public-cloudflare-sync-"));

function inferImageType(path, responseType) {
  const type = (responseType || "").split(";")[0].trim().toLowerCase();
  if (type.startsWith("image/")) return type;
  const extension = path.toLowerCase().split("?")[0].split(".").pop();
  const byExtension = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    svg: "image/svg+xml",
  };
  return byExtension[extension] || "";
}

async function uploadAsset(asset, index) {
  const sourceOrigin = asset.external ? apiOrigin : mediaOrigin;
  const response = await fetchResponse(sourceOrigin, asset.path || asset.urlPath);
  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = inferImageType(asset.path || asset.urlPath, response.headers.get("content-type"));
  if (!contentType || bytes.length === 0) throw new Error(`${asset.path || asset.urlPath} is empty or not an image.`);
  const md5 = createHash("md5").update(bytes).digest("hex");
  if (r2PublicOrigin) {
    try {
      const current = await fetch(`${r2PublicOrigin}/${asset.key}`, { method: "HEAD", signal: AbortSignal.timeout(10_000) });
      if (current.ok && (current.headers.get("etag") || "").replaceAll('"', "").toLowerCase() === md5) {
        return { uploaded: false, bytes: bytes.length, external: asset.external };
      }
    } catch {
      // A public endpoint can be temporarily unavailable; uploading remains the source of truth.
    }
  }

  const filePath = join(temporaryRoot, `asset-${index}`);
  writeFileSync(filePath, bytes);
  const cacheControl = asset.external
    ? "public, max-age=300, s-maxage=3600"
    : "public, max-age=86400, s-maxage=604800";
  runWrangler([
    "r2", "object", "put", `${bucket}/${asset.key}`,
    "--remote",
    "--file", filePath,
    "--content-type", contentType,
    "--content-disposition", "inline",
    "--cache-control", cacheControl,
    "--force",
  ]);
  return { uploaded: true, bytes: bytes.length, external: asset.external };
}

async function buildSnapshotSql(generation, syncedAt) {
  const statements = [
    "DELETE FROM public_snapshot WHERE generation NOT IN (SELECT active_generation FROM public_snapshot_state WHERE id = 1);",
    "DELETE FROM public_snapshot_generation WHERE generation NOT IN (SELECT active_generation FROM public_snapshot_state WHERE id = 1);",
    `INSERT INTO public_snapshot_generation (generation, synced_at, row_count) VALUES ('${generation}', '${syncedAt}', ${snapshots.size});`,
  ];
  for (const snapshot of snapshots.values()) {
    const compressed = gzipSync(Buffer.from(snapshot.body, "utf8"));
    const encoded = compressed.toString("base64");
    if (Buffer.byteLength(encoded, "utf8") > maxD1RowBytes) {
      throw new Error(`${snapshot.path} compresses to more than D1's 2 MB row limit.`);
    }
    const path = snapshot.path.replaceAll("'", "''");
    const contentType = snapshot.contentType.replaceAll("'", "''");
    statements.push(`INSERT INTO public_snapshot (generation, path, content_type, body_gzip) VALUES ('${generation}', '${path}', '${contentType}', '');`);
    for (let offset = 0; offset < encoded.length; offset += sqlChunkLength) {
      const part = encoded.slice(offset, offset + sqlChunkLength);
      statements.push(`UPDATE public_snapshot SET body_gzip = body_gzip || '${part}' WHERE generation = '${generation}' AND path = '${path}';`);
    }
  }
  statements.push(
    `INSERT INTO public_snapshot_state (id, active_generation) SELECT 1, '${generation}' WHERE (SELECT COUNT(*) FROM public_snapshot WHERE generation = '${generation}') = ${snapshots.size} ON CONFLICT(id) DO UPDATE SET active_generation = excluded.active_generation;`,
  );
  return statements.join("\n") + "\n";
}

function parseD1Rows(output) {
  try {
    const result = JSON.parse(output);
    const entries = Array.isArray(result) ? result : [result];
    return entries.flatMap((entry) => entry.results || []);
  } catch {
    throw new Error(`Could not read Wrangler's D1 JSON response: ${output.slice(0, 800)}`);
  }
}

try {
  console.log(`Fetched ${snapshots.size} public API snapshots; found ${localAssets.length} local media files and ${externalCovers.size} remote external covers; checking ${syncAssets.length} media objects.`);

  let uploaded = 0;
  let uploadedBytes = 0;
  const mediaResults = await mapLimit(syncAssets, maxParallel, async (asset, index) => {
    try {
      const result = await uploadAsset(asset, index);
      if (result.uploaded) {
        uploaded += 1;
        uploadedBytes += result.bytes;
      }
      if ((index + 1) % 20 === 0 || index + 1 === syncAssets.length) {
        console.log(`R2 media sync: ${index + 1}/${syncAssets.length}`);
      }
      return result;
    } catch (error) {
      if (asset.external || error.status === 404) {
        console.warn(`Skipping unavailable ${asset.external ? "external cover" : "published media file"} ${asset.path || asset.urlPath}: ${error.message}`);
        return { uploaded: false, skipped: true, bytes: 0, external: asset.external };
      }
      throw error;
    }
  });
  const skippedObjects = mediaResults.filter((result) => result.skipped).length;

  const generation = `${Date.now()}-${randomUUID()}`;
  const syncedAt = new Date().toISOString();
  const sqlPath = join(temporaryRoot, "snapshot.sql");
  writeFileSync(sqlPath, await buildSnapshotSql(generation, syncedAt), "utf8");
  runWrangler(["d1", "execute", database, "--remote", "--yes", "--file", sqlPath, "--config", fallbackConfig]);

  const stateOutput = runWrangler([
    "d1", "execute", database, "--remote", "--json", "--command",
    "SELECT active_generation FROM public_snapshot_state WHERE id = 1",
    "--config", fallbackConfig,
  ]);
  const active = parseD1Rows(stateOutput)[0]?.active_generation;
  if (active !== generation) throw new Error("D1 did not activate the complete new snapshot; the previous generation remains active.");

  runWrangler([
    "d1", "execute", database, "--remote", "--yes", "--command",
    "DELETE FROM public_snapshot WHERE generation != (SELECT active_generation FROM public_snapshot_state WHERE id = 1); DELETE FROM public_snapshot_generation WHERE generation != (SELECT active_generation FROM public_snapshot_state WHERE id = 1);",
    "--config", fallbackConfig,
  ]);

  console.log(JSON.stringify({
    generation,
    syncedAt,
    apiSnapshots: snapshots.size,
    localMediaFiles: localAssets.length,
    externalCovers: externalCovers.size,
    mediaObjectsChecked: syncAssets.length,
    uploadedObjects: uploaded,
    uploadedBytes,
    skippedObjects,
    d1Database: database,
    r2Bucket: bucket,
  }, null, 2));
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
