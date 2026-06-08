# Next.js Public Frontend Migration Plan

## Overview

Split the current monolithic Vite SPA into two independent frontends:

- **`apps/public`** — Next.js App Router, SSR/ISR, handles all public-facing pages
- **`apps/workspace`** — existing Vite SPA, unchanged, handles all auth-gated editor/dashboard pages

The Python FastAPI backend remains unchanged.

---

## Motivation

| Problem | Current | After Migration |
|---|---|---|
| Google bot sees empty HTML | Only meta tags injected by backend | Full SSR HTML |
| AI crawlers (Perplexity, GPT) | Invisible | Fully readable |
| Core Web Vitals / LCP | SPA JS waterfall | SSR HTML first |
| Long-tail SEO (script titles, author names) | Indexed slowly / unreliably | Indexed immediately |

---

## Architecture

```
open-scripts.shawnup.com
        |
     Nginx
        |
   _____|_______________________
  |                             |
  | /dashboard, /edit/*, /studio, /admin
  |                             |
  apps/workspace            apps/public
  (Vite SPA, port 1090)    (Next.js, port 3000)
        |                       |
        |_______________________|
                    |
              apps/backend
           (FastAPI, port 1091)
```

### Nginx routing rules

```nginx
# Auth-gated workspace routes → Vite SPA
location ~ ^/(dashboard|edit|studio|admin) {
    proxy_pass http://workspace:1090;
}

# Public routes → Next.js
location / {
    proxy_pass http://public:3000;
}

# API and media → backend (shared)
location /api/ { proxy_pass http://backend:1091; }
location /media/ { proxy_pass http://backend:1091; }
location /sitemap.xml { proxy_pass http://backend:1091; }
```

---

## Pages to Migrate

| Current Route | Next.js Route | Rendering Strategy |
|---|---|---|
| `/` | `app/page.tsx` | SSR + client hydration (filter/search client-side) |
| `/read/:id` | `app/read/[id]/page.tsx` | ISR + on-demand revalidation |
| `/author/:id` | `app/author/[id]/page.tsx` | ISR + on-demand revalidation |
| `/org/:id` | `app/org/[id]/page.tsx` | ISR + on-demand revalidation |
| `/series/:name` | `app/series/[name]/page.tsx` | ISR + on-demand revalidation |
| `/privacy` | `app/privacy/page.tsx` | SSG (static) |
| `/terms` | `app/terms/page.tsx` | SSG (static) |

### Rendering strategy rationale

- **`/` (gallery)** — scripts/authors/orgs list fetched server-side at request time; filter/search/tabs stay client-side interactive. `force-dynamic` or short revalidate (~60s).
- **`/read/:id`** — ISR: first visit SSR, then cached. On-demand revalidation when script is updated.
- **`/author/:id`, `/org/:id`, `/series/:name`** — same as read, ISR.
- **`/privacy`, `/terms`** — static content, SSG at build time.

---

## Revalidation Strategy

When a script/author/org is updated via the editor:

```
User saves script in workspace editor
→ PUT /api/scripts/:id (backend)
→ backend calls Next.js revalidation endpoint:
  POST http://public:3000/api/revalidate
  { secret: REVALIDATE_SECRET, paths: ["/read/:id"] }
→ Next.js clears ISR cache for that path
→ Next request serves fresh SSR HTML
```

Backend changes needed:
- Add `NEXTJS_REVALIDATE_URL` and `REVALIDATE_SECRET` env vars
- After successful script update, fire async HTTP call to revalidation endpoint
- Same for persona/org updates

Next.js changes needed:
- `app/api/revalidate/route.ts` — validates secret, calls `revalidatePath()`

---

## Shared Code Strategy

The two apps share UI components, i18n, types, and utility libs. Two options:

### Option A: pnpm monorepo with shared packages (recommended)

```
write_project/
  apps/
    public/          ← new Next.js app
    workspace/       ← existing Vite SPA (moved here)
  packages/
    ui/              ← shadcn components, shared UI
    i18n/            ← locales + useI18n hook
    types/           ← shared TypeScript types (api.ts, script.ts, etc.)
    lib/             ← pure utility functions (licenseRights, series, etc.)
  server/            ← FastAPI backend (unchanged)
```

### Option B: copy-on-write (simpler short-term, painful long-term)

Duplicate shared code into `apps/public/src/`. Accept divergence risk.

**Decision: Option A.** The shared surface area is large enough that duplication creates real maintenance burden.

---

## Component Migration Analysis

### Can reuse directly (pure UI, no routing deps)

These components have no react-router or browser-only deps at the module level and can move to `packages/ui` with minimal changes:

- `src/components/gallery/ScriptGalleryCard.tsx`
- `src/components/gallery/HorizontalScrollLane.tsx`
- `src/components/gallery/GalleryScriptsView.tsx`
- `src/components/gallery/AuthorGalleryCard.tsx`
- `src/components/gallery/OrgGalleryCard.tsx`
- `src/components/gallery/GalleryPeopleView.tsx`
- `src/components/gallery/GalleryFilterBar.tsx`
- `src/components/public/PublicHeroMarquee.tsx`
- `src/components/public/TermsConsentDialog.tsx`
- `src/components/public/R18ConsentDialog.tsx`

### Needs adaptation (routing / browser APIs)

These contain `useNavigate`, `useParams`, `localStorage`, or `window` calls:

| Component/Hook | Issue | Next.js equivalent |
|---|---|---|
| `usePublicGalleryState.ts` | `useNavigate`, `useSearchParams` from react-router | `useRouter`, `useSearchParams` from `next/navigation` |
| `usePublicReaderScript.ts` | `useI18n` context | keep as-is, wrap in client component |
| `usePublicReaderLayoutState.ts` | `localStorage`, `window.requestAnimationFrame`, `document.querySelectorAll` | mark as `"use client"`, guard with `typeof window !== "undefined"` |
| `usePublicTerms.ts` | `localStorage`, `window.screen`, `document.referrer` | `"use client"` |
| `PublicTopBar.tsx` | `useNavigate` | `useRouter` from `next/navigation` |
| `AuthorProfilePage.tsx` | `useParams`, `useNavigate` | Next.js page props |
| `OrganizationPage.tsx` | same | same |

### Not migrating (workspace only)

Everything under `src/hooks/editor/`, `src/components/editor/`, `src/pages/DashboardPage.tsx`, `src/pages/CloudEditorPage.tsx`, `src/pages/SuperAdminPage.tsx` stays in `apps/workspace`.

---

## Firebase Auth in Public App

The public app only needs auth for the "login" button in the top bar (redirects to workspace). Two approaches:

### Approach A: No Firebase in public app (recommended)

Login button simply links to `https://open-scripts.shawnup.com/dashboard`. Workspace handles all auth. Public app has zero Firebase dependency.

### Approach B: Firebase in public app (future)

If you want "logged-in" state visible in the public nav (e.g., show avatar), initialize Firebase client-side in a `"use client"` component. Never use Firebase in server components.

**Decision: Start with Approach A.** Zero auth complexity in public app.

---

## Docker Images

### Current (2 images)
```
write_project-frontend   nginx + Vite dist
write_project-backend    FastAPI
```

### After migration (3 images)
```
write_project-public     Next.js (Node.js runtime, port 3000)
write_project-workspace  nginx + Vite dist (port 1090)
write_project-backend    FastAPI (unchanged)
```

### `docker-compose.prod.yml` additions

```yaml
write_project-public:
  image: write_project-public:${DEPLOY_TAG:-latest}
  build:
    context: ./apps/public
  restart: unless-stopped
  ports:
    - "3000:3000"
  environment:
    - NEXT_PUBLIC_API_URL=${VITE_API_URL}
    - REVALIDATE_SECRET=${REVALIDATE_SECRET}
    - NODE_ENV=production

write_project-workspace:
  image: write_project-workspace:${DEPLOY_TAG:-latest}
  # same as current write_project-frontend, just renamed
```

---

## SEO Additions (over current seo.py)

Current `seo.py` already handles: title, description, OG tags, JSON-LD, canonical URL, body injection for Googlebot.

Next.js replaces all of this with native `generateMetadata()`. The Python injection layer for public routes can be removed after migration.

Additional SEO improvements possible with Next.js:

- **`/` gallery** — `WebSite` + `ItemList` JSON-LD with top scripts
- **`/read/:id`** — `CreativeWork` JSON-LD (already in seo.py, port to Next.js)
- **`/author/:id`** — `Person` JSON-LD (already in seo.py)
- **`/org/:id`** — `Organization` JSON-LD (already in seo.py)
- **Open Graph images** — Next.js `ImageResponse` for dynamic OG images per script
- **`robots.txt`** — Next.js static route
- **Sitemap** — can migrate from FastAPI to Next.js `app/sitemap.ts` (or keep in backend)

---

## Execution Strategy

**Core principle**: decouple "SSR for SEO" from "monorepo refactor". Ship value incrementally with minimal rollback surface.

- Shared packages (`packages/ui`, `packages/types`, etc.) are deferred until the Next.js app is stable in production. Initial phases allow copy/adapt of public components.
- Each phase has an independent rollback: nginx routing is additive, old routes remain until explicitly cut over.
- First deliverable: `/read/:id` served by Next.js SSR/ISR with full HTML. Production nginx switches `/read/` traffic. Workspace untouched.

---

## Migration Phases

### Phase 1 — Next.js App Scaffold + `/read/:id` (first deliverable)

**Goal**: `/read/:id` returns full SSR HTML. Nginx cuts `/read/` to Next.js. Everything else unchanged.

#### 1a — Scaffold

1. `apps/public/` directory alongside existing `src/`, `server/`
2. `npx create-next-app@latest apps/public --typescript --tailwind --app --no-src-dir`
3. Copy/adapt shared dependencies: tailwind config, shadcn setup, i18n locales (copy, not package)
4. Add `apps/public/Dockerfile`
5. Add `write_project-public` service to `docker-compose.prod.yml` (port 3000)
6. Verify: `docker build apps/public` succeeds

#### 1b — `/read/[id]` page

1. `app/read/[id]/page.tsx` — server component
2. Server-side fetch `GET /api/public-scripts/:id` from backend
3. `generateMetadata()` — title, description, OG tags, canonical URL
4. `inject_structured_data` equivalent — `CreativeWork` JSON-LD in `<head>`
5. Render full script content as static HTML (no JS required for content)
6. Copy/adapt `usePublicReaderLayoutState.ts` as client component for interactive UI (TOC, markers, download)
7. Copy/adapt `TermsConsentDialog` as `"use client"` component
8. ISR: `export const revalidate = 86400` (daily fallback)

#### 1c — On-demand revalidation

1. `app/api/revalidate/route.ts` — POST endpoint, validates `REVALIDATE_SECRET`, calls `revalidatePath("/read/:id")`
2. Backend `server/routers/scripts.py` — after successful PUT, fire async POST to `NEXTJS_REVALIDATE_URL`; non-blocking, errors logged only
3. New env vars: `REVALIDATE_SECRET`, `NEXTJS_REVALIDATE_URL` (backend), `REVALIDATE_SECRET` (public app)

#### 1d — Nginx routing (additive only)

```nginx
# New: /read/ → Next.js
location /read/ {
    proxy_pass http://write_project-public:3000;
    ...
}
# All other routes unchanged
```

Old backend injection for `/read/` in `server/main.py` becomes dead code (do not delete yet).

#### Verification checklist

- [ ] `curl https://open-scripts.shawnup.com/read/:id` returns HTML with script title in `<title>`
- [ ] `<script type="application/ld+json">` present with `@type: CreativeWork`
- [ ] `og:title`, `og:description`, `og:image` correct
- [ ] `canonical` URL correct
- [ ] Script body text visible in `curl` output (no empty `<div id="root">`)
- [ ] Script update in editor → revalidation fires → curl shows updated content within 5s
- [ ] `/dashboard`, `/edit/*` unaffected
- [ ] `/` gallery unaffected

---

### Phase 2 — Author, Org, Series Pages

**Batch these together**: similar data shape, same ISR pattern.

1. `app/author/[id]/page.tsx` — fetch `/api/public-personas/:id`, `Person` JSON-LD
2. `app/org/[id]/page.tsx` — fetch `/api/public-organizations/:id`, `Organization` JSON-LD
3. `app/series/[name]/page.tsx` — fetch scripts filtered by series name
4. On-demand revalidation for all three (extend backend revalidation hooks)
5. Nginx: add `location /author/`, `location /org/`, `location /series/` → Next.js
6. Verification: same checklist as Phase 1 per route

---

### Phase 3 — Static Pages

1. `app/privacy/page.tsx` — SSG, port `PrivacyPolicyPage.tsx`
2. `app/terms/page.tsx` — SSG, port `TermsOfServicePage.tsx`
3. `app/about/page.tsx` — SSG
4. Nginx: add these routes → Next.js

---

### Phase 4 — Gallery Page `/` (most complex, last)

**Deferred because**: highest interactivity (filter, search, tabs, segment, R18 consent, mobile sheet), most SSR boundary risk.

1. Server component fetches `/api/public-bundle` (scripts + personas + orgs)
2. Pass to client component `GalleryClient` for all interactive state
3. Port `usePublicGalleryFiltering.ts` (pure logic, no browser APIs, reuse directly)
4. Port `usePublicGalleryState.ts` → replace `useNavigate`/`useSearchParams` (react-router) with `useRouter`/`useSearchParams` (next/navigation)
5. Port gallery components: ScriptGalleryCard, HorizontalScrollLane, GalleryScriptsView, etc.
6. R18 consent dialog (`"use client"`, localStorage)
7. `generateMetadata()` — WebSite JSON-LD + SearchAction
8. Nginx: switch `/` → Next.js (final cutover)

---

### Phase 5 — Shared Packages Extraction (after production stable)

Only after all phases are live and stable:

1. Init pnpm workspaces
2. Extract `packages/types` — shared TypeScript types
3. Extract `packages/lib` — pure utility functions (licenseRights, series, customMetadata, etc.)
4. Extract `packages/i18n` — locales + i18n hook
5. Extract `packages/ui` — shadcn components, gallery cards
6. Update `apps/public` and `apps/workspace` imports
7. Verify both apps still build

---

### Phase 6 — Cleanup

1. Remove Python SEO injection from `server/main.py` for routes now handled by Next.js
2. Remove dead code in workspace for migrated public routes
3. Final nginx cleanup

---

## Environment Variables

### New vars needed

| Var | Where | Purpose |
|---|---|---|
| `REVALIDATE_SECRET` | backend + public app | authenticate revalidation webhook |
| `NEXTJS_REVALIDATE_URL` | backend | URL of Next.js revalidation endpoint |
| `NEXT_PUBLIC_API_URL` | public app | API base URL (same as `VITE_API_URL`) |

### Existing vars to carry over

`VITE_FIREBASE_*` vars are NOT needed in `apps/public` (no Firebase auth in public app).

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Monorepo setup breaks existing Vite build | Phase 0 has explicit verification step; rollback is just reverting file moves |
| ISR stale cache after script update | On-demand revalidation webhook; worst case is short stale window until next revalidation interval |
| localStorage / browser API SSR errors | Strict `"use client"` boundary enforcement; `typeof window !== "undefined"` guards where needed |
| Next.js cold start on low-memory server | Next.js standalone output mode reduces memory; ISR means most pages served from cache |
| i18n in server components | Pass locale from `Accept-Language` header or cookie; use server-safe i18n (non-hook) for metadata generation |

---

## File Structure

### Phase 1 target (minimal, no monorepo)

```
write_project/
  apps/
    public/                          # new Next.js app
      app/
        layout.tsx
        read/[id]/
          page.tsx                   # SSR/ISR script reader
          ScriptReaderClient.tsx     # "use client" interactive UI
        api/revalidate/route.ts
      components/
        reader/                      # copy/adapted from src/components/reader/
        public/                      # copy/adapted from src/components/public/
      hooks/
        usePublicReaderLayoutState.ts  # copy/adapted, "use client"
      lib/
        api.ts                       # server-side fetch helpers
      i18n/
        locales/                     # copy from src/i18n/locales/
      Dockerfile
      next.config.ts
      package.json
  src/                               # existing Vite SPA — unchanged
  server/                            # FastAPI — minimal changes (revalidation hook)
  docker-compose.prod.yml            # +write_project-public service
  nginx.conf                         # +/read/ → Next.js
```

### Final target (after Phase 5 packages extraction)

```
write_project/
  apps/
    public/                          # Next.js, all public pages
    workspace/                       # Vite SPA renamed from src/
  packages/
    ui/                              # shared shadcn + gallery cards
    i18n/                            # locales + hooks
    types/                           # shared TypeScript types
    lib/                             # pure utility functions
  server/
  docker-compose.prod.yml
  nginx.conf
```

---

## Success Criteria

- [ ] All 7 public routes return full HTML to curl (no empty `<div id="root">`)
- [ ] Google Search Console shows new pages indexed within 2 weeks of deploy
- [ ] `/read/:id` ISR cache updates within 5 seconds of script save
- [ ] Existing workspace (editor, dashboard) fully unaffected
- [ ] Build pipeline: `docker build apps/public` and `docker build apps/workspace` both succeed independently
- [ ] Lighthouse SEO score >= 95 on `/read/:id`
