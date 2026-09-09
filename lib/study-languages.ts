export const STUDY_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", speechLocale: "en-US" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", speechLocale: "hi-IN" },
  { code: "es", name: "Spanish (Latin America)", nativeName: "Español latinoamericano", speechLocale: "es-MX" },
  { code: "la", name: "Latin", nativeName: "Latina", speechLocale: "la" },
  { code: "fr", name: "French", nativeName: "Français", speechLocale: "fr-FR" },
  { code: "de", name: "German", nativeName: "Deutsch", speechLocale: "de-DE" },
  { code: "pt", name: "Portuguese", nativeName: "Português", speechLocale: "pt-BR" },
  { code: "zh", name: "Mandarin Chinese", nativeName: "中文", speechLocale: "zh-CN" },
  { code: "ja", name: "Japanese", nativeName: "日本語", speechLocale: "ja-JP" },
  { code: "ko", name: "Korean", nativeName: "한국어", speechLocale: "ko-KR" },
] as const;

export const STUDY_LANGUAGE_CODES = STUDY_LANGUAGES.map((language) => language.code) as [
  "en",
  "hi",
  "es",
  "la",
  "fr",
  "de",
  "pt",
  "zh",
  "ja",
  "ko",
];

export type StudyLanguageCode = (typeof STUDY_LANGUAGES)[number]["code"];

export function isStudyLanguageCode(value: unknown): value is StudyLanguageCode {
  return typeof value === "string" && STUDY_LANGUAGE_CODES.includes(value as StudyLanguageCode);
}

export function getStudyLanguage(value: unknown = "en") {
  return STUDY_LANGUAGES.find((language) => language.code === value) ?? STUDY_LANGUAGES[0];
}
