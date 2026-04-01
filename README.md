# Accelerate Core

Phase 1 foundation for the Accelerate Global app.

This repo intentionally stops at the application skeleton:

- Next.js App Router with separate public, product, and admin shells
- Supabase client wiring for browser, server, and future middleware usage
- Environment validation and deployment-ready `.env.example`
- Placeholder routes for the Phase 1 route map

What it does not implement yet:

- real invite flow
- real magic-link login
- route protection
- admin role enforcement
- live dataset browsing or admin CRUD

## Scripts

- `npm run dev` starts the Next.js app in development mode.
- `npm run build` creates a production build.
- `npm run start` serves the production build.
- `npm run check` runs Ultracite checks.
- `npm run fix` applies Ultracite fixes.

## Manual Follow-Up

- Create the Supabase project.
- Copy the Supabase URL, anon key, and service role key into local environment variables.
- Set the Supabase environment variables in Vercel preview and production.
- Keep `NEXT_PUBLIC_APP_URL=http://localhost:3000` locally.
- In Vercel production, set `NEXT_PUBLIC_APP_URL=https://data.accelerateglobal.org`.
- Do not rely on Vercel system URL variables for production auth redirects or invite links.
- If preview auth testing is needed, prefer an explicit preview `NEXT_PUBLIC_APP_URL` over deployment-host fallback.
- In the hosted Supabase Dashboard, configure Auth `site_url` and allowed redirect URLs for `https://data.accelerateglobal.org/auth/callback`.
- Treat `supabase/config.toml` as local CLI-only config; it does not configure hosted Supabase Auth.

## Supabase CLI

This repo keeps Supabase at scaffold depth in Phase 1.

- `supabase/config.toml` is present for local tooling.
- `supabase/migrations/` is intentionally empty until the auth/access phase.
- Add the first real schema and RLS work in a later phase instead of front-loading it here.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).
See the [LICENSE](./LICENSE) file for the full license text.
