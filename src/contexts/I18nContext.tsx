import React from "react";
import {
  DEFAULT_LANG,
  getMessagesForLang,
  type I18nMessages,
  isSupportedLang,
  normalizeLang,
  type SupportedLang,
} from "../i18n";

const STORAGE_KEY = "app_lang_v1";

type Translator = (key: string, fallback?: string) => string;

interface I18nContextValue {
  lang: SupportedLang;
  setLang: (lang: string) => void;
  t: Translator;
}

function getByPath(obj: I18nMessages, path: string): string | undefined {
  return String(path || "")
    .split(".")
    .reduce<string | I18nMessages | undefined>((acc, key) => {
      if (!acc || typeof acc === "string") return undefined;
      const value = acc[key];
      return value ?? undefined;
    }, obj) as string | undefined;
}

function createTranslator(activeMessages: I18nMessages, fallbackMessages: I18nMessages): Translator {
  return (key: string, fallback = "") => {
    const value = getByPath(activeMessages, key);
    if (typeof value === "string") return value;

    const fallbackValue = getByPath(fallbackMessages, key);
    if (typeof fallbackValue === "string") return fallbackValue;

    return fallback || key;
  };
}

const emptyMessages: I18nMessages = {};

const defaultContextValue: I18nContextValue = {
  lang: DEFAULT_LANG,
  setLang: (_lang: string) => {},
  t: (key: string, fallback = "") => fallback || key,
};

const I18nContext = React.createContext(defaultContextValue);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isSupportedLang(stored)) return stored;
    } catch {}
    return DEFAULT_LANG;
  });

  const [activeMessages, setActiveMessages] = React.useState<I18nMessages>(emptyMessages);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    getMessagesForLang(lang)
      .then((loadedMessages) => {
        if (!cancelled) {
          setActiveMessages(loadedMessages || emptyMessages);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  const setLang = React.useCallback((next: string) => {
    const normalized = normalizeLang(next);
    setLangState(normalized);

    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {}
  }, []);

  const value = React.useMemo(
    () => ({
      lang,
      setLang,
      t: createTranslator(activeMessages, emptyMessages),
    }),
    [lang, setLang, activeMessages]
  );

  if (!ready) return null;

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return React.useContext(I18nContext);
}
