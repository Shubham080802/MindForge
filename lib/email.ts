import nodemailer from "nodemailer";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured before sending email`);
  return value;
}

function mailer() {
  const port = Number(required("EMAIL_SERVER_PORT"));
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("EMAIL_SERVER_PORT must be a valid TCP port");
  }

  return nodemailer.createTransport({
    host: required("EMAIL_SERVER_HOST"),
    port,
    secure: process.env.EMAIL_SERVER_SECURE === "true",
    auth: {
      user: required("EMAIL_SERVER_USER"),
      pass: required("EMAIL_SERVER_PASSWORD"),
    },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

export async function sendVerificationCode(to: string, code: string) {
  await mailer().sendMail({
    from: required("EMAIL_FROM"),
    to,
    subject: "Your MindForge verification code",
    text: `Your MindForge verification code is ${code}. It expires in 15 minutes.`,
    html: `<p>Your MindForge verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${escapeHtml(code)}</p><p>It expires in 15 minutes.</p>`,
  });
}

export async function sendPasswordReset(to: string, resetUrl: string) {
  await mailer().sendMail({
    from: required("EMAIL_FROM"),
    to,
    subject: "Reset your MindForge password",
    text: `Reset your MindForge password: ${resetUrl}\n\nThis link expires in one hour.`,
    html: `<p>Reset your MindForge password by opening this link:</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p><p>This link expires in one hour.</p>`,
  });
}
