import crypto from "node:crypto";

export function hasValidBearerSecret(authorization: string | null, configured: string | undefined) {
  const supplied = authorization?.replace(/^Bearer\s+/i, "");
  if (!configured || !supplied) return false;

  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
