import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Mic, Zap, Shield, ArrowRightLeft, Info } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-xl">
            <span className="text-primary">Mind</span>
            <span className="text-foreground">Forge</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <Info className="h-4 w-4" />
              About
            </Link>
            <Link href="/auth/signin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/auth/signup" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <div className="relative container px-4">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Now with Multimodal AI & Voice
              </div>
              <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground text-balance">
                Your AI Study Assistant
                <br />
                <span className="text-primary">That Sees, Reads & Speaks</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Upload documents, images, or diagrams. Get detailed multimodal explanations with 
                multilingual voice playback. Chat with an AI that remembers your context.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-md px-8 gap-2"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 rounded-md px-8"
                >
                  Watch Demo
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-muted/30">
          <div className="container px-4">
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              <FeatureCard
                icon={BookOpen}
                title="Multimodal Input"
                description="Upload PDFs, images, diagrams, or type directly. Our AI processes text, handwriting, and visual content seamlessly."
              />
              <FeatureCard
                icon={Mic}
                title="Multilingual Voice"
                description="Listen to explanations in 50+ languages with natural-sounding voices. Adjust speed, pitch, and voice style."
              />
              <FeatureCard
                icon={Zap}
                title="Contextual Memory"
                description="Chat with an AI that remembers your uploaded materials and conversation history across sessions."
              />
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container px-4">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How It Works</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Three simple steps to transform your study materials into interactive learning experiences.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              <StepCard
                number="01"
                title="Upload Materials"
                description="Drag & drop PDFs, images, or paste text. Support for documents, handwritten notes, diagrams, and screenshots."
                icon={ArrowRightLeft}
              />
              <StepCard
                number="02"
                title="Get Explanations"
                description="Receive detailed, structured breakdowns with key concepts, visual descriptions, and multilingual audio playback."
                icon={BookOpen}
              />
              <StepCard
                number="03"
                title="Chat & Learn"
                description="Ask follow-up questions in a contextual chat. The AI remembers your material and conversation history."
                icon={Shield}
              />
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-muted/30">
          <div className="container px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Ready to Transform Your Learning?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Join thousands of students and professionals using MindForge to master complex topics faster.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-md px-8 gap-2"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 rounded-md px-8"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-muted/30">
        <div className="container px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center gap-2 font-semibold text-xl">
                <span className="text-primary">Mind</span>
                <span className="text-foreground">Forge</span>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground max-w-xs">
                AI-powered study assistant that helps you learn faster with multimodal understanding.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">API Docs</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Terms</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Security</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t pt-8">
<p className="text-sm text-muted-foreground">
                &copy; 2026 MindForge. All rights reserved.
              </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.804 2.807 1.28 3.499.977.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.305-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="group relative p-6 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description, icon: Icon }: { number: string; title: string; description: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="relative p-6 rounded-xl bg-card border border-border">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg">
        {number}
      </div>
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}