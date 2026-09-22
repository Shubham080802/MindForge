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

## Production-instance checkpoint

The linked application does not yet have a Clerk production instance. The
read-only `clerk deploy --mode agent` check reports `state: not_started` and
requires Clerk's interactive production-deployment wizard. Run this from the
repository root:

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

## Subsequent controls

Handle these independently after the production instance is healthy so a
configuration change can be attributed and rolled back cleanly:

1. Exercise passkey enrollment and authenticator recovery in a real browser.
2. Add real Terms of Service and Privacy Policy URLs before enabling Clerk's
   legal-consent requirement.
3. Create a dedicated staging URL and configure the authenticated Playwright
   job with a development-instance test user.
4. Re-run the full authenticated learner journey and retain the GitHub Actions
   result as launch evidence.
