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

## Hosted hardening follow-up (2026-04-01)

Hosted verification target:

- Vercel deployment: `accelerate-core-env-staging-accelerate-global.vercel.app`
- Supabase project observed in auth links/runtime: `vopebyadvjdskmctxjhn` (`supabase-byzantium-pillow`)

Hosted-only issues found:

1. `public.ensure_invited_auth_user(text)` was missing in hosted DB.
2. Legacy hosted `public.invites` schema drifted from current Phase 2 contract:
   - had `invite_token_hash`/`invited_by`, but current app expects `token_hash`/`created_by`
   - lacked `status` + `updated_at` used by invite resolution/finalization logic
3. Function ACL drift existed (anon/authenticated execute was present in hosted ACL), violating intended service-role-only execution.

Hosted fixes applied minimally:

- Applied Phase 2 ensure-user function in hosted DB.
- Repaired hosted invites schema to current contract via additive/rename-safe SQL.
- Tightened function ACL to service-role-only execution.
- Kept those hosted repairs out of repo migration history because the committed repo schema already reflects the intended end state.

Mailbox-backed hosted rerun (`Blake@risencode.org`) findings:

- Returning-user flow is now mailbox-proven:
  - hosted `/login` send returned `303 -> /login?status=sent`
  - callback reached hosted deployment
  - authenticated entry to `/app` succeeded
- A second hosted-only defect was found during callback finalization:
  - hosted `public.profiles` schema drift (`id`/`full_name`/text `app_role`) was incompatible with current callback profile upsert path (`user_id`/`display_name`/enum `app_role`).
- Minimal hosted fix applied directly in the hosted DB:
  - compatibility backfill for `profiles`
  - compatibility refresh for `handle_new_user`, `current_app_role`, and `is_admin`
  - not retained as a repo migration because the committed repo schema already matches the target contract
- Post-fix callback no longer routes to `/auth/setup-incomplete` for this returning-user path.
- Ensure-user idempotency revalidated in hosted DB after rerun:
  - repeated calls return same user id and keep single `auth.users` + single `auth.identities` row for the email.

Remaining proof caveat:

- First-time invited onboarding is still pending hosted mailbox proof because `Blake@risencode.org` is an already-existing user in hosted auth; a fresh authorized mailbox (or custom SMTP flow) is required to fully close that scenario.

### Hosted magic-link redirect landed on Vercel login (`vercel.com/login?next=/sso-api...`)

This is not Supabase “sending users to sign up for Vercel.” It is **Vercel Deployment Protection** intercepting the first unauthenticated request to your app’s `/auth/callback` when the magic link uses a **deployment hostname** that is protected (often the unique `*.vercel.app` URL from `VERCEL_URL`).

Contributing factor: if `NEXT_PUBLIC_APP_URL` is unset on Vercel, `getAppUrl()` can fall back to `VERCEL_URL`, so `emailRedirectTo` in the magic link may point at a per-deployment host instead of your stable preview origin.

Mitigations:

1. Set `NEXT_PUBLIC_APP_URL` on Vercel to the canonical hosted origin (for example the stable preview URL like `https://accelerate-core-env-staging-accelerate-global.vercel.app`) and **redeploy** so server actions emit that origin in `buildAuthCallbackUrl()`.
2. In Supabase Dashboard → Authentication → URL configuration, allow that same origin’s `/auth/callback` in redirect URLs.
3. If `/auth/callback` is still blocked after (1)–(2), adjust **Deployment Protection** for the environment (for example relax protection on Preview, or follow Vercel guidance for protected previews) so unauthenticated OAuth/magic-link callbacks can reach the app once.
