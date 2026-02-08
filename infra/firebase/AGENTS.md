# infra/firebase

## Purpose
Firebase configuration placeholders for V1 (App Hosting + Firestore rules/indexes).

## What Lives Here / What Must Not
Lives here:
- `firebase.json` scaffold
- Firestore security rules and index definitions

Must not live here:
- Secrets (API keys, service accounts)
- Any real admin emails embedded into rules

## How To Run / Test
Placeholder commands (requires Firebase CLI, not set up by this scaffold):
- Validate config: `firebase --project accelerate-global-473318 projects:list`
- Emulate Firestore: `firebase emulators:start --only firestore`

## Key Files
- `infra/firebase/firebase.json`
- `infra/firebase/firestore.rules`
- `infra/firebase/firestore.indexes.json`

## Interfaces / Contracts
- Firestore rules are written assuming Firebase Auth.
- V1 intent: default deny for clients; allow only admins (likely via a custom claim such as `admin == true`).

## Security Notes (Secrets, Authz)
- Do not hardcode admin emails here.
- Treat rules as defense-in-depth; API/Worker remain the enforcement point for admin allowlist.

