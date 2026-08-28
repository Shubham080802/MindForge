import { Suspense } from "react";
import Link from "next/link";
import SignInForm from "./signin-form";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-2xl mb-6">
            <span className="text-primary">Mind</span>
            <span className="text-foreground">Forge</span>
          </Link>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">Sign in to continue to MindForge</p>
        </div>
        <Suspense fallback={<div className="w-full max-w-md">Loading...</div>}>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}