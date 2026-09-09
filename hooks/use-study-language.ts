"use client";

import { useCallback, useEffect, useState } from "react";
import { isStudyLanguageCode, type StudyLanguageCode } from "@/lib/study-languages";

export function useStudyLanguage() {
  const [language, setLanguage] = useState<StudyLanguageCode>("en");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/user/profile", { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load your explanation language");
        return response.json();
      })
      .then(({ user }) => {
        if (isStudyLanguageCode(user?.language)) setLanguage(user.language);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          console.error("Language preference error:", requestError);
          setError("Your saved language could not be loaded. English is selected for now.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const updateLanguage = useCallback(async (nextLanguage: StudyLanguageCode) => {
    if (nextLanguage === language) return true;

    const previousLanguage = language;
    setLanguage(nextLanguage);
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ language: nextLanguage }),
      });
      if (!response.ok) throw new Error("Unable to save your explanation language");
      return true;
    } catch (requestError) {
      console.error("Language preference error:", requestError);
      setLanguage(previousLanguage);
      setError("Your language choice could not be saved. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [language]);

  return { language, updateLanguage, isLoading, isSaving, error };
}
