# Google Content Visibility Contract

Last updated: 2026-06-17

## What Googlebot can see on each public route

This document records the deliberate decisions about how much server-rendered content each public route exposes to Googlebot, and why.

### `/` — Homepage

**Googlebot sees:**
- `<title>` and all `<meta>` tags (og:title, og:description, og:image, twitter:card, etc.)
- JSON-LD `WebSite` structured data
- Server-rendered HTML from `page.tsx` (Next ISR, `revalidate = 300`)
- Any `<noscript>` content in child components

**Googlebot does not see:**
- Dynamic script gallery loaded by client components after hydration

**Decision:** Homepage body content (gallery cards) is client-rendered. This is acceptable because:
1. Googlebot renders JavaScript and will see hydrated content on the second crawl wave.
2. The sitemap lists individual `/read/{id}` pages directly — Google does not need to discover scripts via homepage rendering.
3. Homepage JSON-LD `WebSite` is sufficient for site-level structured data.

---

### `/read/{id}` — Script Reader

**Googlebot sees:**
- All `<meta>` tags including `og:title`, `og:description`, `og:image`, `twitter:card`
- JSON-LD `CreativeWork` structured data with title, description, author, publisher, image, tags
- Visible server-rendered summary (`data-seo-excerpt`): title `<h1>`, description `<p>`, author/org/tags `<dl>`
- Page title and canonical URL

**Googlebot does not see (SSR first pass):**
- Full script content — gated behind `ConsentGate` (client component, SSR = loading spinner)

**Why ConsentGate is not a cloaking risk:**
- The `data-seo-excerpt` summary is genuinely visible to users (shown above the gate while it loads)
- The same content is visible to Googlebot in both SSR HTML and rendered DOM
- Content is consistent with what the public API returns at `/api/public-scripts/{id}`
- The gate is a platform usage agreement, not a content paywall
- Google's guidance: gating content behind a consent/terms dialog is acceptable if it applies equally to users and bots

**Cloaking test:** Does Googlebot see content that normal users cannot see? No — the summary is visible to everyone. Does a normal user see content that Googlebot cannot see? Yes (full script after accepting terms), but this is a user-chosen interaction behind a consent gate, not SEO cloaking.

**Decision:** SSR visible excerpt (title + description + author/org/tags) is the deliberate crawl surface for script pages. Full script content is accessible to anyone who accepts the terms, and to AI agents via `/api/public-scripts/{id}/raw` without any gate.

---

### `/author/{id}` — Author Page

**Googlebot sees:**
- All `<meta>` tags
- JSON-LD `Person` structured data
- `<noscript>` fallback with author name, bio, and script list links

**Decision:** `<noscript>` is kept here because the author page body is entirely client-rendered (`OrgPageClient`/`AuthorPageClient`) with no SSR excerpt equivalent. The `<noscript>` provides basic crawlable content without any cloaking concern (it is only visible to non-JS clients and Googlebot pre-render, then replaced by the same content after hydration).

---

### `/org/{id}` — Organization Page

**Googlebot sees:**
- All `<meta>` tags
- JSON-LD `Organization` structured data
- `<noscript>` fallback with org name, description, and script list links

**Decision:** Same rationale as `/author/{id}`.

---

### `/series/{name}` — Series Page

**Googlebot sees:**
- All `<meta>` tags
- JSON-LD `CreativeWorkSeries` structured data
- `<noscript>` fallback with series name, summary, and script list links

**Decision:** Same rationale as `/author/{id}` and `/org/{id}` — body is client-rendered (`SeriesPageClient`), noscript provides basic crawlable content.

---

### `/tag/{name}` — Tag Page

**Googlebot sees:**
- All `<meta>` tags
- JSON-LD `CollectionPage` structured data with `hasPart` list of scripts
- `<noscript>` fallback with tag name and script list links

**Decision:** Tag pages are thin/aggregate pages — not primary SEO targets and excluded from sitemap. JSON-LD and noscript are present as a baseline.

**Sitemap policy:** Tag pages are NOT included in the sitemap. They are accessible but not actively submitted to Google.

---

## Sitemap coverage policy

| Route | In sitemap | Reason |
|-------|-----------|--------|
| `/` | Yes | Homepage |
| `/about` | Yes | Static page |
| `/read/{id}` | Yes, all public scripts | Primary indexable content |
| `/author/{id}` | Yes, authors of public scripts | Author discovery |
| `/org/{id}` | Yes, orgs of public scripts | Org discovery |
| `/series/{name}` | No | Aggregate pages, not primary content |
| `/tag/{name}` | No | Thin aggregate, not primary content |
| `/gallery` | No | Redirects to `/`, exclude to avoid soft-404 |

---

## robots.txt policy

- `User-agent: *` — public routes allowed, workspace/dashboard/admin disallowed
- `Google-Extended` — separate rule that controls AI product use (Google Bard/Gemini training), NOT the same as `Googlebot` for Search indexing
- `Googlebot` — inherits `User-agent: *` rules; no separate override needed unless behavior differs

Do not conflate `Google-Extended` with `Googlebot`. Blocking `Google-Extended` does not affect Google Search rankings.

---

## AI agent content access

AI agents (non-Googlebot) have a separate access path that does not depend on rendered HTML:

| Endpoint | Content | Auth required |
|----------|---------|--------------|
| `/api/public-scripts/{id}/raw` | Raw markdown | No |
| `/api/public-scripts/{id}` | JSON metadata | No |
| `/sitemap.xml` | All public URLs | No |
| `/llms.txt` | AI agent guide | No |
| `/.well-known/llms.txt` | Same | No |

Content negotiation (`Accept: text/markdown` or AI bot User-Agent on `/read/{id}`) is implemented in the backend `serve_spa` handler but only works when requests reach the backend directly. Requests through the public nginx URL (`open-scripts.shawnup.com/read/{id}`) are routed to the Next.js frontend and return HTML. Prefer `/api/public-scripts/{id}/raw` for reliable raw content access.

---

## ConsentGate cloaking decision record

**Question asked:** Is the server-rendered excerpt above `ConsentGate` on `/read/{id}` a hidden text / cloaking risk?

**Answer:** No, provided:
1. The excerpt content (`data-seo-excerpt` div) is genuinely visible in the page flow — not `display:none`, not `visibility:hidden`, not `position:absolute` clipped offscreen, not `aria-hidden`.
2. The excerpt is shown to users while the ConsentGate loads (above the gate, always visible).
3. The excerpt content matches the JSON-LD structured data and the public API response.
4. The full script content is behind a terms-of-service consent dialog, not a paid paywall.

**What was rejected:** `<article aria-hidden style="position:absolute;width:1px;clip:rect(0,0,0,0)">` — this is the classic hidden text pattern and would be a cloaking risk. Tailwind `sr-only` uses the same clip technique and was also rejected.

**What was implemented:** The excerpt is passed as the `summary` prop to `ConsentGate`. ConsentGate renders `summary` in its loading and required states (before acceptance), then renders only `children` (the reader) once accepted. On SSR, ConsentGate always renders the loading branch, so `data-seo-excerpt` is always present in SSR HTML for Googlebot. After hydration, users see the excerpt while the gate loads, then it disappears when the reader replaces it — no duplicate title/synopsis with `PublicScriptInfoOverlay`.
