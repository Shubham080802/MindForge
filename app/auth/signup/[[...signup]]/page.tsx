import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-center text-2xl font-semibold">
          <span className="text-primary">Mind</span>Forge
        </Link>
        <SignUp
          path="/auth/signup"
          signInUrl="/auth/signin"
          fallbackRedirectUrl="/workspace"
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-2xl",
              card: "w-full border border-border bg-card",
            },
          }}
        />
      </div>
    </main>
  );
}
