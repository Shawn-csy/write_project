#!/usr/bin/env node
/**
 * SEO + AI contract verification script.
 *
 * Usage:
 *   BASE_URL=https://open-scripts.shawnup.com node scripts/verify-public-seo.mjs
 *
 * Optional env vars:
 *   KNOWN_SCRIPT_ID   — a public script ID with a cover image (for DB image checks)
 *   KNOWN_SCRIPT_NO_COVER_ID — a public script ID without a cover image
 *
 * Defaults to https://open-scripts.shawnup.com if BASE_URL is not set.
 */

const BASE_URL = (process.env.BASE_URL ?? "https://open-scripts.shawnup.com").replace(/\/$/, "");
const KNOWN_SCRIPT_ID = process.env.KNOWN_SCRIPT_ID ?? "";
const KNOWN_SCRIPT_NO_COVER_ID = process.env.KNOWN_SCRIPT_NO_COVER_ID ?? "";
const STALE_TITLE = "公開台本 · 免費台本線上閱讀";

let passed = 0;
let failed = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
  passed++;
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failed++;
}

const GOOGLEBOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

async function fetchText(url, { ua } = {}) {
  const headers = ua ? { "User-Agent": ua } : {};
  const res = await fetch(url, { redirect: "follow", headers });
  return { status: res.status, contentType: res.headers.get("content-type") ?? "", text: await res.text() };
}

async function fetchHead(url, { followRedirects = false } = {}) {
  const res = await fetch(url, { method: "HEAD", redirect: followRedirects ? "follow" : "manual" });
  return {
    status: res.status,
    location: res.headers.get("location") ?? "",
    contentType: res.headers.get("content-type") ?? "",
  };
}

function extractAttr(tag, attr) {
  // Attribute-order-insensitive: find attr="value" or attr='value' anywhere in tag.
  const re = new RegExp(`${attr}=["']([^"']+)["']`);
  const m = tag.match(re);
  return m ? m[1] : null;
}

function checkCanonical(text, expectedUrl) {
  // Match the full <link> tag regardless of attribute order.
  const linkTags = [...text.matchAll(/<link[^>]+>/gi)].map((m) => m[0]);
  const canonical = linkTags.find((tag) => /rel=["']canonical["']/.test(tag));
  if (!canonical) { fail("canonical link missing"); return; }
  const href = extractAttr(canonical, "href");
  href === expectedUrl ? ok(`canonical: ${href}`) : fail(`canonical mismatch: got ${href}, want ${expectedUrl}`);
}

function checkNoGalleryInSitemap(sitemapText) {
  sitemapText.includes("/gallery") ? fail("sitemap contains /gallery (redirected URL)") : ok("sitemap does not contain /gallery");
}

/** Extract og:image content value from HTML. Returns null if absent. */
function extractOgImage(html) {
  const metaTags = [...html.matchAll(/<meta[^>]+>/gi)].map((m) => m[0]);
  const ogImageTag = metaTags.find((tag) => /property=["']og:image["']/.test(tag));
  if (!ogImageTag) return null;
  return extractAttr(ogImageTag, "content");
}

/** Assert og:image is present and is an absolute URL. Returns the URL or null. */
function checkOgImageAbsolute(html, label = "") {
  const url = extractOgImage(html);
  const prefix = label ? `${label} ` : "";
  if (!url) { fail(`${prefix}og:image missing`); return null; }
  try {
    new URL(url);
    ok(`${prefix}og:image absolute: ${url}`);
    return url;
  } catch {
    fail(`${prefix}og:image not a valid absolute URL: ${url}`);
    return null;
  }
}

// ── Homepage ──────────────────────────────────────────────────────────────────
console.log(`\nChecking: ${BASE_URL}/`);
{
  const { status, text } = await fetchText(`${BASE_URL}/`);
  status === 200 ? ok("status 200") : fail(`status ${status}`);
  !text.includes(STALE_TITLE) ? ok("no stale Vite title") : fail(`stale title found: "${STALE_TITLE}"`);
  text.includes("og:title") ? ok("og:title present") : fail("og:title missing");
  checkOgImageAbsolute(text);
  text.includes('twitter:card') ? ok("twitter:card present") : fail("twitter:card missing");
  text.includes('summary_large_image') ? ok("twitter:card is summary_large_image") : fail("twitter:card is not summary_large_image");
  text.includes('application/ld+json') ? ok("JSON-LD present") : fail("JSON-LD missing");
  checkCanonical(text, `${BASE_URL}/`);
}

// ── Homepage as Googlebot ─────────────────────────────────────────────────────
console.log(`\nChecking: ${BASE_URL}/ (Googlebot UA)`);
{
  const { status, text } = await fetchText(`${BASE_URL}/`, { ua: GOOGLEBOT_UA });
  status === 200 ? ok("Googlebot status 200") : fail(`Googlebot status ${status}`);
  !text.includes(STALE_TITLE) ? ok("no stale Vite title for Googlebot") : fail(`stale title for Googlebot: "${STALE_TITLE}"`);
  text.includes("og:title") ? ok("og:title present for Googlebot") : fail("og:title missing for Googlebot");
}

// ── /gallery — retired, must return 410 (not redirect, not 200) ───────────────
console.log(`\nChecking: ${BASE_URL}/gallery`);
{
  const { status } = await fetchHead(`${BASE_URL}/gallery`);
  status === 410 ? ok(`/gallery returns 410 Gone`) : fail(`expected 410, got ${status}`);
}

// ── Unknown routes — must be real 404s, never the Vite SPA shell ──────────────
for (const route of ["/__routing-contract-probe__", "/openapi.json", "/dashboard/not-a-route"]) {
  console.log(`\nChecking unknown route: ${BASE_URL}${route}`);
  const { status, text } = await fetchText(`${BASE_URL}${route}`);
  status === 404 ? ok(`${route} returns 404`) : fail(`${route} returned ${status}`);
  !text.includes('id="root"') ? ok(`${route} does not return SPA shell`) : fail(`${route} returned SPA shell`);
}

// ── Valid route, missing entity — must be a real 404, never a soft-404 ───────
// A loading.tsx anywhere above these pages (including app/loading.tsx) flushes
// the shell with 200 before the page can call notFound(). See apps/public/app/layout.tsx.
for (const route of [
  "/read/00000000-0000-0000-0000-000000000000",
  "/author/00000000-0000-0000-0000-000000000000",
  "/org/00000000-0000-0000-0000-000000000000",
  "/tag/__no-such-tag__",
  "/series/__no-such-series__",
]) {
  console.log(`\nChecking missing entity: ${BASE_URL}${route}`);
  const { status } = await fetchText(`${BASE_URL}${route}`);
  status === 404
    ? ok(`${route} returns 404`)
    : fail(`${route} returned ${status} — soft-404, check for a reintroduced loading.tsx`);
}

// ── OG image asset (derived from homepage og:image, not hardcoded path) ───────
{
  // Re-fetch homepage HTML to extract the actual og:image URL.
  // May be /og/homepage.png or a DB-hosted URL depending on NEXT_PUBLIC_DEFAULT_OG_IMAGE_URL.
  const { text: homeHtml } = await fetchText(`${BASE_URL}/`);
  const ogImageUrl = extractOgImage(homeHtml);

  if (!ogImageUrl) {
    fail("og:image URL could not be extracted from homepage for asset check");
  } else {
    console.log(`\nChecking OG image asset: ${ogImageUrl}`);
    // followRedirects: true — DB/CDN images commonly 302/307 to the actual resource.
    const { status, contentType } = await fetchHead(ogImageUrl, { followRedirects: true });
    status === 200 ? ok(`og:image returns 200`) : fail(`og:image ${status} — asset missing or unreachable at ${ogImageUrl}`);
    contentType.startsWith("image/") ? ok(`og:image content-type: ${contentType}`) : fail(`og:image unexpected content-type: ${contentType}`);
  }
}

// ── llms.txt ──────────────────────────────────────────────────────────────────
console.log(`\nChecking: ${BASE_URL}/llms.txt`);
{
  const { status, contentType, text } = await fetchText(`${BASE_URL}/llms.txt`);
  status === 200 ? ok("status 200") : fail(`status ${status}`);
  (contentType.includes("text/markdown") || contentType.includes("text/plain")) ? ok(`content-type: ${contentType}`) : fail(`unexpected content-type: ${contentType}`);
  !text.includes("scripts.shawnup.com") ? ok("no stale scripts.shawnup.com domain") : fail("stale scripts.shawnup.com domain found");
  text.includes("/api/public-scripts/") ? ok("raw API endpoint documented") : fail("raw API endpoint missing");
}

// ── /.well-known/llms.txt ─────────────────────────────────────────────────────
console.log(`\nChecking: ${BASE_URL}/.well-known/llms.txt`);
{
  const { status } = await fetchHead(`${BASE_URL}/.well-known/llms.txt`);
  status === 200 ? ok("status 200") : fail(`status ${status}`);
}

// ── sitemap.xml ───────────────────────────────────────────────────────────────
console.log(`\nChecking: ${BASE_URL}/sitemap.xml`);
{
  const { status, contentType, text } = await fetchText(`${BASE_URL}/sitemap.xml`);
  status === 200 ? ok("status 200") : fail(`status ${status}`);
  (contentType.includes("xml")) ? ok(`content-type: ${contentType}`) : fail(`unexpected content-type: ${contentType}`);
  text.includes(`${BASE_URL}/`) ? ok("sitemap includes base URL") : fail("sitemap does not include base URL");
  text.includes("/read/") ? ok("sitemap includes /read/ entries") : fail("sitemap has no /read/ entries");
  checkNoGalleryInSitemap(text);
}

// ── /read/{id} with DB cover image ────────────────────────────────────────────
if (KNOWN_SCRIPT_ID) {
  console.log(`\nChecking: ${BASE_URL}/read/${KNOWN_SCRIPT_ID} (script with cover)`);
  const { status, text } = await fetchText(`${BASE_URL}/read/${KNOWN_SCRIPT_ID}`);
  status === 200 ? ok("status 200") : fail(`status ${status}`);
  checkCanonical(text, `${BASE_URL}/read/${KNOWN_SCRIPT_ID}`);
  checkOgImageAbsolute(text, "/read cover");
  text.includes('"image"') ? ok("JSON-LD image field present") : fail("JSON-LD image field missing");
  // JSON-LD image must be absolute — no raw /media/ paths
  const ldMatch = text.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (ldMatch) {
    try {
      const ld = JSON.parse(ldMatch[1].replace(/\\u003c/g, "<").replace(/\\u003e/g, ">").replace(/\\u0026/g, "&"));
      const ldImage = ld.image;
      if (ldImage) {
        (typeof ldImage === "string" && ldImage.startsWith("http"))
          ? ok("JSON-LD image is absolute URL")
          : fail(`JSON-LD image is not absolute: ${ldImage}`);
      }
    } catch { fail("JSON-LD parse error"); }
  }
  // SSR excerpt visible to crawlers (replaces noscript approach)
  text.includes("data-seo-excerpt") ? ok("SSR crawler excerpt present") : fail("SSR crawler excerpt missing (Googlebot sees no body content)");

  // Googlebot view
  console.log(`\nChecking: ${BASE_URL}/read/${KNOWN_SCRIPT_ID} (Googlebot UA)`);
  const gbot = await fetchText(`${BASE_URL}/read/${KNOWN_SCRIPT_ID}`, { ua: GOOGLEBOT_UA });
  gbot.status === 200 ? ok("Googlebot status 200") : fail(`Googlebot status ${gbot.status}`);
  gbot.text.includes("data-seo-excerpt") ? ok("Googlebot sees SSR excerpt") : fail("Googlebot: SSR excerpt missing");
  gbot.text.includes("og:title") ? ok("Googlebot sees og:title") : fail("Googlebot: og:title missing");

  // Verify /api/public-scripts/{id}/raw returns markdown
  console.log(`\nChecking: ${BASE_URL}/api/public-scripts/${KNOWN_SCRIPT_ID}/raw`);
  const raw = await fetchText(`${BASE_URL}/api/public-scripts/${KNOWN_SCRIPT_ID}/raw`);
  raw.status === 200 ? ok("raw endpoint status 200") : fail(`raw endpoint status ${raw.status}`);
  (raw.contentType.includes("text/markdown") || raw.contentType.includes("text/plain"))
    ? ok(`raw content-type: ${raw.contentType}`) : fail(`raw unexpected content-type: ${raw.contentType}`);
} else {
  console.log("\n(Skipping /read/{id} DB image checks — set KNOWN_SCRIPT_ID to enable)");
}

// ── /read/{id} without cover — fallback to default OG image ───────────────────
if (KNOWN_SCRIPT_NO_COVER_ID) {
  console.log(`\nChecking: ${BASE_URL}/read/${KNOWN_SCRIPT_NO_COVER_ID} (script without cover)`);
  const { status, text } = await fetchText(`${BASE_URL}/read/${KNOWN_SCRIPT_NO_COVER_ID}`);
  status === 200 ? ok("status 200") : fail(`status ${status}`);
  checkOgImageAbsolute(text, "/read no-cover fallback");
  text.includes("summary_large_image") ? ok("twitter:card is summary_large_image") : fail("twitter:card not summary_large_image");
} else {
  console.log("\n(Skipping no-cover /read/{id} check — set KNOWN_SCRIPT_NO_COVER_ID to enable)");
}

// ── Missing script → real 404 (no soft-404) ──────────────────────────────────
console.log(`\nChecking: ${BASE_URL}/read/does-not-exist-00000 (expect 404)`);
{
  const res = await fetch(`${BASE_URL}/read/does-not-exist-00000`, { redirect: "follow" });
  res.status === 404 ? ok("missing script returns 404") : fail(`missing script returned ${res.status} (soft-404 risk)`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
} else {
  console.log("\nAll checks passed.");
}
