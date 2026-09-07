import Link from "next/link";

export function LegalPage({ title, updated = "September 6, 2026", children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-semibold"><span className="text-primary">Mind</span>Forge</Link>
          <Link href="/support" className="text-sm text-muted-foreground hover:text-foreground">Support</Link>
        </div>
      </header>
      <main className="container px-4 py-12">
        <article className="mx-auto max-w-3xl space-y-6 [&_a]:text-primary [&_a]:underline [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_li]:text-muted-foreground [&_p]:leading-7 [&_p]:text-muted-foreground">
          <h1>{title}</h1>
          <p className="text-sm text-muted-foreground">Last updated: {updated}</p>
          {children}
        </article>
      </main>
    </div>
  );
}
