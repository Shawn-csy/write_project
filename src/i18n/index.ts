export const DEFAULT_LANG = "zh-TW" as const;
export const SUPPORTED_LANGS = ["zh-TW", "en", "ja"] as const;

export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export interface I18nMessages {
  [key: string]: string | I18nMessages;
}

const localeLoaders = {
  "zh-TW": () => import("./locales/zh-TW"),
  en: () => import("./locales/en"),
  ja: () => import("./locales/ja"),
};

const localeCache = new Map<SupportedLang, I18nMessages>();

export function isSupportedLang(lang: string): lang is SupportedLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang);
}

export function normalizeLang(lang: string): SupportedLang {
  return isSupportedLang(lang) ? lang : DEFAULT_LANG;
}

export function getDefaultMessages(): I18nMessages {
  return {};
}

export async function getMessagesForLang(lang: string): Promise<I18nMessages> {
  const normalized = normalizeLang(lang);

  if (localeCache.has(normalized)) {
    const cached = localeCache.get(normalized);
    if (cached) return cached;
  }

  const loader = localeLoaders[normalized] || localeLoaders[DEFAULT_LANG];
  const mod = await loader();
  const messages = (mod.default || {}) as I18nMessages;
  localeCache.set(normalized, messages);
  return messages;
}
