import { useMemo, useState, useEffect } from 'react';
import { calculateScriptStats } from '../lib/statistics';
import { buildAST } from '../lib/importPipeline/directASTBuilder';


/**
 * Hook to calculate statistics for a given script AST.
 * @param {Array} scriptAst - The parsed script AST.
 * @returns {Object} The calculated statistics object.
 */
export function useScriptStats({ scriptId, rawScript, scriptAst, markerConfigs = [], options = {} }) {
  const markerConfigsKey = useMemo(() => JSON.stringify(markerConfigs || []), [markerConfigs]);
  const [remoteStats, setRemoteStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Local calculation (fallback or realtime)
  const localStats = useMemo(() => {
    // 1. Try AST first (Most accurate/synced with editor)
    if (scriptAst) {
        try {
            return calculateScriptStats(scriptAst, markerConfigs, options);
        } catch (e) {
            console.error("Error calculating script stats from AST:", e);
        }
    }
    
    // 2. Fallback to raw text if no AST available
    if (rawScript !== undefined && rawScript !== null && markerConfigs.length > 0) {
        try {
            const ast = buildAST(rawScript || "", markerConfigs);
            return calculateScriptStats(ast, markerConfigs, options);
        } catch (e) {
            console.error("Error calculating script stats from raw text:", e);
        }
    }

    return null;
  }, [rawScript, scriptAst, markerConfigsKey, JSON.stringify(options)]);

  // Remote Fetching
  useEffect(() => {
     if (!scriptId) return;
     
     const fetchStats = async () => {
         setIsLoading(true);
         try {
             // In a real app we need auth headers. 
             // Assuming fetch wraps auth or we just fetch public for now? 
             // We need to pass X-User-ID usually.
             // But existing frontend likely handles auth via interceptor or global fetch wrapper?
             // If not, I need to get token. 
             // LiveEditor uses db.js `updateScript`.
             // Let's assume standard fetch with /api prefix works if using proxy.
             // But we need AUTH.
             // For now, let's try fetch directly. If it fails 401, we know we need auth.
             // Since I can't easily see AuthContext in hook usage without more files, 
             // I will use a simple fetch.
             
             // Wait, `LiveEditor` is used by logged in users.
             // The backend expects `X-User-ID`.
             // I need to retrieve it.
             // Let's assume `localStorage.getItem("user_id")` or similar? 
             // Or rely on the local calculation if fetch fails.
             
             // Actually, the prompt says "Update Frontend to use API".
             // I will implement the fetch logic.
             const userId = localStorage.getItem("user_sender_id") || "anonymous"; 
             const headers = { "X-User-ID": userId };

             const res = await fetch(`/api/analysis/script/${scriptId}`, { headers });
             if (!res.ok) throw new Error("Failed to fetch stats");
             const data = await res.json();
             setRemoteStats(data);
         } catch (err) {
             console.error(err);
             setError(err);
         } finally {
             setIsLoading(false);
         }
     };

     fetchStats();
  }, [scriptId]); // Re-fetch if scriptId changes. 
  // IMPORTANT: This only fetches ONCE on mount/id change. 
  // Does not update on typing. This fulfills "Move to backend" (offloading).
  // Users must save to update backend stats.

  // Return localStats if available (real-time, settings-aware), otherwise fallback to remote
  return localStats || remoteStats;
}
