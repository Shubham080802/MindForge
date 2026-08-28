"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Something went wrong</h1>
              <p className="text-muted-foreground">
                An unexpected error occurred. The development team has been notified.
              </p>
            </div>
            <div className="space-y-3">
              <Button onClick={reset} className="w-full" size="lg">
                Try Again
              </Button>
              <button
                onClick={() => window.location.reload()}
                className="w-full text-sm text-primary hover:underline"
              >
                Reload Page
              </button>
            </div>
            {process.env.NODE_ENV === "development" && (
              <details className="text-left text-xs text-muted-foreground">
                <summary className="cursor-pointer mb-2">Error Details</summary>
                <pre className="p-4 bg-muted rounded text-left overflow-auto max-h-64">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}