# Resume project recommendations — Shubham080802

**Research date:** 2026-09-18. The local `MindForge` Git remote identifies the
portfolio as [github.com/Shubham080802](https://github.com/Shubham080802). This
review covers its four non-fork public repositories. `readykit-edge` is marked
as a fork in GitHub metadata, so it is deliberately excluded from the ranked
recommendations rather than presented as an original project.

## Software / developer / AI-product resume — top 3

### 1. [MindForge](https://github.com/Shubham080802/MindForge)

- Built a private, source-grounded AI study workspace with Next.js, TypeScript,
  Clerk, Prisma/PostgreSQL, Gemini, and Redis that ingests PDFs, DOCX, text,
  Markdown, and OCR-enabled images.
- Delivered source-based summaries, key concepts, interactive practice,
  translation, multilingual audio, and JSON/Markdown/PDF exports in one
  account-scoped learning product.
- Engineered production-oriented safeguards: verified identity, distributed
  rate limits, audit events, health checks, scheduled retention, documented
  backup/recovery, and automated unit, type, lint, build, and browser checks.

**Evidence:** [repository README](https://github.com/Shubham080802/MindForge#readme),
[authentication middleware](https://github.com/Shubham080802/MindForge/blob/main/middleware.ts),
and [operational-readiness evidence](https://github.com/Shubham080802/MindForge/blob/main/ops/OPERATIONAL_EVIDENCE_2026-09-09.md).

### 2. [Interview Copilot](https://github.com/Shubham080802/interview-copilot)

- Developed an AI mock-interview platform that imports job postings and resumes,
  researches target companies, creates adaptive interview plans, and evaluates
  every answer with actionable coaching and study plans.
- Implemented real-time video, speech-to-text, browser code execution, adaptive
  follow-ups, and persistent cross-interview learning using TypeScript,
  Next.js, SQLite/hosted Postgres, and Anthropic structured outputs.
- Added a differentiated integrity layer: camera/face checks, focus and paste
  signals, voice enrollment and nearby-speaker detection, auditable event logs,
  and privacy-aware audio-only recordings; also provided an offline demo mode.

**Evidence:** [repository README](https://github.com/Shubham080802/interview-copilot#readme)
(architecture, AI flow, data handling, testing, and deployment sections).

### 3. [Golden Hour Rash](https://github.com/Shubham080802/golden-hour-rash)

- Built and packaged a playable Python motorcycle-combat racing prototype with
  seeded procedural roads, rival AI, traffic, combat, local records,
  achievements, gamepad support, and four distinct environments.
- Implemented a pseudo-3D rendering and procedural-audio pipeline from runtime
  primitives rather than external art or sound assets; added performance-quality
  tiers and automatic degradation to sustain playability.
- Used headless smoke and behavior/layout audits plus bot-run measurements to
  tune traffic, difficulty, survival length, and frame-time tradeoffs.

**Evidence:** [repository README](https://github.com/Shubham080802/golden-hour-rash#readme)
(technical notes, measured tuning, build, and audit sections).

## Analyst / data / business-analyst resume — top 3

### 1. [Software Fault Prediction using VAE](https://github.com/Shubham080802/software-fault-prediction-vae)

- Built an end-to-end Python fault-prediction pipeline using a PyTorch
  variational autoencoder to synthesize minority-class software-module examples
  and address class imbalance.
- Benchmarked Random Forest, KNN, SVM, and entropy-based decision trees before
  and after balancing, reporting precision/recall/F1/accuracy to compare model
  tradeoffs.
- Automated data loading, preprocessing, reproducible CLI configuration, a
  fallback benchmark dataset, and visual class-distribution/performance charts
  across 20 software-quality metrics.

**Evidence:** [repository README](https://github.com/Shubham080802/software-fault-prediction-vae#readme)
and [pipeline entry point](https://github.com/Shubham080802/software-fault-prediction-vae/blob/main/main.py).

### 2. [Interview Copilot](https://github.com/Shubham080802/interview-copilot)

- Designed answer-, round-, and interview-level scoring workflows that turn
  transcripts and interview history into strengths/weaknesses, communication
  analysis, recommendations, and personalized action plans.
- Produced exportable JSON, Markdown, HTML/PDF, and audio artifacts plus
  integrity timelines, enabling longitudinal review and auditable coaching
  decisions.
- Combined structured AI outputs with a local demo scoring path, enabling
  comparable evaluation flows when the hosted model is unavailable.

**Evidence:** [evaluation and exports in README](https://github.com/Shubham080802/interview-copilot#what-it-does),
[AI workflow documentation](https://github.com/Shubham080802/interview-copilot#how-the-ai-is-used).

### 3. [MindForge](https://github.com/Shubham080802/MindForge)

- Built a source-grounded analysis workspace that turns private multi-format
  materials into structured summaries, key concepts, interactive practice,
  translations, and exportable JSON/Markdown/PDF artifacts.
- Designed account-scoped search, source downloads, audit events, retention,
  and health/readiness checks—useful evidence of governed information workflows
  and operational reporting discipline.
- Combined document extraction/OCR, source-grounded tutoring, and user
  preferences to make complex study material analyzable and actionable.

**Evidence:** [repository README](https://github.com/Shubham080802/MindForge#readme),
[security description](https://github.com/Shubham080802/MindForge/blob/main/app/security/page.tsx),
and [operational-readiness evidence](https://github.com/Shubham080802/MindForge/blob/main/ops/OPERATIONAL_EVIDENCE_2026-09-09.md).

## Selection rationale

For software/AI-product applications, prioritize projects that demonstrate a
complete user-facing system, integration depth, reliability, and security:
MindForge first, then Interview Copilot. Golden Hour Rash is the best third
example of independent systems and product execution. For analyst roles, lead
with the VAE project because it explicitly handles data preparation, imbalance,
model comparison, metrics, and visualization; use the other two to show applied
scoring, longitudinal decision support, governed information processing, and
exportable analysis artifacts. Golden Hour Rash is a strong optional fourth for
roles that value experiment-driven product tuning or Python systems work.

Do not claim externally validated business impact, adoption, accuracy gains, or
deployment scale unless you can supply independent evidence. The bullets above
describe repository-supported implementation scope.
