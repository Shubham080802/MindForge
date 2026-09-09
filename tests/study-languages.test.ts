import { describe, expect, it } from "vitest";
import { getStudyLanguage, isStudyLanguageCode, STUDY_LANGUAGE_CODES } from "@/lib/study-languages";
import { profileUpdateInput, sessionMessageInput, studyToolInput } from "@/lib/validation";

describe("study languages", () => {
  it("supports the requested English, Hindi, Spanish, and Latin choices", () => {
    expect(STUDY_LANGUAGE_CODES).toEqual(expect.arrayContaining(["en", "hi", "es", "la"]));
    expect(getStudyLanguage("hi")).toMatchObject({ name: "Hindi", speechLocale: "hi-IN" });
    expect(getStudyLanguage("es")).toMatchObject({ name: "Spanish (Latin America)", speechLocale: "es-MX" });
    expect(getStudyLanguage("la")).toMatchObject({ name: "Latin", speechLocale: "la" });
  });

  it("falls back safely and rejects unsupported request values", () => {
    expect(getStudyLanguage("unknown").code).toBe("en");
    expect(isStudyLanguageCode("es")).toBe(true);
    expect(isStudyLanguageCode("klingon")).toBe(false);
    expect(sessionMessageInput.safeParse({ content: "Teach me", language: "klingon" }).success).toBe(false);
    expect(studyToolInput.safeParse({ tool: "translate", targetLanguage: "klingon" }).success).toBe(false);
  });

  it("accepts Hindi and Latin as saved student preferences", () => {
    expect(profileUpdateInput.parse({ language: "hi" }).language).toBe("hi");
    expect(profileUpdateInput.parse({ language: "la" }).language).toBe("la");
  });
});
