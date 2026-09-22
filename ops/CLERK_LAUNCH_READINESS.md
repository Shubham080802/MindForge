# Clerk launch readiness

Last verified: 2026-09-21 (America/Los_Angeles)

This record distinguishes controls that have been exercised from production
provisioning that still requires an interactive Clerk decision. It contains no
credential values or learner data.

## Completed

- The formerly accountless Clerk development application was claimed and
  linked to the MindForge GitHub repository.
- `clerk doctor --json` confirmed that the Clerk CLI is authenticated, the
  application is reachable, and the local environment contains a matched pair
  of development-instance keys.
- Development keys were added to GitHub Actions as
  `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Production keys must never
  replace these testing credentials.
- A protected GitHub `staging` environment now targets the canonical Vercel
  deployment and contains the development Clerk credentials plus the
  disposable end-to-end learner identity. Secret values are not recorded here.
- [Quality run 35680811672](https://github.com/Shubham080802/MindForge/actions/runs/35680811672)
  was rerun after adding the secrets and passed every gate, including database
  migrations, unit tests, type checking, linting, production build, dependency
  audit, and the public Playwright suite.
- Clerk's development configuration has bot protection, PII protection,
  password breach checking, device trust, and a ten-attempt/60-minute user
  lockout enabled. Sessions have a seven-day maximum lifetime and do not allow
  multiple simultaneous sessions.
- Passkey sign-in and optional authenticator-app MFA with backup codes are
  enabled on the development instance. MindForge Settings exposes Clerk's
  account-security surface so learners can enroll and manage those factors.
- Application routes use Clerk middleware for protected pages and APIs. API
  requests receive HTTP 401 instead of an HTML redirect, and browser-initiated
  mutations pass through the shared authenticated/same-origin request guard.
- Account controls remain available from both Workspace and Library, so a
  learner can sign out without navigating back through a study session.
- Commit `d33c107` is deployed at
  <https://mind-forge-ashy.vercel.app>. The live Settings security screen was
  exercised in a real browser and exposed passkey enrollment, authenticator
  two-step verification, backup-code recovery, password, active-device, and
  account-deletion controls.
- [Quality run 35684677044](https://github.com/Shubham080802/MindForge/actions/runs/35684677044)
  passed both jobs against that commit. The general job passed dependency
  audit, migrations, 220 unit tests, type checking, linting, production build,
  and public Playwright tests. The protected staging job passed sign-in,
  security-control discovery, session creation, grounded chat, study-tool use,
  export/download, session deletion, sign-out, and protected-route rejection.

## Production-instance checkpoint

The linked application does not yet have a Clerk production instance. The
read-only `clerk deploy --mode agent` check reports `state: not_started`. The
interactive wizard was inspected and correctly stopped before mutation because
it requires an operator-owned custom domain, DNS access, and production Google
OAuth credentials. A `vercel.app` hostname is not a substitute for an owned
domain in this cutover. Once those inputs exist, run this from the repository
root:

```bash
corepack pnpm dlx clerk@latest deploy
```

After the wizard finishes, verify the production domain and OAuth state with:

```bash
corepack pnpm dlx clerk@latest deploy status --mode agent
```

Then pull the production keys to a temporary local file, update only the
Vercel Production environment, redeploy, and exercise sign-up, sign-in,
sign-out, protected-route rejection, and account deletion against the canonical
production URL. Keep the development keys in GitHub Actions and in any future
staging environment.

## Remaining controls

Handle these independently so a configuration change can be attributed and
rolled back cleanly:

1. Obtain an operator-owned MindForge domain, DNS access, and production Google
   OAuth credentials, then create and verify the Clerk production instance.
2. Confirm the legal operator identity, governing jurisdiction, minimum learner
   age, and durable legal contact. Review the existing Terms and Privacy pages
   with those details before enabling Clerk's legal-consent requirement.
3. After production cutover, repeat the authenticated learner journey using a
   dedicated production smoke-test identity and retain the run as evidence.
4. Exercise an actual passkey enrollment and authenticator recovery ceremony on
   a disposable account. The controls are present and tested for discoverability,
   but enrolling a factor changes the human operator's account and is therefore
   intentionally not automated.
