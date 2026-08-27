import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Private Study Agent",
  description: "Grounded, private tutoring from your own study materials.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
