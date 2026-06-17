# SEO Homepage Improvement Plan

Last updated: 2026-06-17
Source audit: `docs/seo-homepage-audit-2026-06-17.md`

## Goal

Fix public homepage SEO and preview cards so the production site consistently exposes current metadata and a valid social preview image.

This plan is scoped to:

- homepage `/`;
- stale `/gallery` behavior;
- default social image strategy;
- public page metadata fallback behavior;
- Google Search indexing requirements;
- AI-friendly public data loading contracts;
- regression checks that prevent the issue from returning.

## Target Outcome

After implementation:

- `https://open-scripts.shawnup.com/` is served by the Next.js public frontend, not Vite fallback HTML.
- Homepage metadata uses the current product title, description, canonical URL, Open Graph tags, Twitter tags, and JSON-LD.
- Homepage and public content pages always have a valid preview image.
- `/gallery` no longer exposes stale duplicate metadata.
- Googlebot can crawl indexable public pages with stable canonical URLs, server-rendered content, structured data, and sitemap coverage.
- AI agents can discover public content without executing JavaScript or scraping hydrated UI.
- A repeatable verification script catches missing key SEO tags before deploy.

## Recommended Execution Order

### Phase 0: Product Copy And Image Decision

Status: DONE — decisions locked 2026-06-17.

Decisions:

- Product/site name:
  - recommended: `Screenplay Reader`
  - alternative: `公開台本`
  - acceptable compromise: `公開台本｜Screenplay Reader`
- Homepage title:
  - recommended: `免費台本 · 劇本線上閱讀｜Screenplay Reader`
- Homepage description:
  - recommended: `免費瀏覽、閱讀與分享創作台本，探索公開作品、配音台本與作者頁面。`
- Default social image:
  - required size: 1200 x 630 px
  - recommended URL: `/og/homepage.png`
  - recommended source path: `apps/public/public/og/homepage.png`
- AI access policy:
  - keep public scripts readable through `/api/public-scripts/{script_id}/raw`;
  - keep discovery through `/sitemap.xml`, `/llms.txt`, and `/.well-known/llms.txt`;
  - decide whether AI agents should use raw API endpoints first or public web routes first.
- Google Search policy:
  - allow Googlebot to crawl public HTML routes;
  - keep private/workspace routes blocked;
  - do not confuse `Googlebot` with `Google-Extended` (`Google-Extended` controls AI training/product use, not normal Search indexing).

Exit criteria:

- final title and description are approved;
- social image direction is approved or a temporary generated asset is accepted.
- AI access policy is approved and reflected consistently in docs.
- Google Search crawl/index policy is approved and reflected in robots/sitemap checks.

### Phase 1: Fix Production Route Ownership — DONE

Problem:

Production `/` and `/gallery` currently return Vite `index.html` metadata. Repository `nginx.conf` expects `/` to proxy to `write_project-public`, so production routing does not match the repo.

Primary files:

- `nginx.conf`
- `docker-compose.prod.yml`
- `scripts/deploy.sh`

Implementation tasks:

- Inspect the running production nginx config with `nginx -T`.
- Verify `write_project-public` is running and reachable from the frontend container.
- Verify the external domain is pointed at the container using the repository nginx config.
- If production is running an old image/config, force a deploy and confirm the mounted `nginx.conf` is current.
- Decide `/gallery` behavior:
  - preferred: permanent redirect to `/`;
  - acceptable: add a real Next `/gallery` route with canonical metadata;
  - not acceptable: continue serving Vite fallback HTML.

Suggested `/gallery` implementation:

- Add an exact nginx redirect:

```nginx
location = /gallery {
  return 308 /;
}
```

Use this only if product navigation no longer needs `/gallery` as a distinct URL.

Verification:

```bash
curl -L -s https://open-scripts.shawnup.com/ | grep -E 'Screenplay Reader|og:image|twitter:card|application/ld\\+json'
curl -I https://open-scripts.shawnup.com/gallery
```

Exit criteria:

- `/` response contains Next-generated metadata;
- `/gallery` redirects or serves Next metadata;
- Vite fallback metadata is no longer visible on public discovery URLs.

### Phase 2: Add Site-Wide Social Image Asset — DONE (code); pending: place actual image file or set NEXT_PUBLIC_DEFAULT_OG_IMAGE_URL

Problem:

Neither the live Vite fallback nor the Next homepage currently provides a homepage social preview image.

Primary files:

- `apps/public/public/og/homepage.png`
- optionally `public/og/homepage.png` if Vite fallback must serve the same path

Implementation tasks:

- Create a stable 1200 x 630 image.
- Place it at `apps/public/public/og/homepage.png`.
- If Vite fallback is kept as a defensive path, also make `/og/homepage.png` available from the nginx static root. Options:
  - copy the asset to root `public/og/homepage.png`;
  - or route `/og/` to the Next public frontend before the generic static asset regex.
- Confirm production URL returns image content:

```bash
curl -L -s -o /dev/null -w '%{http_code} %{content_type}\\n' https://open-scripts.shawnup.com/og/homepage.png
```

Exit criteria:

- `https://open-scripts.shawnup.com/og/homepage.png` returns `200`;
- content type is `image/png` or another accepted image type;
- image is not blocked by auth, cookies, robots, or redirect loops.

### Phase 3: Centralize Public SEO Constants — DONE

Problem:

SEO strings and image URLs are repeated across page files. That increases the chance of stale fallback metadata.

Primary files:

- new `apps/public/lib/seo.ts`
- `apps/public/app/layout.tsx`
- `apps/public/app/page.tsx`
- `apps/public/app/read/[id]/page.tsx`
- `apps/public/app/author/[id]/page.tsx`
- `apps/public/app/org/[id]/page.tsx`
- `apps/public/app/series/[name]/page.tsx`
- `apps/public/app/tag/[name]/page.tsx`

Implementation tasks:

- Add shared constants:
  - `SITE_NAME`
  - `SITE_TITLE`
  - `SITE_DESCRIPTION`
  - `BASE_URL`
  - `DEFAULT_OG_IMAGE_PATH`
  - `DEFAULT_OG_IMAGE_URL`
- Add helper functions:
  - `absoluteUrl(pathOrUrl)`
  - `metadataImage(pathOrUrl, alt)`
  - `jsonLdSafe(payload)`
  - `pickPreviewImage(primaryImage)`
- Use the helper in each public route metadata generator.

Design rule:

- Page-specific image wins.
- Site-wide image is always the fallback.
- Metadata and JSON-LD should receive absolute image URLs.

Exit criteria:

- public routes no longer hand-roll base URL and fallback image logic;
- no route emits Twitter `summary` solely because an entity lacks a custom image;
- relative `/media/...` image paths are converted to absolute URLs in metadata.

### Phase 4: Update Homepage Metadata — DONE

Problem:

The Next homepage has better metadata than Vite, but still lacks social image tags.

Primary file:

- `apps/public/app/page.tsx`

Implementation tasks:

- Import shared SEO constants/helpers.
- Add homepage `openGraph.images`.
- Set Twitter card to `summary_large_image`.
- Add `twitter.images`.
- Ensure canonical URL is absolute and stable.
- Ensure JSON-LD `WebSite` description matches the final homepage description.

Expected homepage tags:

```html
<meta property="og:title" content="免費台本 · 劇本線上閱讀｜Screenplay Reader" />
<meta property="og:description" content="免費瀏覽、閱讀與分享創作台本，探索公開作品、配音台本與作者頁面。" />
<meta property="og:url" content="https://open-scripts.shawnup.com/" />
<meta property="og:image" content="https://open-scripts.shawnup.com/og/homepage.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://open-scripts.shawnup.com/og/homepage.png" />
```

Exit criteria:

- homepage preview validators show the intended image and copy;
- curl checks show all required tags.

### Phase 5: Add Public Page Image Fallbacks — DONE

Problem:

Reader, author, org, series, and tag pages may produce image-less preview cards when entity images are missing.

Primary files:

- `apps/public/app/read/[id]/page.tsx`
- `apps/public/app/author/[id]/page.tsx`
- `apps/public/app/org/[id]/page.tsx`
- `apps/public/app/series/[name]/page.tsx`
- `apps/public/app/tag/[name]/page.tsx`

Implementation tasks:

- Use `pickPreviewImage(entityImage)` in all metadata generators.
- Keep page-specific alt text when custom image exists.
- Use site-wide alt text for fallback image.
- Apply the same absolute URL to Open Graph, Twitter, and JSON-LD.

Reader-specific tasks:

- If `script.coverUrl` exists, use it.
- If empty, fall back to `/og/homepage.png`.
- Convert relative `script.coverUrl` to absolute URL before metadata emission.

Exit criteria:

- public pages always emit `og:image`;
- pages with custom images still use those custom images;
- pages without custom images emit the default image.

### Phase 6: Defensive Vite Fallback Metadata — DONE

Problem:

Root `index.html` still contains stale public SEO text. Even if it should not own public discovery, it can leak through fallback deployment paths.

Primary file:

- `index.html`

Implementation tasks:

- Align fallback title, description, `og:title`, and `og:site_name` with the approved public SEO copy.
- Add:
  - canonical link;
  - `og:url`;
  - `og:locale`;
  - `og:image`;
  - `twitter:card`;
  - `twitter:title`;
  - `twitter:description`;
  - `twitter:image`.

Constraint:

- This is a safety net, not the canonical solution. Do not rely on Vite fallback for public SEO.

Exit criteria:

- if Vite fallback is accidentally served, it no longer exposes old branding or image-less previews.

### Phase 7: Regression Verification — DONE

Problem:

SEO regressions are easy to miss because the page can look fine in the browser while crawlers receive stale metadata.

Primary files:

- new `scripts/verify-public-seo.mjs`
- optional CI integration in `scripts/ci.sh`

Implementation tasks:

- Add a script that accepts `BASE_URL`, defaulting to `https://open-scripts.shawnup.com`.
- Fetch HTML for:
  - `/`;
  - `/gallery`;
  - one known `/read/{id}` with cover if available;
  - one known `/read/{id}` without cover if available.
- Assert:
  - no stale Vite-only title on `/`;
  - canonical exists;
  - `og:title` exists;
  - `og:image` exists and is absolute;
  - `twitter:card` is `summary_large_image`;
  - image URL returns `200` image content type.
- Make `/gallery` assertion match the selected behavior:
  - redirect to `/`; or
  - valid Next metadata.

Recommended command:

```bash
BASE_URL=https://open-scripts.shawnup.com node scripts/verify-public-seo.mjs
```

Exit criteria:

- script fails loudly on missing or stale metadata;
- script can run locally against production and against a production-like local container.

### Phase 8: AI Data Loading Contract — DONE

Problem:

SEO metadata helps search and social crawlers, but AI agents need a lower-friction path to load public content. The project already has several pieces, but they are not yet treated as one public contract:

- `public/llms.txt`
- `public/.well-known/llms.txt`
- backend `/llms.txt` generated in `server/main.py`
- `public/robots.txt`
- `/api/public-scripts/{script_id}/raw`
- `/sitemap.xml`
- public route JSON-LD and `<noscript>` content

Current risks:

- `public/llms.txt` and the backend `/llms.txt` copy are not identical.
- The backend `/llms.txt` mentions `https://scripts.shawnup.com`, while current public base URL is `https://open-scripts.shawnup.com`.
- `robots.txt` disallows `/api/` for generic crawlers but allows `/api/public-scripts/` only for named AI bots. This is intentional if generic API crawling should stay closed, but it should be documented as a product policy.
- Homepage discovery currently exposes a `<noscript>` script list, but the AI contract does not explicitly say whether agents should prefer sitemap, raw endpoints, or HTML routes.

Primary files:

- `public/llms.txt`
- `public/.well-known/llms.txt`
- `server/main.py`
- `public/robots.txt`
- `apps/public/app/page.tsx`
- `apps/public/app/read/[id]/page.tsx`
- `server/routers/public.py`
- `docs/mcp-spec.md` if future write/update access is considered

Planning decisions:

- Canonical AI discovery entry:
  - recommended: `/llms.txt` and `/.well-known/llms.txt`
- Canonical content endpoint:
  - recommended: `/api/public-scripts/{script_id}/raw`
- Canonical metadata endpoint:
  - recommended: `/api/public-scripts/{script_id}`
- Discovery index:
  - recommended: `/sitemap.xml` for URLs, homepage `<noscript>` for a small visible list, API list endpoint only when allowed by robots policy.
- Training policy:
  - keep existing licensing language that forbids unauthorized AI model training when content terms say so;
  - distinguish "AI agents reading public content for retrieval" from "training".

Implementation tasks:

- Make `public/llms.txt`, `public/.well-known/llms.txt`, and backend `/llms.txt` consistent.
- Replace stale `scripts.shawnup.com` references with `open-scripts.shawnup.com` or derive from `PUBLIC_BASE_URL`.
- Document preferred request patterns:

```http
GET /api/public-scripts/{script_id}/raw
Accept: text/markdown
```

```http
GET /api/public-scripts/{script_id}
Accept: application/json
```

- Document visibility behavior:
  - public scripts return `200`;
  - private scripts return `404`;
  - folder-inherited public visibility follows the same rule as `/api/public-scripts/{id}`.
- Confirm whether content negotiation on `/read/{script_id}` is actually active in the Next/nginx runtime. If not, remove or soften that claim in `llms.txt`.
- Keep JSON-LD and `<noscript>` as crawler aids, but do not make AI agents depend on parsing rendered HTML.
- Add AI checks to the SEO verification script:
  - `/llms.txt` returns `200 text/markdown` or `text/plain`;
  - `/.well-known/llms.txt` returns `200`;
  - `/sitemap.xml` includes public route URLs;
  - one public raw script endpoint returns `200 text/markdown`;
  - one private/missing raw script returns `404`.

Exit criteria:

- AI agents have one documented discovery path and one documented raw-content path.
- `llms.txt`, robots policy, sitemap, and API behavior do not contradict each other.
- SEO and AI retrieval can be validated independently.

### Phase 9: Google Search Indexing Contract — DONE (decisions documented in docs/seo-google-content-visibility-contract.md)

Problem:

Open Graph and Twitter metadata improve previews, but Google Search indexing depends on a separate set of signals:

- crawlable public HTML with `200` status;
- canonical URLs;
- indexable robots policy;
- sitemap coverage;
- meaningful server-rendered body content;
- structured data that matches visible content;
- stable internal links;
- correct redirect and `404` behavior;
- Search Console validation after deploy.

Current risks:

- `robots.txt` has AI-specific `Google-Extended` rules, but `Google-Extended` is not the same as `Googlebot`. Search indexing should be validated against `Googlebot`.
- `/gallery` redirect is correct only if `/gallery` is no longer intended as an indexable public route.
- Sitemap currently lists homepage, static pages, `/read/`, `/author/`, and `/org/`; series/tag pages may be absent even though Next has `/series/[name]` and `/tag/[name]`.
- JSON-LD is present on public routes, but should stay consistent with visible content and absolute URLs.
- Public reader pages include consent gating; Google must still receive enough server-rendered, crawlable content for the public script page.

Primary files:

- `public/robots.txt`
- `server/main.py` sitemap generator
- `apps/public/app/page.tsx`
- `apps/public/app/read/[id]/page.tsx`
- `apps/public/app/author/[id]/page.tsx`
- `apps/public/app/org/[id]/page.tsx`
- `apps/public/app/series/[name]/page.tsx`
- `apps/public/app/tag/[name]/page.tsx`
- `scripts/verify-public-seo.mjs`

Implementation tasks:

- Robots:
  - ensure `User-agent: *` allows public routes;
  - keep `/dashboard`, `/edit`, `/studio`, `/admin`, and private API surfaces disallowed;
  - add explicit `User-agent: Googlebot` only if a future rule differs from `User-agent: *`;
  - document that `Google-Extended` is for AI/product-use controls, not Search ranking/indexing.
- Sitemap:
  - keep `/gallery` removed if it redirects to `/`;
  - add indexable `/series/{name}` URLs if series pages are intended for Google;
  - add indexable `/tag/{name}` URLs only if tag pages have enough unique value and are not thin/duplicate pages;
  - ensure `lastmod` uses real update timestamps where available;
  - escape non-ASCII and special characters correctly.
- Public page metadata:
  - every indexable page emits one canonical URL;
  - canonical URL must match the final public URL after redirects;
  - no public page should canonicalize to stale Vite URLs;
  - `title` and `description` must be unique enough for read/author/org/series/tag pages.
- Structured data:
  - `/` uses `WebSite` JSON-LD;
  - `/read/{id}` uses `CreativeWork`;
  - `/author/{id}` uses `Person`;
  - `/org/{id}` uses `Organization`;
  - `/series/{name}` uses `CreativeWorkSeries` or `CollectionPage`;
  - `/tag/{name}` uses `CollectionPage`;
  - image URLs in JSON-LD must be absolute when present.
- Rendered content:
  - public reader pages should expose title, description, author/org, tags, and enough script text in server-rendered HTML or `<noscript>` for crawler understanding;
  - homepage should expose crawlable links to representative public scripts, authors, orgs, series, and tags.
- Status codes:
  - existing public pages return `200`;
  - missing/private scripts return `404`, not soft-404 HTML;
  - `/gallery` returns `308` or `301` to `/` if retired.
- Verification:
  - update `scripts/verify-public-seo.mjs` to run with a Googlebot user-agent mode;
  - assert `robots.txt` includes the sitemap URL;
  - assert sitemap does not include `/gallery`;
  - assert sitemap includes at least one `/read/` entry;
  - if series/tag are indexable, assert sitemap includes at least one `/series/` and `/tag/` entry;
  - assert selected public pages include canonical, description, JSON-LD, and non-empty body content.

Recommended Search Console follow-up:

- Submit or refresh `https://open-scripts.shawnup.com/sitemap.xml`.
- Use URL Inspection on:
  - `/`
  - one `/read/{id}` with cover image;
  - one `/read/{id}` without cover image;
  - one `/author/{id}`;
  - one `/org/{id}`;
  - one `/series/{name}` if indexable;
  - one `/tag/{name}` if indexable.
- Check "View crawled page" to confirm Google sees meaningful rendered HTML and not only a loading shell.

Exit criteria:

- Googlebot can fetch all intended public routes.
- Sitemap only contains canonical indexable URLs.
- Public pages avoid soft-404, duplicate canonical, and missing-description issues.
- Search Console URL Inspection reports pages as crawlable and indexable after deployment.

## Release Checklist

Before deploy:

- final SEO copy approved;
- AI data loading policy approved;
- Google Search indexing policy approved;
- default OG image committed and visually checked;
- unit/type checks pass for `apps/public`;
- SEO verification script passes against local production-like runtime if available.

After deploy:

- confirm `/` is served by Next metadata;
- confirm `/gallery` behavior;
- confirm `/og/homepage.png` returns `200`;
- confirm `/llms.txt`, `/.well-known/llms.txt`, `/sitemap.xml`, and a raw public script endpoint return expected responses;
- confirm Googlebot-mode checks for robots, sitemap, canonical URLs, JSON-LD, and selected public pages;
- run the SEO verification script against production;
- purge Cloudflare cache for `/`, `/gallery`, and `/og/homepage.png` if stale HTML persists;
- validate one homepage share preview with an external debugger.

## Rollback Plan

If homepage routing breaks:

- revert only the nginx route change or redeploy the previous working frontend image;
- keep the Vite fallback metadata update if it is already deployed, because it improves degraded behavior.

If the social image URL breaks:

- temporarily point metadata to an existing known-good image URL;
- redeploy metadata only;
- keep page fallback logic in place.

If metadata helpers cause route errors:

- revert helper adoption route by route;
- preserve the default OG image asset and Vite fallback metadata.

## Risks

- Cloudflare or upstream proxy cache can continue serving stale HTML after deployment.
- Next static generation or ISR may cache old metadata until revalidation or rebuild.
- Relative media URLs in entity data may work in browser UI but fail in crawler metadata unless normalized.
- Some social platforms cache previews aggressively; external preview results may lag after the fix.
- If `/gallery` is still linked externally, a redirect decision should account for analytics and user expectations.
- AI bot behavior varies; `robots.txt` permissions do not guarantee every agent will prefer the raw endpoint unless `llms.txt` is clear and consistent.
- Google Search cache and canonical selection can lag after deployment; Search Console should be treated as the final verification surface.

## Suggested Implementation PR Split

PR 1: Routing and deployment verification

- verify/fix production `/` ownership;
- decide and implement `/gallery` behavior.

PR 2: Social image and Next metadata

- add `/og/homepage.png`;
- add shared SEO helpers;
- update homepage metadata.

PR 3: Page-level fallbacks

- update reader, author, org, series, and tag metadata fallback behavior;
- normalize image URLs for JSON-LD.

PR 4: Fallback and regression checks

- update root `index.html`;
- add `scripts/verify-public-seo.mjs`;
- document post-deploy verification.

PR 5: AI loading contract

- align `llms.txt` sources;
- confirm robots policy for AI agents;
- add AI endpoint checks to verification.

PR 6: Google Search indexing contract

- add Googlebot-aware verification checks;
- update sitemap coverage for series/tag if they are intended to rank;
- document Search Console post-deploy validation.

## Done Definition

The project is done when:

- production `/` no longer exposes the stale Vite SEO tags recorded in the audit;
- every public SEO surface emits a valid preview image;
- default and page-specific images both work;
- `/gallery` no longer produces duplicate stale metadata;
- AI-readable docs and endpoints are consistent;
- Googlebot indexing requirements are explicitly verified;
- regression verification can be run before and after deploy.
