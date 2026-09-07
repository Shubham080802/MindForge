import { LegalPage } from "@/components/legal-page";

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy">
    <h2>What MindForge processes</h2><p>MindForge stores the account details you provide, study sessions, messages, uploaded source files, extracted text, generated study aids, and security audit events. Operational logs may include request paths, timestamps, and error details.</p>
    <h2>Why data is processed</h2><p>Data is used to authenticate your account, provide study features, secure the service, diagnose failures, prevent abuse, and respond to support requests. MindForge does not sell personal information.</p>
    <h2>Processors</h2><p>Configured hosting, PostgreSQL, email, Redis, and OpenAI providers process data only to operate the service. Uploaded text and prompts are sent to the configured OpenAI account when you use AI or speech features.</p>
    <h2>Retention and deletion</h2><p>Your study data remains until you delete the associated session or account. Expired authentication tokens are removed by scheduled maintenance. Security audit events are retained for the configured audit-retention period, normally 365 days. Account deletion removes account-owned sessions, messages, and materials.</p>
    <h2>Your choices</h2><p>You can download session output, delete sessions, or delete your account from Settings. Contact support to request access, correction, or assistance with deletion.</p>
    <h2>Security and contact</h2><p>See the Security page for implemented safeguards. Questions can be sent to the address on the Support page.</p>
  </LegalPage>;
}
