export type SessionClaims = {
  id?: unknown;
  sessionVersion?: unknown;
  name?: unknown;
  email?: unknown;
  picture?: unknown;
  revoked?: unknown;
};

export function reconcileSessionIdentity(
  claims: SessionClaims,
  currentVersion: number | null,
  issuing = false,
) {
  if (typeof claims.id !== "string" || currentVersion === null) return null;
  const version = issuing ? currentVersion : claims.sessionVersion;
  if (typeof version !== "number" || version !== currentVersion) return null;
  return { id: claims.id, sessionVersion: version };
}

export function revokeSessionClaims(claims: SessionClaims) {
  delete claims.id;
  delete claims.sessionVersion;
  delete claims.name;
  delete claims.email;
  delete claims.picture;
  claims.revoked = true;
}
