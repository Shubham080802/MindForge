import crypto from "node:crypto";

function signingKey() {
  const key = process.env.NEXTAUTH_SECRET;
  if (!key) throw new Error("NEXTAUTH_SECRET is required for authentication tokens");
  return key;
}

function digest(value: string) {
  return crypto.createHmac("sha256", signingKey()).update(value).digest("hex");
}

export function digestVerificationCode(email: string, code: string) {
  return digest(`verify:${email}:${code}`);
}

export function digestResetToken(token: string) {
  return digest(`reset:${token}`);
}
