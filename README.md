# MindForge

> A private, source-grounded AI workspace that turns study material into useful learning tools.

**[Open the live app →](https://mind-forge-ashy.vercel.app)**

## Inspiration

Studying from a pile of PDFs, lecture notes, slides, and screenshots often means spending more time organizing material than learning from it. MindForge was created to make that material searchable, explainable, and reusable while keeping each learner's sources private and connected to their original context.

## What it does

- Ingests PDFs, DOCX files, plain text, Markdown, and OCR-enabled images.
- Creates readable summaries, key concepts, and multilingual notes that can continue naturally into the professor chat.
- Runs one-question-at-a-time practice in chat with multiple choice, true/false, short answers, immediate feedback, and scoring.
- Provides account-scoped sessions, search, source downloads, profile preferences, and JSON, Markdown, and PDF exports.

## How we built it

MindForge uses **Next.js** and **TypeScript** for the application layer, **Clerk** for identity, **Prisma/PostgreSQL** for persistent data, and Gemini-powered services for study assistance and speech. Redis-backed rate limiting, Zod validation, document parsers, OCR, and a tested API layer support a reliable end-to-end workflow.

## Challenges we ran into

- Supporting several document formats required a consistent ingestion pipeline while preserving source access and safe account boundaries.
- AI output needed product guardrails: structured errors, request validation, rate limits, audit events, and a fallback path for speech generation.
- Production readiness required more than a feature build, including health checks, retention jobs, backup/restore guidance, and deployment runbooks.

## Accomplishments we're proud of

- Delivered a complete private learning workflow from source upload through AI-assisted study and export.
- Added operational safeguards including verified accounts, distributed rate limits, scheduled retention, audit logging, readiness checks, and automated test, type, lint, build, and browser-test gates.

## What we learned

Useful AI learning products need trustworthy source handling and clear operational boundaries—not just generated answers. Building for privacy, recovery, observability, and multilingual access shaped the product as much as the AI features did.

## What's next

Potential next steps include richer source citations in generated study tools, broader accessibility support, and deeper progress insights while preserving learner control over stored material.

## Built with

`Next.js` · `TypeScript` · `React` · `Clerk` · `Prisma` · `PostgreSQL` · `Google Gemini` · `Upstash Redis` · `Tailwind CSS` · `Vitest` · `Playwright`

## Run locally

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env.local
corepack pnpm db:generate
corepack pnpm prisma migrate dev
corepack pnpm dev
```

See the [deployment and rollback guide](ops/DEPLOYMENT.md) and the [operational readiness evidence](ops/OPERATIONAL_EVIDENCE_2026-09-09.md) for production details.
