import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export interface ClerkProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification?: { status?: string | null } | null;
  }>;
}

export function appIdentityFromClerk(profile: ClerkProfile) {
  const primaryAddress = profile.emailAddresses.find(
    ({ id }) => id === profile.primaryEmailAddressId,
  );

  if (!primaryAddress || primaryAddress.verification?.status !== "verified") {
    throw new Error("Authenticated Clerk user has no verified primary email address");
  }

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null;
  return {
    clerkId: profile.id,
    email: primaryAddress.emailAddress.trim().toLowerCase(),
    name,
    image: profile.imageUrl || null,
  };
}

/**
 * Resolve Clerk's external identity to MindForge's internal ownership key.
 * Existing email-based users are linked on first Clerk sign-in so a provider
 * migration does not orphan their study data.
 */
export async function ensureAppUser(clerkUserId: string) {
  const existing = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });
  if (existing) return existing;

  const profile = await currentUser();
  if (!profile || profile.id !== clerkUserId) {
    throw new Error("Clerk identity could not be resolved");
  }

  const identity = appIdentityFromClerk(profile);
  return prisma.user.upsert({
    where: { email: identity.email },
    update: {
      clerkId: identity.clerkId,
      name: identity.name ?? undefined,
      image: identity.image ?? undefined,
    },
    create: identity,
    select: { id: true },
  });
}
