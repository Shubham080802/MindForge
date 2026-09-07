import { describe, expect, it } from "vitest";
import { isSessionVersionCurrent } from "@/lib/session-version";

describe("session version", () => {
  it("accepts only the currently issued session generation", () => {
    expect(isSessionVersionCurrent(3, 3)).toBe(true);
    expect(isSessionVersionCurrent(2, 3)).toBe(false);
    expect(isSessionVersionCurrent(undefined, 3)).toBe(false);
  });
});
