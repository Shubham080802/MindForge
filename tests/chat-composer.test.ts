import { describe, expect, it } from "vitest";
import { shouldSubmitComposer } from "@/lib/chat-composer";

describe("chat composer keyboard behavior", () => {
  it("submits when Enter is pressed", () => {
    expect(shouldSubmitComposer({ key: "Enter", shiftKey: false, isComposing: false })).toBe(true);
  });

  it("keeps Shift+Enter available for a new line", () => {
    expect(shouldSubmitComposer({ key: "Enter", shiftKey: true, isComposing: false })).toBe(false);
  });

  it("does not submit while an input method editor is composing text", () => {
    expect(shouldSubmitComposer({ key: "Enter", shiftKey: false, isComposing: true })).toBe(false);
  });

  it("ignores keys other than Enter", () => {
    expect(shouldSubmitComposer({ key: "Space", shiftKey: false, isComposing: false })).toBe(false);
  });
});
