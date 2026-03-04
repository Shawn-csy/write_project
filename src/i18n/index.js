import zhTW from "./locales/zh-TW";

export const DEFAULT_LANG = "zh-TW";
export const SUPPORTED_LANGS = ["zh-TW", "en", "ja"];

const localeLoaders = {
  "zh-TW": async () => ({ default: zhTW }),
  en: () => import("./locales/en.js"),
  ja: () => import("./locales/ja.js"),
};

const localeCache = new Map([[DEFAULT_LANG, zhTW]]);

export function isSupportedLang(lang) {
  return SUPPORTED_LANGS.includes(lang);
}

export function normalizeLang(lang) {
  return isSupportedLang(lang) ? lang : DEFAULT_LANG;
}

export function getDefaultMessages() {
  return zhTW;
}

export async function getMessagesForLang(lang) {
  const normalized = normalizeLang(lang);

  if (localeCache.has(normalized)) {
    return localeCache.get(normalized);
  }

  const loader = localeLoaders[normalized] || localeLoaders[DEFAULT_LANG];
  const mod = await loader();
  const messages = mod.default || {};
  localeCache.set(normalized, messages);
  return messages;
}
