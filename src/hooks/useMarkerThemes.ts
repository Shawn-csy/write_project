import { useState, useMemo, useEffect, useCallback } from 'react';
import { defaultMarkerConfigs } from "../constants/defaultMarkerRules";
import { apiCall as serviceApiCall } from "../services/settingsApi";
import { normalizeMarkerConfigsSchema } from "../lib/markerThemeCodec";
import { validateMarkerConfigs } from "../lib/markerConfigValidation";
import { isDefaultLikeTheme } from "../lib/themeNameUtils";
import { fetchPublic } from "../lib/api/client";
import { cloneDefaultLayoutConfig, normalizeLayoutConfig, type LayoutConfig } from "../lib/v2";
import { useDebouncedAutosave } from "./useDebouncedAutosave";
import type { CurrentUserLike } from "../types/user";
import type { MarkerConfig } from "../types/script";

// Computed once at module load — defaultMarkerConfigs is a static constant.
const NORMALIZED_DEFAULT_CONFIGS = normalizeMarkerConfigsSchema(defaultMarkerConfigs);
const DEFAULT_THEME_ID = 'default';

export interface MarkerTheme {
  id: string;
  name: string;
  configs: MarkerConfig[];
  layoutConfig?: LayoutConfig;
  isPublic?: boolean;
  description?: string;
  [key: string]: unknown;
}

type ThemeCreateOptions = { initialConfigs?: MarkerConfig[]; isPublic?: boolean; description?: string };

export function useMarkerThemes(currentUser: CurrentUserLike | null | undefined, isAdmin = false) {
    const [systemDefaultConfigs, setSystemDefaultConfigs] = useState(NORMALIZED_DEFAULT_CONFIGS);
    const defaultTheme = useMemo(
        () => ({ id: DEFAULT_THEME_ID, name: '預設主題 (Default)', configs: systemDefaultConfigs }),
        [systemDefaultConfigs]
    );
    const withDefaultTheme = useCallback((themes: MarkerTheme[] = []) => {
        const normalizedThemes = Array.isArray(themes) ? themes : [];
        const withoutDefault = normalizedThemes.filter(
            (t) => t?.id !== DEFAULT_THEME_ID && !isDefaultLikeTheme(t, { includeDefaultId: false })
        );
        const dedupById: MarkerTheme[] = [];
        const seen = new Set([DEFAULT_THEME_ID]);
        for (const theme of withoutDefault) {
            if (!theme?.id || seen.has(theme.id)) continue;
            seen.add(theme.id);
            dedupById.push(theme);
        }
        return [defaultTheme, ...dedupById];
    }, [defaultTheme]);
    const normalizeThemeList = useCallback((themes: MarkerTheme[] | null | undefined) => withDefaultTheme(
        (Array.isArray(themes) ? themes : []).map((theme) => ({
            ...theme,
            id: String(theme?.id || ""),
            configs: normalizeMarkerConfigsSchema(theme?.configs) as MarkerConfig[],
        }))
    ), [withDefaultTheme]);
    const [markerThemes, setMarkerThemesState] = useState<MarkerTheme[]>([
        { id: DEFAULT_THEME_ID, name: '預設主題 (Default)', configs: NORMALIZED_DEFAULT_CONFIGS },
    ]);
    const [currentThemeId, setCurrentThemeIdState] = useState(DEFAULT_THEME_ID);
    const [pendingLayoutPersist, setPendingLayoutPersist] = useState<{ id: string; layoutConfig: LayoutConfig } | null>(null);

    // API Helper
    const apiCall = useCallback(
        (url: string, method: string, body?: unknown) => serviceApiCall(currentUser, url, method, body),
        [currentUser]
    );

    // Derived State: Active Markers
    // Themes already store normalized configs (set via normalizeThemeList), no re-normalization needed.
    const markerConfigs = useMemo(() => {
        if (currentThemeId === DEFAULT_THEME_ID) return systemDefaultConfigs;
        const activeTheme = markerThemes.find(t => t.id === currentThemeId);
        return activeTheme?.configs ?? systemDefaultConfigs;
    }, [markerThemes, currentThemeId, systemDefaultConfigs]);

    useEffect(() => {
        let active = true;
        fetchPublic("/default-marker-configs")
            .then((configs) => {
                if (!active) return;
                const normalized = normalizeMarkerConfigsSchema(configs);
                if (normalized.length > 0) {
                    setSystemDefaultConfigs(normalized);
                } else {
                    setSystemDefaultConfigs(NORMALIZED_DEFAULT_CONFIGS);
                }
            })
            .catch(() => {
                if (active) setSystemDefaultConfigs(NORMALIZED_DEFAULT_CONFIGS);
            });
        return () => { active = false; };
    }, []);

    // Actions
    const setMarkerThemes = useCallback((val: MarkerTheme[]) => {
        const merged = normalizeThemeList(val);
        setMarkerThemesState(merged);
        setCurrentThemeIdState((prev) => (merged.some((t) => t.id === prev) ? prev : DEFAULT_THEME_ID));
    }, [normalizeThemeList]);

    const setCurrentThemeId = useCallback((id: string) => {
        const nextId = String(id || DEFAULT_THEME_ID);
        setCurrentThemeIdState((prev) =>
            markerThemes.some((theme) => String(theme?.id || "") === nextId)
                ? nextId
                : DEFAULT_THEME_ID
        );
    }, [markerThemes]);

    useEffect(() => {
        if (!markerThemes.length) {
            setCurrentThemeIdState(DEFAULT_THEME_ID);
            return;
        }
        if (!markerThemes.some((theme) => String(theme?.id || "") === String(currentThemeId || ""))) {
            setCurrentThemeIdState(markerThemes[0].id);
        }
    }, [markerThemes, currentThemeId]);

    // Update CURRENT theme's configs
    const setMarkerConfigs = useCallback(async (newConfigs: MarkerConfig[]) => {
        const normalizedConfigs = normalizeMarkerConfigsSchema(newConfigs) as MarkerConfig[];
        const errors = validateMarkerConfigs(normalizedConfigs);
        if (errors.length > 0) throw new Error(errors.join("\n"));
        if (currentThemeId === DEFAULT_THEME_ID) {
            if (!isAdmin || !currentUser) return;
            setSystemDefaultConfigs(normalizedConfigs);
            await apiCall('/admin/default-marker-configs', 'PUT', normalizedConfigs);
            return;
        }
        const newThemes = markerThemes.map(t => 
            t.id === currentThemeId ? { ...t, configs: normalizedConfigs } : t
        );
        setMarkerThemes(newThemes);
        
        if (currentUser && currentThemeId !== 'default') {
            await apiCall(`/themes/${currentThemeId}`, 'PUT', { configs: normalizedConfigs });
        }
    }, [apiCall, currentThemeId, currentUser, isAdmin, markerThemes, setMarkerThemes]);

    const addTheme = useCallback(async (name: string, initialOrOptions: MarkerConfig[] | ThemeCreateOptions | null = null, legacyOptions: ThemeCreateOptions | null = null) => {
        const initialConfigs = Array.isArray(initialOrOptions)
            ? initialOrOptions
            : (initialOrOptions?.initialConfigs || null);
        const options: ThemeCreateOptions = Array.isArray(initialOrOptions)
            ? (legacyOptions || {})
            : (initialOrOptions || {});
        const newId = crypto.randomUUID();
        const configsToSave = initialConfigs || systemDefaultConfigs;
        const normalized = normalizeMarkerConfigsSchema(configsToSave) as MarkerConfig[];
        const errors = validateMarkerConfigs(normalized);
        if (errors.length > 0) throw new Error(errors.join("\n"));
        const newTheme = {
            id: newId,
            name: name,
            configs: normalized,
            isPublic: Boolean(options.isPublic),
            description: options.description || ""
        };
        setMarkerThemesState((prev) => normalizeThemeList(
            prev.some((t) => t.id === newId) ? prev : [...prev, newTheme]
        ));
        setCurrentThemeIdState(newId);
        
        if (currentUser) {
            await apiCall('/themes', 'POST', newTheme);
        }
        return newTheme;
    }, [apiCall, currentUser, normalizeThemeList, systemDefaultConfigs]);

    const addThemeFromCurrent = useCallback(async (name: string, optionsOrPublic: ThemeCreateOptions | boolean = false) => {
        const options: ThemeCreateOptions =
            typeof optionsOrPublic === "boolean"
                ? { isPublic: optionsOrPublic }
                : (optionsOrPublic || {});
        const newId = crypto.randomUUID();
        const currentTheme = markerThemes.find((t) => t.id === currentThemeId);
        const newTheme = {
            id: newId,
            name: name,
            configs: (() => {
                const normalized = normalizeMarkerConfigsSchema(markerConfigs) as MarkerConfig[];
                const errors = validateMarkerConfigs(normalized);
                if (errors.length > 0) throw new Error(errors.join("\n"));
                return normalized;
            })(),
            layoutConfig: currentTheme?.layoutConfig
                ? normalizeLayoutConfig(currentTheme.layoutConfig)
                : cloneDefaultLayoutConfig(),
            isPublic: Boolean(options.isPublic),
            description: options.description || ""
        };
        setMarkerThemesState((prev) => normalizeThemeList(
            prev.some((t) => t.id === newId) ? prev : [...prev, newTheme]
        ));
        setCurrentThemeIdState(newId);

        if (currentUser) {
                await apiCall('/themes', 'POST', newTheme);
        }
        return newTheme;
    }, [apiCall, currentThemeId, currentUser, markerConfigs, markerThemes, normalizeThemeList]);

    const deleteTheme = useCallback(async (id: string) => {
        if (markerThemes.length <= 1) return; // Prevent deleting last theme
        const newThemes = markerThemes.filter(t => t.id !== id);
        setMarkerThemes(newThemes);
        if (currentThemeId === id) {
            setCurrentThemeId(newThemes[0].id);
        }
        
        if (currentUser && id !== 'default') {
            await apiCall(`/themes/${id}`, 'DELETE');
        }
    }, [apiCall, currentThemeId, currentUser, markerThemes, setCurrentThemeId, setMarkerThemes]);

    const renameTheme = useCallback((id: string, newName: string) => {
        const newThemes = markerThemes.map(t => 
            t.id === id ? { ...t, name: newName } : t
        );
        setMarkerThemes(newThemes);
        
        if (currentUser && id !== 'default') {
            apiCall(`/themes/${id}`, 'PUT', { name: newName });
        }
    }, [apiCall, currentUser, markerThemes, setMarkerThemes]);

    const updateThemePublicity = useCallback(async (id: string, isPublic: boolean) => {
        const newThemes = markerThemes.map(t => 
            t.id === id ? { ...t, isPublic } : t
        );
        setMarkerThemesState(normalizeThemeList(newThemes));
        
        if (currentUser) {
            await apiCall(`/themes/${id}`, 'PUT', { isPublic });
        }
    }, [apiCall, currentUser, markerThemes, normalizeThemeList]);

    const updateThemeDescription = useCallback(async (id: string, description: string) => {
        const newThemes = markerThemes.map(t => 
          t.id === id ? { ...t, description } : t
        );
        setMarkerThemesState(normalizeThemeList(newThemes));
        if (currentUser) {
           await apiCall(`/themes/${id}`, 'PUT', { description });
        }
    }, [apiCall, currentUser, markerThemes, normalizeThemeList]);
    
    const copyPublicTheme = useCallback(async (themeId: string) => {
        if (!currentUser) return;
        const copied = await apiCall(`/themes/${themeId}/copy`, 'POST') as MarkerTheme | null;
        if (copied) {
            const parsed = { ...copied, configs: normalizeMarkerConfigsSchema(copied.configs) };
            setMarkerThemesState((prev) => normalizeThemeList(
                prev.some((t) => t.id === parsed.id) ? prev : [...prev, parsed]
            ));
            setCurrentThemeIdState(parsed.id);
        }
    }, [apiCall, currentUser, normalizeThemeList]);

    const activeLayoutConfig = useMemo<LayoutConfig>(() => {
        const theme = markerThemes.find((t) => t.id === currentThemeId);
        return normalizeLayoutConfig(theme?.layoutConfig ?? null);
    }, [markerThemes, currentThemeId]);

    const updateThemeLayoutConfig = useCallback((id: string, config: LayoutConfig) => {
        const normalized = normalizeLayoutConfig(config);
        const stripped = { ...normalized, routingRules: [] };
        // Immediate state update so UI is responsive
        setMarkerThemesState((prev) => normalizeThemeList(
            prev.map((t) => t.id === id ? { ...t, layoutConfig: stripped } : t)
        ));
        if (currentUser && id !== 'default') {
            setPendingLayoutPersist({ id, layoutConfig: stripped });
        } else {
            setPendingLayoutPersist(null);
        }
    }, [currentUser, normalizeThemeList]);

    const persistPendingLayout = useCallback(async () => {
        if (!pendingLayoutPersist) return;
        const pendingAtSave = pendingLayoutPersist;
        await apiCall(`/themes/${pendingLayoutPersist.id}`, 'PUT', {
            layoutConfig: pendingLayoutPersist.layoutConfig,
        });
        setPendingLayoutPersist((current) =>
            current &&
            current.id === pendingAtSave.id &&
            current.layoutConfig === pendingAtSave.layoutConfig
                ? null
                : current
        );
    }, [apiCall, pendingLayoutPersist]);

    useDebouncedAutosave({
        enabled: Boolean(currentUser && pendingLayoutPersist && pendingLayoutPersist.id !== DEFAULT_THEME_ID),
        delayMs: 800,
        save: persistPendingLayout,
    });

    return useMemo(() => ({
        markerThemes,
        setMarkerThemes, // Exposed for external sync
        currentThemeId,
        setCurrentThemeId,
        markerConfigs,
        systemDefaultConfigs,
        activeLayoutConfig,

        // Actions
        setMarkerConfigs,
        addTheme,
        addThemeFromCurrent,
        deleteTheme,
        renameTheme,
        updateThemePublicity,
        updateThemeDescription,
        updateThemeLayoutConfig,
        copyPublicTheme,
        switchTheme: setCurrentThemeId
    }), [
        markerThemes,
        setMarkerThemes,
        currentThemeId,
        setCurrentThemeId,
        markerConfigs,
        systemDefaultConfigs,
        activeLayoutConfig,
        setMarkerConfigs,
        addTheme,
        addThemeFromCurrent,
        deleteTheme,
        renameTheme,
        updateThemePublicity,
        updateThemeDescription,
        updateThemeLayoutConfig,
        copyPublicTheme,
    ]);
}
