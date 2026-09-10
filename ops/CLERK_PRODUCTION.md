# Clerk production cutover

MindForge currently authenticates through a Clerk **development** instance.
Every visitor sees a "Development mode" badge on the sign-in card, development
instances carry strict usage limits, and Google sign-in runs on credentials
Clerk shares between all development apps. This document is the procedure for
moving to a production instance.

## Prerequisite you cannot skip

Clerk's deployment guide opens with two requirements:

> You will need to have a domain you own.
> You will need to be able to add DNS records on your domain.

The project's only domain today is `mind-forge-ashy.vercel.app`. Vercel owns
the `vercel.app` DNS zone, so the `clerk.*` and `accounts.*` CNAMEs and the DKIM
records Clerk requires **cannot be created**. Creating the production instance
before you own a domain just yields DNS records you can never satisfy.

Buy a domain first — the Vercel project's **Settings → Domains** page has a
**Buy** button, or bring one from any registrar. Everything below assumes
`example.com` as a placeholder for that domain.

## Already done

- Clerk application renamed from "My Application" to **MindForge**, so
  verification emails and Clerk components carry the product name.
- Email verification is required at sign-up on the development instance, and
  clones into production.
- `authorizedParties` is wired into `clerkMiddleware()` via
  `lib/clerk-authorized-parties.ts` and resolves from the environment. Setting
  `CLERK_AUTHORIZED_PARTIES` at cutover is all that is needed.

## Cutover

### 1. Point the domain at Vercel

Add the domain under **Settings → Domains**, apply the DNS records Vercel
shows, and wait for it to verify. Confirm `https://example.com` serves the app
and `/api/health` returns HTTP 200 before touching Clerk.

### 2. Create the production instance

In the Clerk Dashboard, open the environment dropdown at the top and choose
**Create production instance**, then **Clone development instance** so the
authentication and theme settings carry over.

Clerk does **not** copy three things. Plan to set each again:

- SSO connections
- Integrations
- Paths

### 3. Add the Clerk DNS records

Clerk Dashboard → **Domains** lists the exact records. Apply them at your DNS
provider, then let Clerk verify. Three traps:

- **Cloudflare proxying breaks verification.** Set each Clerk record to
  "DNS only" (grey cloud), not proxied.
- **CAA records can stall certificate issuance.** Check with
  `dig example.com +short CAA`. An empty response is correct; any output must
  permit Let's Encrypt or Google Trust Services.
- Propagation can take up to 48 hours, though it is usually far faster.

When every requirement is met, a **Deploy certificates** button appears on the
dashboard home. Select it.

### 4. Create your own Google OAuth credentials

The sign-in card offers "Continue with Google". In development that uses
Clerk's shared OAuth credentials, which Clerk states are not secure for
production. Create a Google Cloud OAuth client, add the redirect URI Clerk
shows for the production instance, and enter the client ID and secret in
Clerk's Google SSO connection.

Test Google sign-in explicitly after cutover — this is the single most common
thing to break, because it silently keeps working in development.

### 5. Install the production keys in Vercel

From the production instance's **API keys** page, copy the values and set them
on the Vercel project's **Production** environment:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
| `CLERK_SECRET_KEY` | `sk_live_...` |
| `CLERK_AUTHORIZED_PARTIES` | `https://example.com,https://www.example.com` |
| `NEXT_PUBLIC_APP_URL` | `https://example.com` |

Leave `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `..._SIGN_UP_URL`, and the two
`..._FALLBACK_REDIRECT_URL` values as they are; they are paths, not hosts.

`runtimeReadiness()` checks that the publishable key starts with `pk_` and the
secret with `sk_`, so `/api/health` will report a configuration failure if
either is pasted incorrectly. That check is the safety net — read it after
deploying rather than assuming.

Redeploy. Environment variables do not apply to an existing deployment.

### 6. Keep development keys where they belong

Two places must keep using **development** keys, because Clerk's testing tokens
only work against development instances:

- GitHub Actions secrets `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, which
  the Quality workflow's Playwright job needs. Adding them is what turns that
  job green; it is currently the only failing step.
- The authenticated staging run, `pnpm test:e2e:staging`.

Pointing either at production keys will break them.

## Verify after cutover

Run these against the production domain and record the results.

| Check | Expected |
| --- | --- |
| `curl -s https://example.com/api/health` | `{"status":"ok"}` with database and configuration `ok` |
| Sign-in card | No "Development mode" badge |
| Browser console on `/auth/signin` | No errors, no CSP violations |
| Sign up with a fresh address | Verification code required before the account works |
| Google sign-in | Completes on your own OAuth credentials |
| Existing account sign-in | Reaches `/workspace` with sessions intact |
| `curl -s https://example.com/api/sessions` | HTTP 401 `{"message":"Unauthorized"}` |
| `curl -so /dev/null -w '%{http_code}' https://example.com/workspace` | 307 to `/auth/signin` |
| Sign out | Returns to `/` and protected APIs go back to 401 |
| Response headers | CSP present with `frame-ancestors 'none'` and `img-src ... data:` |

## Existing users

The internal user record links to Clerk through `clerkId`, and first sign-in
links by verified primary email (`lib/clerk-user.ts`). Accounts created against
the development instance have **different Clerk user IDs** than production. A
returning learner signing in to the production instance for the first time is
matched by their verified email and keeps their study data; the stale
development `clerkId` is overwritten.

Verify this with a real account before announcing the cutover. If study data
appears missing for a returning user, that link is the first thing to check.

## Rollback

Production and development instances coexist, so rollback is reverting the
Vercel environment variables to the `pk_test_` / `sk_test_` pair and
redeploying. Nothing in Clerk needs to be deleted. Keep the development
instance for as long as CI and staging depend on it.
