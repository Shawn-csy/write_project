import { cpSync, existsSync, mkdirSync, rmSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(repositoryRoot, "apps/public");
const stageRoot = join(appRoot, ".pages-build");
const outputRoot = join(appRoot, "out");
const preview = process.argv.includes("--preview");

const origin = (name) => (process.env[name] || "").replace(/\/+$/, "");
const deployEnvironment = process.env.NEXT_PUBLIC_DEPLOY_ENV || (preview ? "development" : "production");
if (deployEnvironment !== "development" && deployEnvironment !== "production") {
  throw new Error("NEXT_PUBLIC_DEPLOY_ENV must be either development or production.");
}
if (preview !== (deployEnvironment === "development")) {
  throw new Error(`The ${preview ? "preview" : "production"} Pages build cannot use NEXT_PUBLIC_DEPLOY_ENV=${deployEnvironment}.`);
}

// Primary API: the environment's live backend, reached by the browser through its public origin.
const apiOrigin = origin("NEXT_PUBLIC_API_ORIGIN");
if (!apiOrigin) {
  throw new Error("Set NEXT_PUBLIC_API_ORIGIN to the primary API origin before building the static public site.");
}
const baseUrl = origin("NEXT_PUBLIC_BASE_URL") || (preview
  ? "https://dev-open-scripts.shawnup.com"
  : "https://open-scripts.shawnup.com");
if (preview) {
  if (new URL(apiOrigin).hostname !== "api-dev-open-scripts.shawnup.com") {
    throw new Error("The development Pages build must use https://api-dev-open-scripts.shawnup.com as its primary API.");
  }
  if (new URL(baseUrl).hostname !== "dev-open-scripts.shawnup.com") {
    throw new Error("The development Pages build must use https://dev-open-scripts.shawnup.com as its canonical base URL.");
  }
} else if (
  new URL(apiOrigin).hostname === "api-dev-open-scripts.shawnup.com" ||
  new URL(baseUrl).hostname === "dev-open-scripts.shawnup.com"
) {
  throw new Error("The production Pages build cannot use the Dev API or Dev canonical host.");
}
// Read-only fallback API (Worker + D1). Without it the site has no failover.
const fallbackApiOrigin = origin("NEXT_PUBLIC_FALLBACK_API_ORIGIN");
// Images: the local media origin first, the R2 public bucket when it is down.
const mediaOrigin = origin("NEXT_PUBLIC_MEDIA_ORIGIN") || apiOrigin;
const mediaFallbackOrigin = origin("NEXT_PUBLIC_MEDIA_FALLBACK_ORIGIN");
if (preview && !fallbackApiOrigin) {
  throw new Error("The development Pages build requires NEXT_PUBLIC_FALLBACK_API_ORIGIN for D1 failover.");
}
if (preview && !mediaFallbackOrigin) {
  throw new Error("The development Pages build requires NEXT_PUBLIC_MEDIA_FALLBACK_ORIGIN for R2 failover.");
}
// The writing studio is not in this site; "進入工作室" links to wherever it is served.
const studioOrigin = origin("NEXT_PUBLIC_STUDIO_ORIGIN");
if (preview && new URL(studioOrigin || "https://invalid.local").hostname !== "studio-dev-open-scripts.shawnup.com") {
  throw new Error("The development Pages build must link to https://studio-dev-open-scripts.shawnup.com.");
}
if (!preview && new URL(studioOrigin || "https://open-scripts.shawnup.com").hostname === "studio-dev-open-scripts.shawnup.com") {
  throw new Error("The production Pages build cannot link to the Dev Studio.");
}

const ignoredNames = new Set([
  ".git", ".next", ".vinext", ".cloudflare", ".pages-build", "node_modules", "out", "dist",
  "coverage", "tsconfig.tsbuildinfo", "worker",
]);

function copySourceTree(source, target, relativePath = "") {
  mkdirSync(target, { recursive: true });
  for (const name of readdirSync(source)) {
    const nextRelative = relativePath ? `${relativePath}/${name}` : name;
    if (ignoredNames.has(name) || (relativePath === "app" && (name === "api" || name === "media"))) continue;
    const from = join(source, name);
    const to = join(target, name);
    if (statSync(from).isDirectory()) copySourceTree(from, to, nextRelative);
    else cpSync(from, to);
  }
}

function makeRouteConfigStatic(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      makeRouteConfigStatic(path);
      continue;
    }
    if (!/\.(?:ts|tsx|mts)$/.test(name)) continue;
    const source = readFileSync(path, "utf8");
    const output = source
      .replace(/export const revalidate = process\.env\.CF_STATIC_EXPORT === "1" \? false : (?:300|3600);/g, "export const revalidate = false;")
      .replace(/export const dynamicParams = process\.env\.CF_STATIC_EXPORT !== "1";/g, "export const dynamicParams = false;")
      .replace(/export const dynamic = process\.env\.CF_STATIC_EXPORT === "1" \? "force-static" : "force-dynamic";/g, 'export const dynamic = "force-static";');
    if (output !== source) writeFileSync(path, output, "utf8");
  }
}

rmSync(stageRoot, { recursive: true, force: true });
rmSync(outputRoot, { recursive: true, force: true });
copySourceTree(appRoot, stageRoot);
makeRouteConfigStatic(join(stageRoot, "app"));

const nextBin = join(appRoot, "node_modules/next/dist/bin/next");
const result = spawnSync(process.execPath, [nextBin, "build", stageRoot, "--webpack"], {
  cwd: appRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    CF_STATIC_EXPORT: "1",
    NEXT_PUBLIC_STATIC_EXPORT: "1",
    NEXT_PUBLIC_DEPLOY_ENV: deployEnvironment,
    BACKEND_API_URL: process.env.BACKEND_API_URL || apiOrigin,
    NEXT_PUBLIC_API_ORIGIN: apiOrigin,
    NEXT_PUBLIC_FALLBACK_API_ORIGIN: fallbackApiOrigin,
    NEXT_PUBLIC_MEDIA_ORIGIN: mediaOrigin,
    NEXT_PUBLIC_MEDIA_FALLBACK_ORIGIN: mediaFallbackOrigin,
    NEXT_PUBLIC_STUDIO_ORIGIN: studioOrigin,
    NEXT_PUBLIC_BASE_URL: baseUrl,
  },
});

if (result.status !== 0) {
  throw new Error(`Next static export failed with exit code ${result.status ?? "unknown"}`);
}

const stageOutput = join(stageRoot, "out");
if (!existsSync(stageOutput)) throw new Error("Next build completed without creating its static out directory.");
cpSync(stageOutput, outputRoot, { recursive: true });

// Pages serves 404.html (with a 404 status) for every address that has no
// prebuilt page. It carries the client code that loads a work published after
// this build, so the deploy is broken without it.
if (!existsSync(join(outputRoot, "404.html"))) {
  throw new Error("The static export has no 404.html; works published after this build could not be opened.");
}

// Hashed build assets never change; everything else must be revalidated so a
// redeploy shows up at once. Redirects are deliberately not used for dynamic
// routes: Pages applies them even when a prebuilt file exists, which would hide
// the prebuilt pages.
const headers = [
  "/_next/static/*",
  "  Cache-Control: public, max-age=31536000, immutable",
  "",
];
if (preview) headers.push("/*", "  X-Robots-Tag: noindex, nofollow", "");
writeFileSync(join(outputRoot, "_headers"), headers.join("\n"), "utf8");

rmSync(stageRoot, { recursive: true, force: true });
console.log(`Static Pages output (${deployEnvironment}) is ready at ${relative(repositoryRoot, outputRoot)}.`);
