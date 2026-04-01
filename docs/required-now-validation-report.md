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
