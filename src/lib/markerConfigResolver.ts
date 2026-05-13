import { defaultMarkerConfigs } from "../constants/defaultMarkerRules";
import { normalizeMarkerConfigsSchema } from "./markerThemeCodec";

const isNil = (value) => value === null || value === undefined;

/**
 * @param {{ baseConfigs?: import("../hooks/useScriptManager.types").MarkerConfig[] | null, scopedConfigs?: import("../hooks/useScriptManager.types").MarkerConfig[] | null, fallbackConfigs?: import("../hooks/useScriptManager.types").MarkerConfig[] }} [options]
 * @returns {{ configs: import("../hooks/useScriptManager.types").MarkerConfig[], source: "scoped" | "base" | "fallback" }}
 */
export const resolveEffectiveMarkerConfigs = ({
  baseConfigs,
  scopedConfigs,
  fallbackConfigs = defaultMarkerConfigs,
}: { baseConfigs?: any; scopedConfigs?: any; fallbackConfigs?: any } = {}) => {
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
