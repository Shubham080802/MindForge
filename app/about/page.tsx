import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Mic, Zap, Shield, ArrowRightLeft, Users, Lock, Code, Globe } from "lucide-react";
import { UserDropdown } from "@/components/ui/user-dropdown";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-xl">
            <span className="text-primary">Mind</span>
            <span className="text-foreground">Forge</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <UserDropdown />
          </nav>
        </div>
      </header>

      <main className="py-16 md:py-24">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>

            <div className="text-center mb-16">
              <Link href="/" className="inline-flex items-center gap-2 font-semibold text-3xl mb-6">
                <span className="text-primary">Mind</span>
                <span className="text-foreground">Forge</span>
              </Link>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">About MindForge</h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                An AI-powered study assistant that helps you learn faster with multimodal understanding.
                Upload documents, images, or diagrams and get detailed explanations with multilingual voice playback.
              </p>
            </div>

            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-8">Key Applications</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <FeatureCard icon={BookOpen} title="Document Analysis" description="Upload PDFs, Word docs, or Markdown files. Extract and understand text, tables, and structured content." />
                <FeatureCard icon={Mic} title="Multilingual Voice" description="Listen to explanations in 50+ languages with natural-sounding voices. Adjust speed, pitch, and voice style." />
                <FeatureCard icon={Zap} title="Image Understanding" description="Analyze diagrams, charts, handwritten notes, and screenshots. Get detailed visual descriptions." />
                <FeatureCard icon={Shield} title="Contextual Chat" description="Chat with an AI that remembers your uploaded materials and conversation history across sessions." />
                <FeatureCard icon={Users} title="Collaborative Learning" description="Share materials and chat sessions with study groups. Learn together with AI assistance." />
                <FeatureCard icon={Globe} title="Web Research" description="Search and integrate web content into your study materials with proper citations." />
              </div>
            </section>

            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-8">How to Use</h2>
              <div className="space-y-4">
                <StepCard number="01" title="Create an Account" description="Sign up with email or use Google/GitHub OAuth for quick access." icon={Users} />
                <StepCard number="02" title="Upload Materials" description="Drag & drop PDFs, images, or paste text. Support for documents, handwritten notes, diagrams, and screenshots." icon={ArrowRightLeft} />
                <StepCard number="03" title="Get Explanations" description="Receive detailed, structured breakdowns with key concepts, visual descriptions, and multilingual audio playback." icon={BookOpen} />
                <StepCard number="04" title="Chat & Learn" description="Ask follow-up questions in a contextual chat. The AI remembers your material and conversation history." icon={Mic} />
                <StepCard number="05" title="Practice & Test" description="Generate quizzes and practice questions from your materials. Track your progress over time." icon={Zap} />
                <StepCard number="06" title="Share & Collaborate" description="Share study sessions with peers. Export notes and summaries for offline review." icon={Globe} />
              </div>
            </section>

            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-8">Privacy & Security</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <FeatureCard icon={Lock} title="Data Encryption" description="All data is encrypted at rest and in transit. Your materials are never used for training." />
                <FeatureCard icon={Code} title="Open Source" description="Core components are open source. Transparency builds trust in how your data is handled." />
                <FeatureCard icon={Shield} title="Local Processing" description="Sensitive documents can be processed locally with on-device models for maximum privacy." />
              </div>
            </section>

            <div className="text-center border-t pt-8">
              <p className="text-muted-foreground">
                Built with care by <span className="font-medium">Shubham Kumar</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Powered by Next.js, React, TypeScript, and OpenAI
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-12 bg-muted/30">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t pt-8">
            <p className="text-sm text-muted-foreground">
              &copy; 2026 MindForge. All rights reserved.
            </p>
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
    <div className="flex gap-4 p-4 rounded-xl bg-card border border-border">
      <div className="flex-shrink-0 w-10 h-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg">
        {number}
      </div>
      <div className="flex-shrink-0 w-12 h-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}