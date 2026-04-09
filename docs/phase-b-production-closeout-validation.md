# Phase B Production Closeout Validation

Date: 2026-04-08

This harness is for bounded Phase B hosted closeout only.

It is not CI, it is not a general regression suite, and it should not introduce
new product behavior. The current repo is the source of truth, and the harness
now defaults to the values already present in the local untracked
`[.env.local](/Users/blake/Documents/accelerate-global/accelerate-core/.env.local)`
file.

## Guardrails

- Keep proof-only secrets outside tracked files.
- Do not commit production passwords, keys, or hosted URLs.
- Do not use a real collaborator account for the non-admin proof.
- Do not repurpose the validation source for normal business workflows.
- Do not run hosted proofs until the validation users and validation source are
  confirmed.

## Values Reused From `.env.local`

The hosted closeout harness now prefers these existing repo env names first:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_WORKSPACE_SOURCE_SPREADSHEET_ID`
- `GOOGLE_WORKSPACE_SOURCE_SHEET_NAME`
- `GOOGLE_WORKSPACE_SOURCE_RANGE`

Both the browser proof and the non-admin mutation proof load
`[.env.local](/Users/blake/Documents/accelerate-global/accelerate-core/.env.local)`
automatically when present.

Legacy `PLAYWRIGHT_*` aliases remain fallback-only for compatibility. They are
no longer the documented default.

## Operator-Supplied Values

Required:

- `PHASEB_ADMIN_EMAIL`
- `PHASEB_ADMIN_PASSWORD`
- `PHASEB_NON_ADMIN_EMAIL`
- `PHASEB_NON_ADMIN_PASSWORD`

Optional:

- `PHASEB_VALIDATION_SOURCE_SLUG`
  Default: `phaseb-prod-validation-google-sheet`
- `PHASEB_VALIDATION_NAMESPACE`
  Default: `phaseb-prod-validation`

Important:

- `PHASEB_ADMIN_PASSWORD` and `PHASEB_NON_ADMIN_PASSWORD` are Supabase Auth
  user passwords for the dedicated validation users.
- They are not database passwords.
- They are not Supabase dashboard passwords.

## Values Derived In Code

The harness no longer requires manual entry for these values:

- `SOURCE_ID`
  Derived by querying `registered_sources` with `PHASEB_VALIDATION_SOURCE_SLUG`
- `RANGE`
  Derived from `GOOGLE_WORKSPACE_SOURCE_RANGE` when present, otherwise from the
  selected `registered_sources.config`
- `EXPECTED_ROW_COUNT`
  Derived from the successful `ingestion_runs.metadata` row created by the
  browser proof run itself
- `EXPECTED_SAMPLE_TEXT`
  Derived from the successful `ingestion_runs.metadata.sampleRows` captured by
  the browser proof run itself

For the non-admin mutation proof, spreadsheet id, sheet name, and range are
derived from `.env.local` first and then from the selected source config if the
local env values are absent.

## Required Hosted Validation Assets

- One dedicated admin validation user with a password
- One dedicated non-admin validation user with a password
- One enabled `registered_sources` row addressed by
  `PHASEB_VALIDATION_SOURCE_SLUG`
- One dedicated validation spreadsheet shared to the production Google service
  account already used by the hosted app

## Dedicated Non-Admin Validation User

The current app onboarding flow is invite-first and magic-link-based. The
closeout proof harness, however, uses Supabase password sessions for stable
automation.

Because of that, the safest bounded way to create the dedicated non-admin proof
user is not the in-app invite screen alone.

Use a Supabase operator path instead:

1. Create a dedicated Auth user in Supabase Auth with the validation email and
   a password.
2. Confirm the `public.profiles` row exists for that user.
3. Confirm `public.profiles.app_role = 'user'`.
4. Store that email/password only in local untracked env storage.

Do not reuse a real collaborator account.

## Exact Commands

### Browser Proof

Only the proof-specific admin credentials are required at runtime if
`.env.local` already contains the shared hosted app and Supabase values.

```sh
PLAYWRIGHT_DISABLE_WEBSERVER=true \
PHASEB_ADMIN_EMAIL="<dedicated-admin-validation-user>" \
PHASEB_ADMIN_PASSWORD="<supabase-auth-password>" \
./node_modules/.bin/playwright test tests/admin-operations.spec.ts --project=chromium
```

If the validation source slug is not the default, add:

```sh
PHASEB_VALIDATION_SOURCE_SLUG="<registered-source-slug>"
```

### Non-Admin Mutation Proof

```sh
PHASEB_ADMIN_EMAIL="<dedicated-admin-validation-user>" \
PHASEB_ADMIN_PASSWORD="<supabase-auth-password>" \
PHASEB_NON_ADMIN_EMAIL="<dedicated-non-admin-validation-user>" \
PHASEB_NON_ADMIN_PASSWORD="<supabase-auth-password>" \
node scripts/phaseb-nonadmin-source-create-proof.mjs
```

If the validation source slug is not the default, add:

```sh
PHASEB_VALIDATION_SOURCE_SLUG="<registered-source-slug>"
```

## Residual Data Policy

- The browser proof creates one ingestion run and one deferred pipeline run.
- Those rows are expected Phase B validation artifacts.
- The non-admin mutation proof must leave no `registered_sources` row behind.
