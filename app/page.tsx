"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, FileSearch, Info, Mic, ShieldCheck } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { DarkModeToggle } from "@/components/ui/dark-mode-toggle";
import { UserDropdown } from "@/components/ui/user-dropdown";

const features = [
  {
    icon: FileSearch,
    title: "Source-grounded study",
    description: "Upload PDF, DOCX, text, Markdown, or common image files. MindForge extracts readable text and keeps answers anchored to your session materials.",
  },
  {
    icon: BookOpen,
    title: "Focused learning tools",
    description: "Turn a session into summaries, key concepts, flashcards, quizzes, study plans, and translations without leaving the workspace.",
  },
  {
    icon: Mic,
    title: "Voice playback",
    description: "Generate natural OpenAI speech for supported study responses and download your session or generated study aids for offline review.",
  },
];

export default function HomePage() {
  const { isSignedIn } = useAuth();
  const primaryHref = isSignedIn ? "/workspace" : "/auth/signup";
  const primaryLabel = isSignedIn ? "Open workspace" : "Create an account";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-1 text-xl font-semibold">
            <span className="text-primary">Mind</span><span>Forge</span>
          </Link>
          <nav className="flex items-center gap-4">
            {isSignedIn && <Link href="/library" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">Library</Link>}
            <Link href="/about" className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:flex">
              <Info className="h-4 w-4" /> About
            </Link>
            <DarkModeToggle />
            <UserDropdown />
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
          <div className="container relative px-4">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <ShieldCheck className="h-4 w-4" /> Private, source-grounded study sessions
              </div>
              <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
                Understand your material.<br /><span className="text-primary">Study with momentum.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                Bring your notes and documents into one focused workspace. Ask questions, generate study aids, listen to explanations, and keep every session organized.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href={primaryHref} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  {primaryLabel}<ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/about" className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent">
                  Explore features
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted/30 py-20 md:py-28">
          <div className="container grid gap-6 px-4 md:grid-cols-3 lg:gap-8">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-lg">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div>
                <h2 className="mb-2 text-lg font-semibold">{title}</h2>
                <p className="leading-relaxed text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Build your next study session</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">Create a private workspace, add your source material, and start asking better questions.</p>
            <Link href={primaryHref} className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {primaryLabel}<ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/30 py-10">
        <div className="container flex flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="text-lg font-semibold"><span className="text-primary">Mind</span>Forge</Link>
            <p className="mt-2 text-sm text-muted-foreground">Private AI-assisted study from your own materials.</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/support" className="hover:text-foreground">Support</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/security" className="hover:text-foreground">Security</Link>
            <Link href="https://github.com/Shubham080802/MindForge" className="hover:text-foreground">GitHub</Link>
          </nav>
          <p className="text-sm text-muted-foreground">© 2026 MindForge</p>
        </div>
      </footer>
    </div>
  );
}
