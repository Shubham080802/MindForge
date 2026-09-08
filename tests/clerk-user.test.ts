import { describe, expect, it } from "vitest";
import { appIdentityFromClerk, type ClerkProfile } from "@/lib/clerk-user";

function profile(overrides: Partial<ClerkProfile> = {}): ClerkProfile {
  return {
    id: "user_clerk_123",
    firstName: "Ada",
    lastName: "Lovelace",
    imageUrl: "https://img.clerk.com/avatar.png",
    primaryEmailAddressId: "email_primary",
    emailAddresses: [{
      id: "email_primary",
      emailAddress: "  ADA@Example.com ",
      verification: { status: "verified" },
    }],
    ...overrides,
  };
}

describe("Clerk identity mapping", () => {
  it("maps a verified primary identity into the internal user contract", () => {
    expect(appIdentityFromClerk(profile())).toEqual({
      clerkId: "user_clerk_123",
      email: "ada@example.com",
      name: "Ada Lovelace",
      image: "https://img.clerk.com/avatar.png",
    });
  });

  it("rejects an unverified primary address before email-based account linking", () => {
    expect(() => appIdentityFromClerk(profile({
      emailAddresses: [{
        id: "email_primary",
        emailAddress: "ada@example.com",
        verification: { status: "unverified" },
      }],
    }))).toThrow("no verified primary email address");
  });

  it("uses the declared primary address when several addresses exist", () => {
    expect(appIdentityFromClerk(profile({
      primaryEmailAddressId: "email_second",
      emailAddresses: [
        { id: "email_first", emailAddress: "first@example.com", verification: { status: "verified" } },
        { id: "email_second", emailAddress: "second@example.com", verification: { status: "verified" } },
      ],
    })).email).toBe("second@example.com");
  });
});
