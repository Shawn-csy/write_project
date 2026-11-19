# Frontend Runtime Boundaries

Last updated: 2026-11-16 (simplification branch; not yet deployed)

## Purpose

This document defines the long-term ownership boundary between the Next.js public frontend, the Vite editor frontend, and shared workspace packages.

Production uses Pages static export with browser live reads to FastAPI. Next server mode is a local development tool, not a production service. The studio remains Vite. See [production architecture](./production-architecture.md), [Pages operations](../engineering/public-pages-production.md) and the [canonical release procedure](../engineering/continuous-deployment.md).

The product has these ownership boundaries:

- `apps/public` owns public pages, build-time SEO snapshots, canonical metadata, stable URLs, browser primary/fallback API adapters, and local development page rendering. Production JSON/media routes are owned by FastAPI. Pages does not execute ISR. D1/R2 are read-only public fallbacks; writes remain with the primary API.
- `apps/studio/src/` exists to serve authenticated editor and workspace workflows.
- `packages/*` exists to hold product semantics that must be shared by both runtimes without copying behavior.

The goal is not to gradually duplicate Vite in Next.js. The goal is to make public behavior canonical in Next.js, keep editor behavior in Vite, and move cross-runtime product rules into shared packages.

## Non-Negotiable Principles

- Public pages are owned by `apps/public`.
- Editor, dashboard, and authenticated workspace flows are owned by the Vite app under `apps/studio/src/`.
- Shared product semantics belong in `packages/*`, not in app-local page components.
- Next.js code must not import from `apps/studio/src/*`.
- Shared packages must not import from `apps/public/*` or `apps/studio/src/*`.
- Public behavior must not depend on Vite-only contexts, React Router, browser-only globals during render, or Vite dev server behavior.
- Vite may consume shared packages for editor preview and marker behavior, but Vite public pages are not canonical.
- Placeholder production behavior is not acceptable. Loading, empty, unavailable, and error states must be explicit.
- Manual browser QA remains required for public replacement work; type checks and unit tests are necessary but not sufficient.

## Ownership Model

### `apps/public`

`apps/public` is the canonical public source. Pages serves its static output; FastAPI supplies public JSON and media. Local Next development forwards media requests to the same backend.

Owns:

- public homepage and discovery
- public reader routes
- author, organization, series, and tag pages
- public metadata, Open Graph, structured data, sitemap-related public contracts
- Pages browser API origin/fallback adapters; any retained local development BFF handlers are not a production deployment dependency
- public route-level consent and age gate wiring
- public static export and local Next development configuration
- host-specific href builders and route composition

May import:

- `packages/public-ui`
- `packages/script-engine`
- `packages/script-reader-renderer`
- `packages/script-reader-ui`
- `packages/script-theme`
- `packages/media-crop`
- `packages/browser-download`

Must not import:

- `apps/studio/src/*`
- Vite-only hooks, contexts, router code, or environment helpers
- editor/dashboard components
- backend implementation modules

### `apps/studio/`

`apps/studio/` contains the Vite editor entry point, source, and static assets.

Owns:

- script editor
- editor preview surfaces
- authenticated dashboard and workspace pages
- account/workspace settings UI
- import, export, and authoring workflows
- editor-only panels and dialogs
- browser-local editor state

May import:

- shared parser, renderer, marker, theme, media, and download packages
- app-local editor components and hooks

Must not own as canonical product behavior:

- public homepage discovery semantics
- public reader rendering semantics
- public SEO metadata
- public author/org/series/tag route behavior
- public consent or age-gate policy

Any remaining Vite public-looking component must be classified as one of:

- editor preview implementation
- compatibility wrapper around a shared package

Batch 2 deletion (2026-06-17) removed all deprecated public surface from Vite:
pages, hooks, and components. `apps/studio/src/hooks/public/usePublicReaderLayoutState.ts`
and `apps/studio/src/components/reader/*` are retained as editor preview implementation.
The old Vite `apps/studio/src/components/renderer/v2/*` and `apps/studio/src/lib/v2/*` modules are
compatibility facades around `@write/script-reader-renderer`; the canonical
presentation implementation now lives in the shared package.

### `packages/*`

Shared packages own product semantics and reusable primitives.

Current package responsibilities:

| Package | Responsibility |
|---|---|
| `@write/script-engine` | marker config normalization, parser, AST, render model, TOC, inline parsing |
| `@write/script-reader-renderer` | React renderers for script render blocks and marker-driven presentation layout (columns/timeline/linear), plus presentation routing/row-grouping/export adapters |
| `@write/script-reader-ui` | public reader state, toolbar primitives, reader preferences |
| `@write/script-theme` | shared CSS variables and marker theme tokens |
| `@write/public-ui` | public homepage/discovery models and router-neutral public UI |
| `@write/media-crop` | media crop reference parsing and style derivation |
| `@write/browser-download` | browser download primitives |

Shared packages may own:

- pure product models
- parser and renderer contracts
- router-neutral React components
- CSS tokens shared across runtimes
- package-local tests and fixtures

Shared packages must not own:

- Next.js route handlers
- React Router navigation
- app-specific API fetches
- environment variables
- auth/session ownership
- app-specific localStorage keys unless passed through an adapter
- app-specific copy or labels that require route context

## Dependency Direction

Allowed dependency direction:

```text
apps/public ─────────────┐
                         ├── packages/*
apps/studio/src/ Vite editor ────────┘

packages/* ──X──> apps/public
packages/* ──X──> src
apps/public ──X──> src
```

When code needs to be shared between `apps/public` and `apps/studio/src/`, move it into the smallest appropriate package under `packages/*`.

When code needs routing, backend fetches, auth context, or deployment configuration, keep it in the app layer and pass stable data into shared packages.

## Public Surface Retirement Policy

Vite public pages are retired when all of the following are true:

- the equivalent public route exists in `apps/public`
- the route has server-side metadata and browser-visible content
- shared product semantics live in packages, not copied app-local code
- browser QA has passed on a production-like Pages export and FastAPI
- Vite editor workflows no longer route users through the old public page

Retirement does not mean deleting the entire Vite app. It means public ownership moves to Next.js while Vite remains responsible for editor/workspace flows.

### Route Ownership

| Public surface | Canonical owner | Vite status |
|---|---|---|
| `/` public discovery | `apps/public` | retired as canonical |
| `/read/[id]` | `apps/public` | retired as canonical |
| `/author/[id]` | `apps/public` | retired as canonical after link/content QA |
| `/org/[id]` | `apps/public` | retired as canonical after link/content QA |
| `/series/[name]` | `apps/public` | retired as canonical |
| `/tag/[name]` | `apps/public` | retired as canonical |
| editor preview | `apps/studio/src/` | remains Vite-owned |
| dashboard/workspace | `apps/studio/src/` | remains Vite-owned |

If a Vite route still presents public content, it should either:

- redirect to the Next public route, or
- be renamed and scoped as an editor preview route.

It must not continue as a parallel public implementation.

## Migration and Cleanup Sequence (historical plan / acceptance criteria)

The phases below describe boundary intent and acceptance criteria, not a statement that every phase is complete. Current checked-in runtime ownership is described above; remaining route/UI feature work and its example module are [pending](../pending/architecture-maintenance-roadmap.md).

### Phase 1: Boundary Declaration

Completion standard:

- this document exists and is linked from `docs/README.md`
- public ownership is documented as Next.js-only
- Vite ownership is documented as editor/workspace-only

### Phase 2: Public Surface Audit

Scan and classify:

- `apps/studio/src/components/public/*`
- `apps/studio/src/components/gallery/*`
- `apps/studio/src/components/reader/*`
- `apps/studio/src/hooks/public/*`
- public-looking Vite routes under `apps/studio/src/routes` and `apps/studio/src/pages`
- any imports of public route components from editor/dashboard surfaces

Each item must be labeled:

- `shared-package`: move or already moved into `packages/*`
- `editor-preview`: keep, but rename or document editor-only intent
- `redirect/remove`: no longer needed because Next owns the public route
- `deprecated-wrapper`: temporary re-export around shared package, with deletion criteria

### Vite → Next Handoff Helper

All navigation from the Vite SPA to a Next.js public route must go through `apps/studio/src/lib/publicNavigation.ts`.

Never write `window.location.href = "/public-path"` directly at call sites.

**Environment variable: `VITE_PUBLIC_BASE_URL`**

| Deployment scenario | Value |
|---|---|
| Legacy server-mode deployment (rollback compatibility only) | unset or `""` — helper returns relative paths, nginx routes correctly |
| Local dev with separate Next.js port (e.g. `next dev` on :3001) | `http://localhost:3001` |
| Current production split-domain deployment | `https://open-scripts.shawnup.com` |

`VITE_PUBLIC_BASE_URL` is read by Vite at build time. Changing it requires rebuilding the Vite bundle unless a separate runtime config layer is introduced.

### Phase 3: Route Cutover

For any Vite route that overlaps a public Next route:

- remove it from public navigation
- redirect it to Next when externally reachable
- keep only editor-scoped preview routes when required by authoring workflows

No user-facing public link should point to a Vite public page after this phase.

### Phase 4: Shared Package Convergence

Any behavior still duplicated between Next public and Vite editor preview must move into a shared package if it is product semantics.

Examples:

- marker parsing
- marker visibility
- script render model
- reader preferences model
- media crop logic
- public card semantics
- public gallery filtering semantics

Behavior that is only layout composition or route wiring stays app-local.

### Phase 5: Import Boundary Enforcement

Add automated checks that fail CI when:

- `apps/public` imports `apps/studio/src/*`
- `packages/*` imports `apps/public/*`
- `packages/*` imports `apps/studio/src/*`
- shared packages import Next.js, Vite router, React Router, app auth contexts, or app environment helpers
- public route components are created under `apps/studio/src/` without an explicit editor-preview classification

The guard should be treated as architecture protection, not style linting.

### Phase 6: Vite Public Cleanup

Delete or rename Vite public files after the audit proves they are not editor dependencies.

Acceptable outcomes:

- deleted because Next owns the route
- renamed to editor preview
- replaced by shared package import
- compatibility wrapper retained with explicit removal condition

Unacceptable outcome:

- app-local Vite public component remains as a second canonical implementation

### Phase 7: Production Routing and QA

Completion standard:

- production public domain serves the Pages artifact built from `apps/public`; browser primary/fallback API paths work
- Vite deployment is scoped to editor/workspace traffic
- retained Next Docker adapters are verified separately from the Pages artifact
- public browser QA passes on a production-like runtime
- Vite editor smoke test passes after public route removal
- docs list any accepted residual differences

## Testing Requirements

Every boundary change must include the right level of verification:

- pure model changes: package unit tests
- shared React primitive changes: package component tests
- Next public route changes: typecheck, public build, and browser QA
- Vite editor impact: editor smoke test or targeted component tests
- import boundary changes: automated guard or CI check

Do not mark a public replacement phase complete because the Vite page still works. The replacement target is the Next production runtime.

## Browser QA Standard

Public QA must cover the actual Pages static artifact with browser primary/fallback API reads and fresh/missing route behavior. Use `next start` or a clean hydrated Next dev port separately for server-only adapters; a server-mode pass does not establish Pages acceptance.

Known caveat:

- a broken dev HMR WebSocket can prevent React hydration on a dev port. That is an environment failure, not a public page acceptance result.

Required checks:

- desktop viewport
- mobile viewport
- light theme
- dark theme
- homepage discovery
- reader entry
- author page
- organization page
- series page
- tag page
- filtered URL reload
- browser back/forward
- consent/age-gate route behavior
- no public links to Vite routes

## Decision Rules

Use these rules when deciding where new code belongs:

| Question | Destination |
|---|---|
| Does it affect public SEO, public route metadata, or public URL behavior? | `apps/public` |
| Is it editor-only interaction or authenticated workspace UI? | `apps/studio/src/` |
| Is it marker parsing, render model, or script semantics? | `@write/script-engine` or reader packages |
| Is it router-neutral public discovery behavior? | `@write/public-ui` |
| Does it need app router, backend fetch, auth, or env vars? | app layer |
| Is it duplicated in both Next and Vite? | shared package, unless it is only app composition |

## Definition of Done

The frontend split is considered stable when:

- `apps/public` owns every public route
- Vite owns only editor/workspace routes
- shared semantics live in packages with tests
- public production deploy no longer depends on Vite
- import boundary guard is enforced
- no public page behavior must be copied from Vite to fix Next
- browser QA is documented for public route replacement
