/**
 * Clerk verifies session tokens without checking who asked unless it is given
 * an allowlist. Without one, any app on a sibling subdomain that is compromised
 * can mint sessions accepted here, and cross-origin callers are not filtered.
 * Clerk's deployment guide calls this out explicitly.
 *
 * The list is resolved from the environment so it follows the app from the
 * current *.vercel.app host to a future custom domain without a code change.
 * Resolving to an empty list preserves Clerk's default behaviour, so a missing
 * variable degrades to today's posture rather than locking anyone out.
 */

type AuthorizedPartiesEnvironment = Record<string, string | undefined>;

function toOrigin(value: string): string | undefined {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return undefined;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(candidate).origin;
  } catch {
    return undefined;
  }
}

export function resolveAuthorizedParties(env: AuthorizedPartiesEnvironment): string[] {
  const configured = env.CLERK_AUTHORIZED_PARTIES?.split(",") ?? [];

  // Vercel sets these automatically, so the allowlist is correct on the current
  // deployment with no extra setup. VERCEL_URL is the deployment's own
  // hostname, which keeps preview deployments able to authenticate themselves.
  const fallback = configured.length
    ? []
    : [
        env.VERCEL_PROJECT_PRODUCTION_URL,
        env.VERCEL_URL,
        env.NEXT_PUBLIC_APP_URL,
      ].filter((value): value is string => Boolean(value));

  const origins = [...configured, ...fallback]
    .map(toOrigin)
    .filter((origin): origin is string => Boolean(origin));

  return [...new Set(origins)];
}
