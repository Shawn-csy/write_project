/**
 * markerThemeCodec — re-exports canonical normalize fns from @script-engine.
 * safeParseThemeConfigsText remains here as it depends on validateMarkerConfigs (Vite-only).
 */

import { extractErrorMessage } from './utils';
import { validateMarkerConfigs } from './markerConfigValidation';

export {
  normalizeThemeConfigs,
  normalizeMarkerConfigsSchema,
} from "@script-engine/marker-theme/normalize";

import { normalizeMarkerConfigsSchema } from "@script-engine/marker-theme/normalize";

export const serializeThemeConfigs = (configs: unknown) => {
  const normalized = normalizeMarkerConfigsSchema(configs);
  return JSON.stringify(normalized);
};

export const safeParseThemeConfigsText = (text: string) => {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return { value: null, error: "根節點必須是陣列" };
    }
    const normalized = normalizeMarkerConfigsSchema(parsed);
    const validationErrors = validateMarkerConfigs(normalized as import("../types/script").MarkerConfig[]);
    if (validationErrors.length > 0) {
      return { value: null, error: validationErrors.join("\n") };
    }
    return { value: normalized, error: "" };
  } catch (error) {
    return { value: null, error: extractErrorMessage(error) || "格式錯誤" };
  }
};
