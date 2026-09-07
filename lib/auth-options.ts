import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rate-limit";
import { reconcileSessionIdentity, revokeSessionClaims } from "@/lib/session-version";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, request) {
      const parsed = emailSchema.safeParse(credentials?.email);
      const password = typeof credentials?.password === "string" ? credentials.password : "";
      if (!parsed.success || !password) return null;

      try {
        await enforceRateLimit(request, "auth-attempt", parsed.data);
      } catch (error) {
        if (error instanceof Response && error.status === 429) return null;
        throw error;
      }

      const user = await prisma.user.findUnique({ where: { email: parsed.data } });
      if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return null;
      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }));
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(GitHubProvider({ clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET }));
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin", error: "/auth/error", verifyRequest: "/auth/verify-request" },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      if (account?.provider === "google" && (profile as { email_verified?: boolean } | undefined)?.email_verified === false) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id },
          select: { sessionVersion: true },
        });
        const identity = reconcileSessionIdentity(token, current?.sessionVersion ?? null, Boolean(user));
        if (identity) {
          token.id = identity.id;
          token.sessionVersion = identity.sessionVersion;
          token.revoked = false;
        } else {
          revokeSessionClaims(token);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.revoked || !token.id) {
        return { ...session, user: undefined };
      }
      if (session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
      }
      return session;
    },
  },
};
