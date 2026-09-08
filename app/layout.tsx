import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MindForge - AI Study Assistant",
  description: "Upload study materials, get detailed explanations, and interact with an AI assistant.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ClerkProvider
          signInUrl="/auth/signin"
          signUpUrl="/auth/signup"
          signInFallbackRedirectUrl="/workspace"
          signUpFallbackRedirectUrl="/workspace"
        >
          <ErrorBoundary>
            <Providers>{children}</Providers>
          </ErrorBoundary>
        </ClerkProvider>
      </body>
    </html>
  );
}
