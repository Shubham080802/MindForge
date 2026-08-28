"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
        <p className="text-muted-foreground mb-8">
          Something went wrong during authentication. Please try again or use a different sign-in method.
        </p>
        <div className="space-y-3">
          <Button onClick={() => window.history.back()}>
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/auth/signin">Back to Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}