# Required-Now Validation Report

Date: 2026-04-01  
Scope: security-alignment remediation for Phase 2 (signup-disabled invite-only posture).

## Corrected Auth Posture

- Supabase signup is disabled again:
  - `[auth].enable_signup = false`
  - `[auth.email].enable_signup = false`
- Callback redirect URLs remain configured for `/auth/callback`.
- Invite onboarding no longer depends on `shouldCreateUser: true`.

## Implementation Adjustment

The blocker was that invite onboarding previously worked by allowing OTP user
creation (`shouldCreateUser: true`), which conflicts with intended invite-only
security posture.

Fix applied:

1. Added privileged DB function `public.ensure_invited_auth_user(target_email text)`:
   - migration: `supabase/migrations/20260401040000_phase_2_invite_auth_user_ensure.sql`
   - security definer
   - inserts `auth.users` and `auth.identities` only when the email is missing
   - execute permission granted only to `service_role`
2. Updated invite flow:
   - `sendInviteMagicLink()` now calls privileged ensure-user path first
   - then sends OTP with `shouldCreateUser: false`
3. `/login` remains existing-user-only with `shouldCreateUser: false`.

## Required Command Validation

```sh
supabase status
supabase db reset
supabase gen types typescript --local --schema public
npm run check
npm run build
```

Results:

- `supabase status`: PASS
- `supabase db reset`: PASS (includes new Phase 2 ensure-user migration)
- `supabase gen types ...`: PASS (verification run; output not committed)
- `npm run check`: PASS
- `npm run build`: PASS

## Browser Scenario Revalidation (Signup Disabled)

Automation run:

- deterministic invite fixture seeded (`phase2-user@accelerate.test`)
- browser flow executed end-to-end with local dev server
- result marker: `phase2-security-validation:PASS`

### 1) Invite-only onboarding into authenticated app

- Status: PASS (full browser E2E)
- Evidence:
  - `/invite/phase2token123` token path validated and progressed
  - invite magic link sent
  - callback completed into `/app`
  - SQL post-check: invite `accepted`

### 2) Returning-user login into authenticated app

- Status: PASS (full browser E2E)
- Evidence:
  - `/login` magic link for seeded existing user (`owner-a@accelerate.test`)
  - callback landed in `/app`

### 3) Authenticated access to `/app`

- Status: PASS (full browser E2E)
- Evidence:
  - post-callback app shell reachable
  - middleware guard still enforced for `/app/:path*`

### 4) Authenticated access to global dataset / product shell

- Status: PASS (auth unblocks shell and dataset route access)
- Evidence:
  - authenticated navigation to dataset route worked
  - authenticated shell/API traffic observed

### 5) Dataset browsing states/interactions

- Status: PASS (browser-level state verification)
- Evidence:
  - dataset not-found state reproduced at `/app/datasets/not-a-uuid`
  - expected UI state rendered for invalid dataset ID

### 6) Admin permissions grant/revoke refresh durability

- Status: PASS (full browser E2E)
- Evidence:
  - admin granted direct user access for invited user
  - admin revoked same grant from row-scoped controls
  - grant row disappeared without losing dataset context

### 7) Publishing comparison/history/rollback UI flow

- Status: PASS (full browser E2E)
- Evidence:
  - publishing page loaded lineage/comparison/history sections
  - activate action executed from UI
  - activation/history block remained available

## Invite Ensure-User Proof

Post-run SQL evidence for invited first-time user:

- `auth.users` row exists for `phase2-user@accelerate.test`
- `auth.identities` row exists (`provider = email`)
- invite row moved to `accepted`
- profile row exists with expected role (`user`)

This proves invite onboarding now succeeds while signup remains disabled.

## Phase 2 Verdict

Phase 2 status under intended security posture: **CLOSED**.

---

## Hosted Verification Addendum (2026-04-01)

Scope: targeted hosted-environment hardening pass for invite onboarding (no local redesign).

### Hosted Environment Targeted

- App URL: `https://accelerate-core-env-staging-accelerate-global.vercel.app`
- Deployment: `dpl_8BT59uK2Fa9yiREGc2rbJnxvnr1o`
- Supabase project in hosted auth path: `vopebyadvjdskmctxjhn`

### Hosted Findings

Initial hosted checks surfaced real hosted-only drift:

1. `public.ensure_invited_auth_user(text)` missing.
2. Hosted `public.invites` schema did not match current app contract (legacy column names + missing `status`/`updated_at`).
3. Function execute ACL allowed `anon`/`authenticated` in hosted ACL, violating intended service-role-only access.

### Hosted Fixes Applied

- Applied ensure-user function migration in hosted DB.
- Applied hosted invites schema compatibility repair (column rename/compat + status/update columns and indexes).
- Revoked function execute from `public`, `anon`, and `authenticated`; granted only `service_role`.
- Left those hosted-only repairs out of repo migration history because the committed repo schema already reflects the intended contract.

### Hosted Ensure-User Verification

- Function exists: PASS.
- SECURITY DEFINER: PASS.
- ACL restricted to service role only: PASS.
- Service-role RPC execution: PASS.
- Anon RPC execution denied: PASS (`42501 permission denied`).
- Idempotency/retry: PASS (same user id returned on repeated calls, single `auth.users` and single `auth.identities` row).

### Hosted Scenario Status Matrix (Mailbox-backed rerun, Blake@risencode.org)

1. hosted invited first-time onboarding: **BLOCKED**  
   - `Blake@risencode.org` was already an existing hosted auth/app user, so this rerun followed returning-user branch by design.
2. hosted returning-user login: **PASS**  
   - hosted `/login` send returned `303 -> /login?status=sent`; mailbox magic link was clicked; callback reached hosted deployment and session established.
3. hosted callback/session finalization: **PASS**  
   - pre-fix callback landed on `/auth/setup-incomplete` due hosted `profiles` schema drift; after hosted schema backfill, callback completed and authenticated routes were reached.
4. hosted authenticated entry to `/app`: **PASS (route entry proven)**  
   - mailbox-backed click reached hosted `/app` and authenticated shell navigation (`/app`, `/app/datasets`, `/app/workspace`, `/app/profile`, `/app/admin`) with middleware protection intact.
5. hosted ensure-user idempotency/retry behavior: **PASS**  
   - repeated `public.ensure_invited_auth_user('Blake@risencode.org')` calls returned the same user id and did not increase `auth.users`/`auth.identities` counts.

### Additional Hosted Fix from Mailbox-backed Rerun

New hosted-only defect found and fixed narrowly:

- Hosted `public.profiles` was still on legacy shape (`id`, `full_name`, text `app_role`) while current app callback finalization expects (`user_id`, `display_name`, enum `app_role`).
- This mismatch caused callback finalization to fail and route users to `/auth/setup-incomplete`.

Fix captured in:

- direct hosted DB repair only
  - profile-column compatibility backfill (`id -> user_id`, `full_name -> display_name`)
  - `app_role` enum alignment
  - compatibility refresh of `handle_new_user`, `current_app_role`, and `is_admin` functions
  - not retained as a repo migration because the committed repo schema already matches the target contract

### Mailbox-backed DB Proof Points (Blake@risencode.org)

- `auth.users`: exactly 1 row (`last_sign_in_at` updated after callback click).
- `auth.identities`: exactly 1 email identity row for the same `user_id`.
- `public.profiles`: exactly 1 row with `user_id`, role preserved as `admin`, and `updated_at` refreshed post-callback.
- ensure-user retry proof: first and second calls returned identical user id; post-check counts remained one user and one identity.

### Remaining Hosted Caveats

- First-time invite onboarding is still not proven in this mailbox-backed rerun because the authorized test mailbox was already an existing user; proving that scenario requires one fresh authorized mailbox (or custom SMTP where a fresh mailbox can reliably receive invite OTP).
- Auth/session path is now proven, but product/admin data views still surface hosted runtime errors because the targeted Supabase public schema currently contains only `invites` and `profiles` (missing `datasets`, `workspaces`, `dataset_versions`, etc.).

### Security Posture Check

- Signup remained disabled throughout; no hosted validation step enabled public signup.
- No client exposure of service-role behavior was introduced.
- No invite token validation bypass was introduced.
