# Dependency licenses

- MindForge's own source is MIT (`LICENSE`). This document records the terms of everything it depends on.
- `pnpm licenses:check` enforces the conclusions below and runs in `pnpm validate` and in the Quality workflow beside `pnpm audit:prod`. A dependency arriving under unreviewed terms fails the build rather than landing silently.
- Audit of 2026-09-28 covered 253 production packages (514 including development): 209 MIT, 22 Apache-2.0, 7 ISC, 6 BSD-2-Clause, 2 BSD-3-Clause, and the individually reviewed entries below.
- The check reads **declared** license metadata. A package that misdeclares itself is not detected; the exceptions below were confirmed by reading the license text in the installed package.

## Reviewed exceptions

- `@img/sharp-libvips-*` is **LGPL-3.0-or-later**. It is the prebuilt libvips binary that `sharp` loads for Next.js image optimization; the `sharp` wrapper itself is Apache-2.0. LGPL obligations attach to conveying the library, and MindForge is a hosted service — users receive rendered output over the network, never the binary. The terms are satisfied without further action while that remains true. **Revisit before shipping MindForge as a downloadable desktop build or an on-prem deployment**, where the binary would be conveyed and would have to stay relinkable.
- `duck` declares a bare `BSD`, which is not valid SPDX and therefore matches no license rule. Its `LICENSE` file is BSD-2-Clause verbatim (no advertising clause, no third clause). It reaches the tree through `mammoth`, used for DOCX ingestion.
- `jszip` is `(MIT OR GPL-3.0-or-later)`. Dual-licensed at the recipient's election; MindForge elects MIT.
- `pako` is `(MIT AND Zlib)`. Both halves are permissive.
- `caniuse-lite` is **CC-BY-4.0**. It is a browser-support data file consumed by browserslist during the build and never served to clients. Attribution only.
- `axe-core` and `lightningcss` are **MPL-2.0** and are development-only, absent from the production tree. MPL copyleft is file-scoped in any case: it reaches modifications to those files, not code that imports them.

## Operating notes

- The per-platform `@img/sharp-libvips-*` and `@img/sharp-*` binaries differ between a developer laptop and CI, so `scripts/check-licenses.mjs` matches them by name prefix rather than by exact package.
- `autoInstallPeers` is enabled, so packages satisfying an optional peer dependency of `next` (Playwright, for instance) appear inside the production graph. The check is deliberately over-inclusive here: reviewing a package that never ships is cheap, missing one that does is not.
- Widening the allowlist in `scripts/check-licenses.mjs` is not the default response to a failure. Read the new package's license text, decide whether the terms are acceptable for a hosted service, then either record the exception with its reason or remove the dependency.
- This is an engineering review, not legal advice. Outside investment or enterprise procurement will expect a generated SBOM rather than this file.
