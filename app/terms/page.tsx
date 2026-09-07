import { LegalPage } from "@/components/legal-page";

export default function TermsPage() {
  return <LegalPage title="Terms of Service">
    <h2>Using MindForge</h2><p>You must provide accurate account information, keep your credentials secure, and use the service only where lawful. You may upload only material you have the right to process.</p>
    <h2>Acceptable use</h2><p>Do not attempt to bypass access controls, disrupt the service, abuse provider quotas, upload malicious content, or use generated output to violate another person&apos;s rights.</p>
    <h2>AI limitations</h2><p>Generated answers may be inaccurate, incomplete, or unsuitable for your situation. Verify important information against primary sources. MindForge does not provide medical, legal, financial, or other professional advice.</p>
    <h2>Your content</h2><p>You retain rights in content you upload. You grant the limited permission needed to store, extract, and send that content to configured processors so MindForge can provide requested features.</p>
    <h2>Availability and termination</h2><p>The service may change, experience interruptions, or suspend accounts that create security or legal risk. You can stop using MindForge and delete your account at any time.</p>
    <h2>Contact</h2><p>Questions about these terms can be sent through the Support page.</p>
  </LegalPage>;
}
