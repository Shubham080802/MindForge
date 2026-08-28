import { Suspense } from "react";
import Link from "next/link";
import SignUpForm from "./signup-form";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-2xl mb-6">
            <span className="text-primary">Mind</span>
            <span className="text-foreground">Forge</span>
          </Link>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-2 text-muted-foreground">Start your AI-powered study journey</p>
        </div>
        <Suspense fallback={<div className="w-full max-w-md">Loading...</div>}>
          <SignUpForm />
        </Suspense>
      </div>
    </div>
  );
}