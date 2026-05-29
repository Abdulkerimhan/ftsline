import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "./translations.js";

const browserLang =
  typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("tr")
    ? "tr"
    : "en";

const initialLang =
  typeof localStorage !== "undefined"
    ? localStorage.getItem("lang") || browserLang
    : browserLang;

const I18nContext = createContext({
  language: initialLang,
  changeLanguage: () => {},
  t: translations[initialLang] || translations.tr,
});

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(initialLang);

  const changeLanguage = (lang) => {
    if (!translations[lang]) return;
    setLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useMemo(() => {
    return translations[language] || translations.tr;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      changeLanguage,
      t,
    }),
    [language, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}