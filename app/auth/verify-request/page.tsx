"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Link href="/" className="fixed top-6 left-6 z-10 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-background border border-border text-foreground hover:bg-muted transition-colors" aria-label="Back to home">
        <ArrowLeft className="w-6 h-6" />
      </Link>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-2xl mb-6">
            <span className="text-primary">Mind</span>
            <span className="text-foreground">Forge</span>
          </Link>
          <h1 className="text-2xl font-bold">Check Your Email</h1>
          <p className="mt-2 text-muted-foreground">We&apos;ve sent a sign-in link to your email address</p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm w-full p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold">Check your inbox</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Click the link in the email to verify your address and sign in.
            The link expires in 24 hours.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              request a new link
            </Link>
          </p>
          <Link
            href="/auth/signin"
            className="mt-6 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 rounded-md px-4"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}