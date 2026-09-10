import { describe, expect, it } from "vitest";
import { resolveAuthorizedParties } from "@/lib/clerk-authorized-parties";

describe("resolveAuthorizedParties", () => {
  it("uses the Vercel production hostname when nothing is configured", () => {
    expect(resolveAuthorizedParties({ VERCEL_PROJECT_PRODUCTION_URL: "mind-forge-ashy.vercel.app" }))
      .toEqual(["https://mind-forge-ashy.vercel.app"]);
  });

  it("also trusts the deployment's own hostname so previews can authenticate", () => {
    const parties = resolveAuthorizedParties({
      VERCEL_PROJECT_PRODUCTION_URL: "mind-forge-ashy.vercel.app",
      VERCEL_URL: "mind-forge-git-branch-test11.vercel.app",
    });

    expect(parties).toEqual([
      "https://mind-forge-ashy.vercel.app",
      "https://mind-forge-git-branch-test11.vercel.app",
    ]);
  });

  it("prefers an explicit allowlist over the inferred hostname", () => {
    const parties = resolveAuthorizedParties({
      CLERK_AUTHORIZED_PARTIES: "https://mindforge.app, https://www.mindforge.app",
      VERCEL_PROJECT_PRODUCTION_URL: "mind-forge-ashy.vercel.app",
    });

    expect(parties).toEqual(["https://mindforge.app", "https://www.mindforge.app"]);
  });

  it("accepts bare hostnames and normalises them to https origins", () => {
    expect(resolveAuthorizedParties({ CLERK_AUTHORIZED_PARTIES: "mindforge.app" }))
      .toEqual(["https://mindforge.app"]);
  });

  it("keeps an explicit localhost origin usable in development", () => {
    expect(resolveAuthorizedParties({ CLERK_AUTHORIZED_PARTIES: "http://localhost:3000" }))
      .toEqual(["http://localhost:3000"]);
  });

  it("strips trailing slashes and paths so entries compare as origins", () => {
    expect(resolveAuthorizedParties({ CLERK_AUTHORIZED_PARTIES: "https://mindforge.app/app/" }))
      .toEqual(["https://mindforge.app"]);
  });

  it("removes duplicates that differ only by formatting", () => {
    expect(resolveAuthorizedParties({ CLERK_AUTHORIZED_PARTIES: "mindforge.app, https://mindforge.app/" }))
      .toEqual(["https://mindforge.app"]);
  });

  it("ignores blank and unparseable entries", () => {
    expect(resolveAuthorizedParties({ CLERK_AUTHORIZED_PARTIES: " , ::not a url::, mindforge.app" }))
      .toEqual(["https://mindforge.app"]);
  });

  // An empty list keeps Clerk's existing behaviour, so a missing variable can
  // never lock users out of a working deployment.
  it("returns an empty list when the environment says nothing", () => {
    expect(resolveAuthorizedParties({})).toEqual([]);
  });
});
