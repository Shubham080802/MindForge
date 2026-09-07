export function isSessionVersionCurrent(tokenVersion: unknown, currentVersion: number) {
  return typeof tokenVersion === "number" && tokenVersion === currentVersion;
}
