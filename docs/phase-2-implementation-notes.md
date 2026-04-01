# Phase 2 Implementation Notes

Date: 2026-04-01

## Objective

Deliver the minimum durable invite-only auth entry flow:

- returning-user magic-link login
- invite acceptance with token validation
- auth callback/session finalization
- coarse product-route protection
- admin-role continuity for admin routes

## Security posture

- Supabase signup is disabled in `supabase/config.toml`:
  - `[auth].enable_signup = false`
  - `[auth.email].enable_signup = false`
- `/login` remains strict existing-user-only (`shouldCreateUser: false`).
- `/invite/[token]` is the only first-time onboarding path.

## Delivered

## Public auth routes

- `src/app/(public)/login/page.tsx`
  - server-rendered login form
  - redirects authenticated users to `/app`
  - posts to server action that sends OTP with `shouldCreateUser: false`

- `src/app/(public)/invite/[token]/page.tsx`
  - resolves invite token to explicit states (`pending`, `accepted`, `expired`, `revoked`, `invalid`)
  - handles signed-in mismatch state (invited email vs current session email)
  - supports:
    - sign-out-and-continue
    - invite magic-link send
    - same-email in-session acceptance

- `src/app/(public)/auth/callback/page.tsx`
  - handles code-based callback exchange server-side when `code` exists
  - falls back to client hash-token completion (`access_token`/`refresh_token`)
  - finalizes onboarding then redirects to internal target path

- `src/app/(public)/auth/setup-incomplete/page.tsx`
  - recovery route for failed finalization states

## Auth domain helpers/actions

- `src/features/auth/server.ts`
  - centralized auth and invite logic:
    - invite token hashing/resolution
    - OTP send helpers
    - privileged auth user ensure for invited email (`ensure_invited_auth_user`)
    - invite acceptance finalization
    - profile upsert with role handling
    - callback-time onboarding finalization by email

- `src/features/auth/actions.ts`
  - server actions for login, invite send, invite accept, and sign-out helpers

- `src/features/auth/auth-callback-client.tsx`
  - client-side callback completion for fragment token flows
  - invokes finalize API and redirects

- `src/app/api/auth/finalize/route.ts`
  - authenticated finalize endpoint used by callback client path

## Route protection

- `src/middleware.ts`
  - session refresh + coarse protection for `/app/:path*`
  - unauthenticated users are redirected to `/login`

## Supporting updates

- `src/lib/routes.ts`
  - added `/auth/setup-incomplete` route metadata

- `src/features/admin/invites/create-invite-form.tsx`
- `src/features/admin/invites/actions.ts`
  - invite creation/regeneration now carries `metadata.intended_app_role`
  - admin UI exposes role selection (`user`/`admin`)

## Auth Flow Summary

1) Returning user login:
- user enters email on `/login`
- action sends OTP (`shouldCreateUser: false`)
- callback finalizes session onboarding and redirects to `/app`

2) Invite onboarding:
- admin creates invite with token + intended role metadata
- user opens `/invite/[token]`
- server validates invite token and calls privileged ensure-user path:
  - `public.ensure_invited_auth_user(target_email text)` (security definer)
  - creates `auth.users` + `auth.identities` only when missing
- action then sends normal magic link (`shouldCreateUser: false`)
- callback finalizes invite by email:
  - marks invite `accepted`
  - upserts profile
  - applies intended role (without downgrading existing admins)
  - redirects to `/app`

## Signup-disabled revalidation

- Local config remained signup-disabled throughout remediation.
- Invite onboarding passed with new-user provisioning through privileged ensure step.
- Returning-user login passed with existing-user-only behavior on `/login`.
- Authenticated product/admin surfaces remained reachable after callback finalization.

## Validation Summary

- `supabase status`: PASS
- `supabase db reset`: PASS
- `supabase gen types typescript --local --schema public`: PASS (verification run)
- `npm run check`: PASS
- `npm run build`: PASS
- Browser E2E remediation matrix (signup-disabled posture): PASS (`phase2-security-validation:PASS`)
