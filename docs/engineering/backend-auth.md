# Backend Auth Verification (Firebase ID Token)
最後更新：2026-02-06

This backend now verifies Firebase ID Tokens sent via `Authorization: Bearer <id_token>`.

## Required Environment Variables
- `FIREBASE_PROJECT_ID` (optional if using service account with project id)
- `FIREBASE_CREDENTIALS` path to service account JSON file
  - Example: `/secrets/firebase-service-account.json`
  - OR
- `FIREBASE_CREDENTIALS_JSON` raw JSON string for the service account

## Local/Test Fallback (Header-Based Auth)
Use this **only** for local/dev testing:

- `ALLOW_X_USER_ID=1`

When enabled, the backend accepts `X-User-ID` in lieu of a Firebase token.

## Admin Access
- `ADMIN_USER_IDS=admin-owner,another-admin`

Only these UIDs can access `/api/admin/*` endpoints.

## Frontend Behavior
The frontend now sends:
- `Authorization: Bearer <id_token>` when a Firebase user is logged in
- `X-User-ID` only when `VITE_LOCAL_AUTH=1` is enabled

## Recommended Secret Location
Place secrets in `server/secrets/` (ignored by git). For docker-compose, it is mounted read-only at `/secrets`.
