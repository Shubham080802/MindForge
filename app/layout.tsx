import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MindForge — Your notes, made easier to return to",
    template: "%s | MindForge",
  },
  description: "Private AI-powered study workspace. Upload notes, ask questions, generate practice quizzes. Grounded answers with source citations. Your data, your control.",
  keywords: ["study", "AI tutor", "RAG", "notes", "quiz", "private workspace", "learning"],
  authors: [{ name: "MindForge" }],
  creator: "MindForge",
  publisher: "MindForge",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://mindforge.vercel.app",
    siteName: "MindForge",
    title: "MindForge — Your notes, made easier to return to",
    description: "Private AI-powered study workspace. Upload notes, ask questions, generate practice quizzes.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "MindForge workspace preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MindForge — Your notes, made easier to return to",
    description: "Private AI-powered study workspace. Upload notes, ask questions, generate practice quizzes.",
    images: ["/og-image.svg"],
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
