# Public Auth Entry Strategy

Last updated: 2026-06-24

## Purpose

This document defines how the public Next.js app links users into the authenticated
workspace without duplicating authentication infrastructure.

The public app is an SSR/read-only surface. The workspace app owns login,
Firebase Auth state, authenticated API calls, and dashboard routing.

## Background

The product currently has two frontend surfaces on the same public host:

- `apps/public`: Next.js App Router public pages for SSR, SEO, and reading.
- `src`: Vite workspace app for authenticated editing, dashboard, and settings.

The Vite workspace initializes Firebase Auth and attaches Firebase ID tokens to
backend requests. The backend `/api/me` endpoint requires
`Authorization: Bearer <Firebase ID token>`.

There is no shared cookie session today. Therefore the public Next.js app cannot
determine login state by calling `/api/me` unless it also initializes Firebase
Auth and obtains a client ID token.

## Decision

Do not add Firebase Auth to the public Next.js app for the current public shell.

The public topbar should expose a single workspace entry link:

```text
進入工作室
```

The link target remains:

```text
/dashboard
```

`/dashboard` is handled by the Vite workspace app. The workspace app is
responsible for deciding whether to show the dashboard or the login flow.

## Rationale

This keeps authentication ownership in one frontend app.

Benefits:

- avoids adding `firebase` to `apps/public`;
- avoids adding `NEXT_PUBLIC_FIREBASE_*` build/runtime configuration;
- avoids two frontend apps independently owning login state UI;
- keeps the public Next.js app focused on SSR public content;
- prevents public build failures caused by missing Firebase client env vars;
- keeps authenticated API token handling inside the workspace app.

The public button should describe the destination, not the current login state.
`進入工作室` is preferred over `登入` because the public app does not know whether
the user is already signed in.

## Required Work

### Public Next.js

- Keep `apps/public/components/PublicShellActions.tsx` as a shell composition
  component.
- Use a normal link to `/dashboard` for the workspace action.
- Use the label `進入工作室`.
- Do not initialize Firebase Auth in the public app.
- Do not call `/api/me` from the public app solely to infer login state.

### Vite Workspace

- `src/components/auth/RequireAuth.tsx`: redirect unauthenticated users to
  `/login` (not `/`) with `state={{ from: location }}`.
- `src/pages/LoginPage.tsx`: dedicated login page inside the Vite SPA.
  - Shows Google login button via `useAuth().login()`.
  - On success, navigates to `state.from?.pathname ?? "/dashboard"`.
  - Already-logged-in users are immediately redirected to destination.
- `src/routes/WorkspaceRoutes.tsx`: add `/login` route outside `RequireAuth`,
  as a sibling `<Route>` before the `/*` catch-all.
- `/dashboard` remains the canonical authenticated workspace entry. Unauthenticated
  users hitting `/dashboard` are redirected to `/login`, then back to `/dashboard`
  after login.

## Non-Goals

The current plan does not include:

- showing the logged-in user's avatar in the public topbar;
- showing different public topbar labels for signed-in and signed-out users;
- adding Firebase Auth to `apps/public/package.json`;
- adding `NEXT_PUBLIC_FIREBASE_*` variables;
- adding a backend cookie session;
- using `/api/me` as a public login-state probe.

## Validation

Manual checks:

1. Signed out user opens a public page and clicks `進入工作室`.
2. The browser navigates to `/dashboard`.
3. The workspace shows the login flow.
4. After Google login, the user lands in the dashboard.
5. Signed in user opens a public page and clicks `進入工作室`.
6. The workspace opens the dashboard directly.

Build checks:

```bash
npm run typecheck -- --pretty false
npm run build:public
```

The public build must not require Firebase client environment variables.

## Future Option

If the product later requires the public topbar to show user-specific state,
introduce a dedicated auth architecture instead of ad hoc Firebase duplication.

Preferred future directions:

- backend-managed cookie session shared by both frontends;
- a small shared auth package used by both apps with one documented ownership
  model;
- a public BFF endpoint that can safely expose minimal session state.

Do not add Firebase Auth to the public app just to change a button label unless
the product explicitly requires user-specific public UI.
