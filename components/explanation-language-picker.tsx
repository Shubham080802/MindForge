"use client";

import { STUDY_LANGUAGES, type StudyLanguageCode } from "@/lib/study-languages";

interface ExplanationLanguagePickerProps {
  id: string;
  value: StudyLanguageCode;
  onChange: (language: StudyLanguageCode) => void;
  disabled?: boolean;
}

export function ExplanationLanguagePicker({ id, value, onChange, disabled = false }: ExplanationLanguagePickerProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">
        Explanation language
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as StudyLanguageCode)}
        disabled={disabled}
        className="w-full min-w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {STUDY_LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.name} · {language.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
