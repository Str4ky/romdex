import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./lang/fr.json";
import en from "./lang/en.json";

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English",
  fr: "Français",
};

const resources: Resource = Object.fromEntries(
  Object.entries(SUPPORTED_LANGUAGES).map(([code, label]) => [
    code,
    { translation: code === "fr" ? fr : en, label },
  ])
);

const supportedLanguageCodes = Object.keys(SUPPORTED_LANGUAGES);
const legacyLanguage = localStorage.getItem("i18nextLng")?.split("-")[0];
const storedLanguage = localStorage.getItem("lang") ?? legacyLanguage ?? "en";
const initialLanguage = supportedLanguageCodes.includes(storedLanguage)
  ? storedLanguage
  : "en";

localStorage.setItem("lang", initialLanguage);
localStorage.removeItem("i18nextLng");

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: "en",
      supportedLngs: supportedLanguageCodes,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
}

export default i18n;