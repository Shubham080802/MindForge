# Private Study Agent

A full-stack tutoring application for turning a learner's own notes and lectures into grounded explanations, adaptive questions, and private study conversations.

## Architecture

- **Next.js** route handlers and server components; no browser `localStorage` or client-side API keys.
- **Supabase** provides hosted Auth, private object storage, PostgreSQL and RLS-enforced tenant isolation.
- **pgvector** stores embeddings in the database. Retrieved passages are scoped by the caller's subject and `auth.uid()` before they are sent to the LLM.
- **OpenAI Responses API** is called from the server with `store: false`; conversation history remains in the application's database.
- **Upstash Redis** rate-limits mutations and inference by user across application instances.

## Start

1. Create a Supabase project and run `supabase/migrations/202608260001_initial.sql` in its SQL editor or migration pipeline.
2. Create the private `study-materials` Storage bucket and configure your chosen OAuth provider in Supabase Auth.
3. Copy `.env.example` to `.env.local` and populate every value. The application deliberately fails closed when a security-critical value is missing.
4. Install dependencies with `pnpm install`, then run `pnpm dev`.

## Security posture

The implementation follows OWASP-aligned controls: server-only secrets, strict validation, object allow-lists and size caps, private storage, RLS on every application table, origin checks on mutations, CSP/security headers, distributed rate limiting, and content-free audit events. See the migration and route handlers for the enforceable controls.

Before production, configure Supabase SMTP/OAuth redirect URLs, turn on MFA where appropriate, set your hosting provider's WAF and request-body cap, rotate secrets, and conduct application-specific threat modelling and security testing.
