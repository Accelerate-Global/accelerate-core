# Accelerate Core

Phase 1 foundation for the Accelerate Global app.

## Scripts

- `npm run dev` starts the Next.js app in development mode.
- `npm run build` creates a production build.
- `npm run start` serves the production build.
- `npm run check` runs Ultracite checks.
- `npm run fix` applies Ultracite fixes.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).
See the [LICENSE](./LICENSE) file for the full license text.

## Supabase CLI

This repo includes Phase 1 Supabase CLI scaffolding in `supabase/config.toml`.

- Ensure the `supabase` CLI is installed and available on your `PATH`.
- Run `supabase start` to boot the local Supabase stack.
- Run `supabase stop` to stop the local stack.
- Run `supabase migration new <name>` to add the first schema migration in a later phase.
- Run `supabase db reset` to apply migrations and `supabase/seed.sql` during local development.
- `supabase/seed.sql` creates a local development admin user at `admin@example.com`.
- Run `node scripts/bootstrap-admin.mjs <email>` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set to promote the first hosted admin user.
