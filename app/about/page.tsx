import Link from "next/link";
import { BookOpen, Download, FileSearch, Mic, ShieldCheck, Sparkles } from "lucide-react";

const capabilities = [
  [FileSearch, "Material extraction", "Extract text from PDF, DOCX, Markdown, plain text, and common image formats using OCR."],
  [Sparkles, "Contextual tutor", "Ask questions against the material and conversation history stored in a private study session."],
  [BookOpen, "Study tools", "Generate summaries, key concepts, flashcards, quizzes, study plans, and translations."],
  [Mic, "Speech", "Listen to supported responses using your browser's built-in speech engine."],
  [Download, "Exports", "Download source files and export sessions or individual study-tool results."],
  [ShieldCheck, "Owned data", "Every session and material lookup is scoped to the signed-in account."],
] as const;

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b"><div className="container flex h-16 items-center justify-between px-4"><Link href="/" className="text-xl font-semibold"><span className="text-primary">Mind</span>Forge</Link><Link href="/workspace" className="text-sm text-primary hover:underline">Open workspace</Link></div></header>
      <main className="container px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">About MindForge</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">A focused study workspace built around your sources.</h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">MindForge combines private material storage, contextual AI chat, focused learning tools, voice playback, search, and export in one account-based workspace.</p>
          </div>
          <section>
            <h2 className="mb-6 text-2xl font-semibold">Available today</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {capabilities.map(([Icon, title, description]) => <article key={title} className="rounded-xl border bg-card p-6"><Icon className="mb-4 h-6 w-6 text-primary" /><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></article>)}
            </div>
          </section>
          <section className="mt-14 rounded-xl border bg-muted/30 p-6">
            <h2 className="text-xl font-semibold">Responsible use</h2>
            <p className="mt-2 text-muted-foreground">AI output can be incomplete or incorrect. Verify important claims against your original sources and do not use MindForge as a substitute for professional advice.</p>
            <div className="mt-4 flex gap-4 text-sm"><Link href="/privacy" className="text-primary hover:underline">Privacy</Link><Link href="/security" className="text-primary hover:underline">Security</Link><Link href="/support" className="text-primary hover:underline">Support</Link></div>
          </section>
        </div>
      </main>
    </div>
  );
}
