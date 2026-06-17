# SEO Homepage Audit

Last updated: 2026-06-17
Scope: homepage preview image issue and stale homepage SEO metadata.

## Executive Summary

The production homepage is currently serving the Vite `index.html` metadata, not the intended Next.js public homepage metadata.

This explains both observed issues:

- Link previews have no preview image because the active production HTML for `/` does not emit `og:image` or `twitter:image`.
- Homepage SEO text is stale because production still exposes the older `index.html` values:
  - `title`: `公開台本 · 免費台本線上閱讀`
  - `og:site_name`: `公開台本`

The repository already contains a Next.js public homepage in `apps/public`, and `nginx.conf` is written as if `/` should proxy to that service. The live response on 2026-06-17 does not match that expected route ownership.

## Production Evidence

Checked against `https://open-scripts.shawnup.com/` on 2026-06-17.

Observed homepage metadata:

```html
<title>公開台本 · 免費台本線上閱讀</title>
<meta name="description" content="免費瀏覽、閱讀與分享創作台本，探索公開作品、配音台本與作者頁面。" />
<meta property="og:title" content="公開台本 · 免費台本線上閱讀" />
<meta property="og:description" content="免費瀏覽、閱讀與分享創作台本，探索公開作品、配音台本與作者頁面。" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="公開台本" />
```

Missing production homepage tags:

- `og:image`
- `og:url`
- `og:locale`
- `twitter:card`
- `twitter:title`
- `twitter:description`
- `twitter:image`
- canonical link
- homepage JSON-LD

Additional signal:

- `GET /` response header includes `last-modified: Fri, 05 Jun 2026 08:14:58 GMT`.
- `GET /gallery` returns the same Vite metadata as `/`.
- `GET /favicon.svg` works, but favicon is not a social preview image and does not satisfy large-card preview requirements.

## Repository Findings

### Active Production HTML Matches Vite

The live metadata matches root `index.html`.

File: `index.html`

Current values:

- `title`: `公開台本 · 免費台本線上閱讀`
- `description`: `免費瀏覽、閱讀與分享創作台本，探索公開作品、配音台本與作者頁面。`
- `og:title`: `公開台本 · 免費台本線上閱讀`
- `og:site_name`: `公開台本`
- no `og:image`
- no Twitter metadata
- no canonical

This file is still a useful fallback for workspace/Vite routes, but it should not be the canonical SEO source for the public homepage.

### Next Homepage Has Better Metadata But Still No Image

File: `apps/public/app/page.tsx`

The Next homepage declares:

- `title`: `免費台本 · 劇本線上閱讀｜Screenplay Reader`
- canonical URL via `alternates`
- Open Graph type, URL, site name, locale
- Twitter metadata
- JSON-LD `WebSite`

Remaining gap in the Next implementation:

- no `openGraph.images`
- `twitter.card` is `summary`, not `summary_large_image`
- no `twitter.images`

So even after routing `/` to Next, homepage link previews may still lack a rich image until a stable homepage OG image is added.

### Next Layout Has Metadata Base

File: `apps/public/app/layout.tsx`

`metadataBase` is configured from `NEXT_PUBLIC_BASE_URL`, defaulting to `https://open-scripts.shawnup.com`. This is the right place to make relative metadata URLs resolvable, but it does not create an image by itself.

### Public Reader Pages Already Use Cover Images When Present

File: `apps/public/app/read/[id]/page.tsx`

Reader metadata conditionally emits:

- `openGraph.images` from `script.coverUrl`
- `twitter.card: summary_large_image` when `script.coverUrl` exists
- `twitter.images` from `script.coverUrl`

Risk:

- If `script.coverUrl` is empty, there is no preview image fallback.
- JSON-LD currently writes `image: script.coverUrl` directly, so relative media paths may be less robust for crawlers than absolute URLs.

Production API sample showed the first few public scripts had empty `coverUrl`, so missing previews for script pages may be data-dependent, not only metadata code-dependent.

### Nginx Is Intended To Route Homepage To Next

File: `nginx.conf`

Expected route:

```nginx
location = / {
  proxy_pass http://$public:3000;
}
```

Expected public service:

```nginx
set $public "write_project-public";
```

Because production `/` still serves the Vite `index.html`, the running deployment likely has one of these problems:

- deployed nginx config is older than repository `nginx.conf`;
- `write_project-public` is not running or not reachable and traffic is falling back elsewhere;
- the public port/domain is still pointed at a static Vite deployment path;
- deploy skipped because `.deploy-hash` considered the current commit already deployed;
- an upstream reverse proxy or Cloudflare origin is not hitting the updated container.

## Root Cause Assessment

Priority 1 root cause:

- Production route ownership for `/` and `/gallery` is wrong. They are still served by Vite/static HTML instead of Next SSR.

Priority 2 root cause:

- The canonical Next homepage does not define a homepage OG image yet.

Priority 3 root cause:

- Public script preview images depend on `coverUrl`; many scripts have no cover image, and there is no default social fallback image for those pages.

## Recommended Fix Plan

### 1. Verify Production Routing

Confirm the deployed nginx config inside the running container:

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec write_project-frontend nginx -T
```

Confirm the public Next service is alive from the frontend container:

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec write_project-frontend wget -S -O - http://write_project-public:3000/ | head
```

Confirm the domain is hitting the expected frontend container:

```bash
curl -I https://open-scripts.shawnup.com/
curl -L -s https://open-scripts.shawnup.com/ | grep -E 'og:title|og:image|twitter:card|canonical|Screenplay Reader'
```

Expected after routing is fixed:

- homepage HTML should include Next metadata from `apps/public/app/page.tsx`;
- `/gallery` should either be a real Next route or redirect/canonicalize to `/`, not serve stale Vite HTML.

### 2. Add A Stable Homepage Social Image

Add a public, crawlable image with a stable URL, for example:

- `apps/public/public/og/homepage.png`
- or root/public equivalent served at `https://open-scripts.shawnup.com/og/homepage.png`

Recommended dimensions:

- 1200 x 630 px
- PNG or JPG
- absolute final URL must return `200`

Then update `apps/public/app/page.tsx`:

- add `openGraph.images`
- change Twitter card to `summary_large_image`
- add `twitter.images`

Also consider adding the same image to `apps/public/app/layout.tsx` as a default for public pages that do not provide their own image.

### 3. Update The Vite Fallback Metadata

Even after Next owns public pages, root `index.html` should not contain obsolete public branding because it can still surface through fallback routes, failed proxying, static deploys, or crawler cache.

Recommended changes:

- align `title` and `og:title` with the canonical homepage wording;
- set `og:site_name` to `Screenplay Reader` unless the product naming decision says otherwise;
- add canonical and Twitter fallback metadata;
- add the same default `og:image`.

This is defensive only. It should not replace fixing route ownership.

### 4. Add Preview Image Fallback For Content Pages

For `/read/[id]`, `/author/[id]`, `/org/[id]`, `/series/[name]`:

- use page-specific image when available;
- otherwise fall back to the site-wide social image;
- convert relative media URLs to absolute metadata URLs before placing them in JSON-LD.

This prevents empty cards when a script has no cover or an author/org has no avatar/banner.

### 5. Add Regression Checks

Add a small script or test that fetches production-like pages and asserts required SEO tags.

Minimum checks:

- `/`
  - canonical
  - `og:title`
  - `og:image`
  - `twitter:card=summary_large_image`
  - JSON-LD `WebSite`
- `/read/{known-script-with-cover}`
  - `og:type=article`
  - `og:image`
  - JSON-LD `CreativeWork`
- `/read/{known-script-without-cover}`
  - fallback `og:image`
  - `twitter:card=summary_large_image`

## Acceptance Criteria

The issue is fixed when all of these are true:

- `curl -L -s https://open-scripts.shawnup.com/` shows Next homepage metadata, not root `index.html` fallback metadata.
- Homepage HTML contains an absolute `og:image` URL.
- Homepage HTML contains `twitter:card` with `summary_large_image`.
- The `og:image` URL returns `200` with an image content type.
- `/gallery` no longer exposes stale duplicate homepage metadata.
- Sharing the homepage in common preview validators shows the intended current title, description, and image.

## Open Decisions

- Final product name for public SEO: keep `Screenplay Reader`, switch to `公開台本`, or use a bilingual title consistently.
- Final homepage description copy.
- Whether `/gallery` should redirect to `/`, remain a distinct Next route, or be removed from public navigation.
- Design/source of the default site-wide social image.
