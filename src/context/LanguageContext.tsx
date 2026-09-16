import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import tr from "../i18n/tr";
import en from "../i18n/en";
import type { Dictionary } from "../i18n/tr";

export type Language = "tr" | "en";

const DICTIONARIES: Record<Language, Dictionary> = { tr, en };
const STORAGE_KEY = "voltaris-lang";

type LanguageContextValue = {
  lang: Language;
  t: Dictionary;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLang(): Language {
  if (typeof window === "undefined") return "tr";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "tr" || stored === "en") return stored;
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "tr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      t: DICTIONARIES[lang],
      setLang: setLangState,
      toggleLang: () => setLangState((prev) => (prev === "tr" ? "en" : "tr")),
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
