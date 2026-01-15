
import { useMemo } from 'react';
import { calculateScriptStats, calculateScriptStatsFromText } from '../lib/statistics';

/**
 * Hook to calculate statistics for a given script AST.
 * @param {Array} scriptAst - The parsed script AST.
 * @returns {Object} The calculated statistics object.
 */
export function useScriptStats({ rawScript, scriptAst, markerConfigs = [], options = {} }) {
  const markerConfigsKey = useMemo(() => JSON.stringify(markerConfigs || []), [markerConfigs]);

  const stats = useMemo(() => {
    if (rawScript !== undefined && rawScript !== null && markerConfigs.length > 0) {
      return calculateScriptStatsFromText(rawScript || "", markerConfigs, options);
    }
    if (!scriptAst) return null;
    try {
      return calculateScriptStats(scriptAst, markerConfigs, options);
    } catch (e) {
      console.error("Error calculating script stats:", e);
      return null;
    }
  }, [rawScript, scriptAst, markerConfigsKey, JSON.stringify(options)]); // Stringify to avoid ref issues

  return stats;
}
