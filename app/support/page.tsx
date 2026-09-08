import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export default function SupportPage() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return <LegalPage title="Support">
    <p>
      For account access, privacy requests, bug reports, or security concerns, {email
        ? <>email <a href={`mailto:${email}`}>{email}</a></>
        : <a href="https://github.com/Shubham080802/MindForge/issues/new">open a private-data-free support request on GitHub</a>}.
    </p>
    <h2>What to include</h2><ul><li>The page or feature involved.</li><li>What you expected and what happened.</li><li>The approximate time and your browser or device.</li><li>No passwords, verification codes, API keys, or sensitive source material.</li></ul>
    <h2>Self-service</h2><p>Use <Link href="/settings">Settings</Link> to update your profile or delete your account. Sessions can be renamed or deleted from the Library.</p>
  </LegalPage>;
}
