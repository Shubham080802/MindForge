"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function AboutDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 px-3 py-1.5 rounded-md"
          aria-label="About MindForge"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span className="hidden sm:inline">About</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <DialogTitle className="text-lg font-semibold">About MindForge</DialogTitle>
          </div>
          <DialogDescription className="mt-1">
            Your AI-powered study assistant for smarter learning
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4 max-h-[60vh] overflow-y-auto">
          <section>
            <h3 className="text-lg font-semibold mb-3">About MindForge</h3>
            <p className="text-muted-foreground leading-relaxed">
              MindForge is an AI-powered study assistant designed to transform how you learn and retain information. 
              By leveraging advanced multimodal AI capabilities, MindForge helps you upload, organize, and interact 
              with your study materials in ways that were never before possible. Whether you&apos;re a student preparing 
              for exams, a professional upskilling, or a lifelong learner, MindForge adapts to your learning style 
              and helps you master complex topics faster.
            </p>
          </section>

          <section className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Key Applications</h3>
            <ul className="space-y-3 text-muted-foreground text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">\u2022</span>
                <span dangerouslySetInnerHTML={{ __html: '<strong>Document Analysis:</strong> Upload PDFs, images, diagrams, or text documents. MindForge extracts and understands text, handwriting, diagrams, and visual content.' }} />
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">\u2022</span>
                <span dangerouslySetInnerHTML={{ __html: 'Grounded Q&A: Ask questions about your materials and receive detailed, grounded explanations with source citations from your uploaded content.' }} />
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">\u2022</span>
                <span dangerouslySetInnerHTML={{ __html: 'Adaptive Practice: Generate personalized practice questions from your materials. Get instant feedback with AI-powered evaluation and detailed explanations.' }} />
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">\u2022</span>
                <span dangerouslySetInnerHTML={{ __html: 'Multilingual Support: Get explanations and practice questions in 50+ languages with natural-sounding text-to-speech playback.' }} />
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">\u2022</span>
                <span dangerouslySetInnerHTML={{ __html: 'Contextual Memory: Your conversation history and uploaded materials are preserved across sessions, building a personalized knowledge base.' }} />
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">\u2022</span>
                <span dangerouslySetInnerHTML={{ __html: 'Voice Playback: Listen to explanations with high-quality text-to-speech in 50+ languages. Adjust speed, pitch, and voice style.' }} />
              </li>
            </ul>
          </section>

          <section className="mt-6">
            <h3 className="text-lg font-semibold mb-3">How to Use MindForge</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">1</span>
                <span dangerouslySetInnerHTML={{ __html: '<strong>Sign Up:</strong> Create your free account at mindforge.app. No credit card required.' }} />
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">2</span>
                <span dangerouslySetInnerHTML={{ __html: 'Upload Materials: Drag and drop PDFs, images, or paste text. Support for documents, handwritten notes, diagrams, and screenshots.' }} />
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">2</span>
                <span dangerouslySetInnerHTML={{ __html: 'Ask Questions: Type your questions in natural language. MindForge analyzes your materials and provides grounded, cited answers.' }} />
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">3</span>
                <span dangerouslySetInnerHTML={{ __html: 'Generate Practice: Click "Generate Questions" to create adaptive practice quizzes from your materials. Get instant feedback with detailed explanations.' }} />
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">4</span>
                <span dangerouslySetInnerHTML={{ __html: 'Listen & Learn: Use the voice playback feature to listen to explanations in your preferred language and speed.' }} />
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">5</span>
                <span dangerouslySetInnerHTML={{ __html: 'Track Progress: Your conversation history, uploaded materials, and practice scores are saved automatically. Resume anytime.' }} />
              </li>
            </ol>
          </section>

          <section className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Privacy & Security</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">\u2022</span>
                <span dangerouslySetInnerHTML={{ __html: '<strong>Your data is yours:</strong> All uploaded materials and conversations are encrypted and stored securely. We never use your data for training.' }} />
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">\u2022</span>
                <span dangerouslySetInnerHTML={{ __html: 'Local-first approach: Your materials stay private. You control what you upload and can delete everything at any time.' }} />
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">\u2022</span>
                <span dangerouslySetInnerHTML={{ __html: 'No vendor lock-in: Export your data anytime. Full data portability with standard formats.' }} />
              </li>
            </ul>
          </section>

          <section className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-3">Credits</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Created by:</strong> Shubham Kumar</p>
              <p className="text-sm">
                MindForge is built with Next.js 15, React 19, Tailwind CSS, Radix UI, Prisma, PostgreSQL, 
                NextAuth.js, OpenAI, and Vercel.
              </p>
              <p className="text-sm">
                Special thanks to the open-source community for the amazing tools and libraries that make MindForge possible.
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}