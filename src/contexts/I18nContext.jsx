import React from "react";
import {
  DEFAULT_LANG,
  getMessagesForLang,
  isSupportedLang,
  normalizeLang,
} from "../i18n";

const STORAGE_KEY = "app_lang_v1";

function getByPath(obj, path) {
  return String(path || "")
    .split(".")
    .reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

function createTranslator(activeMessages, fallbackMessages) {
  return (key, fallback = "") => {
    const value = getByPath(activeMessages, key);
    if (typeof value === "string") return value;

    const fallbackValue = getByPath(fallbackMessages, key);
    if (typeof fallbackValue === "string") return fallbackValue;

    return fallback || key;
  };
}

const emptyMessages = {};

const defaultContextValue = {
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key, fallback = "") => fallback || key,
};

const I18nContext = React.createContext(defaultContextValue);

export function I18nProvider({ children }) {
  const [lang, setLangState] = React.useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isSupportedLang(stored)) return stored;
    } catch {}
    return DEFAULT_LANG;
  });

  const [activeMessages, setActiveMessages] = React.useState(emptyMessages);
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

  const setLang = React.useCallback((next) => {
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
