import { LegalPage } from "@/components/legal-page";

export default function SecurityPage() {
  return <LegalPage title="Security">
    <h2>Current safeguards</h2><ul><li>Account-scoped database queries for sessions, messages, exports, and materials.</li><li>Hashed, expiring, single-use verification and password-reset tokens.</li><li>Same-origin enforcement for browser mutations and distributed production rate limits.</li><li>Private source downloads, security headers, structured error reporting, and audit events.</li><li>Production readiness checks covering the database and required runtime configuration.</li></ul>
    <h2>Reporting a vulnerability</h2><p>Do not disclose suspected vulnerabilities publicly. Send reproduction steps and impact details to the address on the Support page. Avoid accessing or changing data that is not yours.</p>
    <h2>Scope</h2><p>No system is completely secure. Deployment operators remain responsible for TLS, secret management, database backups, provider access controls, alerting, and timely dependency updates.</p>
  </LegalPage>;
}
