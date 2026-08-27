# MindForge

A private AI-powered study workspace. Upload your notes, ask questions grounded in your materials, and generate adaptive practice quizzes. Your data stays yours.

## Modes

- **Demo mode** (`DEMO_MODE = true` in `components/study-workspace.tsx` and `components/practice-panel.tsx`): no backend required. Runs entirely on the client with mock subjects, mock chat responses, image upload, and localStorage-persisted conversations. Great for quick previews and local development.
- **Production mode** (`DEMO_MODE = false`): full server-backed experience using Supabase (Auth, storage, Postgres + pgvector) and the OpenAI Responses API, with Upstash Redis rate limiting.

> The demo build is what is deployed by default. Set `DEMO_MODE = false` and provide the env vars below before any production use.

## Architecture

- **Next.js** (App Router) route handlers and server components.
- **Supabase** provides Auth, private object storage, PostgreSQL, and RLS-enforced tenant isolation.
- **pgvector** stores embeddings; retrieved passages are scoped by the caller's subject and `auth.uid()`.
- **OpenAI Responses API** is called server-side with `store: false`; history lives in the app database.
- **Upstash Redis** rate-limits mutations and inference per user.

## Start (demo)

```bash
pnpm install
pnpm dev
# open http://localhost:3000 -> Open Workspace
```

No environment variables are required for demo mode.

## Start (production)

1. Create a Supabase project and run `supabase/migrations/202608260001_initial.sql`.
2. Create the private `study-materials` Storage bucket and configure an OAuth provider.
3. Copy `.env.example` to `.env.local` and populate every value. The app fails closed when a security-critical value is missing.
4. Set `DEMO_MODE = false` in the two components, then `pnpm dev`.

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` / `pnpm typecheck` (strict, `noUncheckedIndexedAccess` enabled)

## Security

Server-only secrets, strict zod validation, object allow-lists and size caps, private storage, RLS on every table, origin checks on mutations, CSP/security headers, and distributed rate limiting. See the migration and route handlers for enforceable controls.

Before production: configure Supabase SMTP/OAuth redirects, enable MFA, set a WAF/request-body cap, rotate secrets, and run threat modelling.
