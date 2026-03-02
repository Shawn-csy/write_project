import { defaultMarkerConfigs } from "../constants/defaultMarkerRules.js";
import { normalizeMarkerConfigsSchema } from "./markerThemeCodec.js";

const isNil = (value) => value === null || value === undefined;

export const resolveEffectiveMarkerConfigs = ({
  baseConfigs,
  scopedConfigs,
  fallbackConfigs = defaultMarkerConfigs,
} = {}) => {
  const hasScoped = !isNil(scopedConfigs);
  const selected = hasScoped ? scopedConfigs : baseConfigs;
  const normalized = normalizeMarkerConfigsSchema(selected);

  if (normalized.length > 0) {
    return {
      configs: normalized,
      source: hasScoped ? "scoped" : "base",
    };
  }

  return {
    configs: normalizeMarkerConfigsSchema(fallbackConfigs),
    source: "fallback",
  };
};

