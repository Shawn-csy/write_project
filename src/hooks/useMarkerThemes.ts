import { useState, useMemo, useEffect, useCallback } from 'react';
import { defaultMarkerConfigs } from "../constants/defaultMarkerRules";
import { apiCall as serviceApiCall } from "../services/settingsApi";
import { normalizeMarkerConfigsSchema } from "../lib/markerThemeCodec";
import { isDefaultLikeTheme } from "../lib/themeNameUtils";
import { fetchPublic } from "../lib/api/client";
import type { CurrentUserLike } from "../types/user";

// Computed once at module load — defaultMarkerConfigs is a static constant.
const NORMALIZED_DEFAULT_CONFIGS = normalizeMarkerConfigsSchema(defaultMarkerConfigs);
const DEFAULT_THEME_ID = 'default';

type MarkerConfig = Record<string, unknown>;

export interface MarkerTheme {
  id: string;
  name: string;
  configs: MarkerConfig[];
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

    // API Helper
    const apiCall = (url: string, method: string, body?: unknown) => serviceApiCall(currentUser, url, method, body);

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
    const setMarkerConfigs = async (newConfigs: MarkerConfig[]) => {
        const normalizedConfigs = normalizeMarkerConfigsSchema(newConfigs) as MarkerConfig[];
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
    };

    const addTheme = async (name: string, initialOrOptions: MarkerConfig[] | ThemeCreateOptions | null = null, legacyOptions: ThemeCreateOptions | null = null) => {
        const initialConfigs = Array.isArray(initialOrOptions)
            ? initialOrOptions
            : (initialOrOptions?.initialConfigs || null);
        const options: ThemeCreateOptions = Array.isArray(initialOrOptions)
            ? (legacyOptions || {})
            : (initialOrOptions || {});
        const newId = crypto.randomUUID();
        const configsToSave = initialConfigs || systemDefaultConfigs;
        const newTheme = {
            id: newId,
            name: name,
            configs: normalizeMarkerConfigsSchema(configsToSave) as MarkerConfig[],
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
    };

    const addThemeFromCurrent = async (name: string, optionsOrPublic: ThemeCreateOptions | boolean = false) => {
        const options: ThemeCreateOptions =
            typeof optionsOrPublic === "boolean"
                ? { isPublic: optionsOrPublic }
                : (optionsOrPublic || {});
        const newId = crypto.randomUUID();
        const newTheme = {
            id: newId,
            name: name,
            configs: normalizeMarkerConfigsSchema(markerConfigs) as MarkerConfig[],
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
    };

    const deleteTheme = async (id: string) => {
        if (markerThemes.length <= 1) return; // Prevent deleting last theme
        const newThemes = markerThemes.filter(t => t.id !== id);
        setMarkerThemes(newThemes);
        if (currentThemeId === id) {
            setCurrentThemeId(newThemes[0].id);
        }
        
        if (currentUser && id !== 'default') {
            await apiCall(`/themes/${id}`, 'DELETE');
        }
    };

    const renameTheme = (id: string, newName: string) => {
        const newThemes = markerThemes.map(t => 
            t.id === id ? { ...t, name: newName } : t
        );
        setMarkerThemes(newThemes);
        
        if (currentUser && id !== 'default') {
            apiCall(`/themes/${id}`, 'PUT', { name: newName });
        }
    };

    const updateThemePublicity = async (id: string, isPublic: boolean) => {
        const newThemes = markerThemes.map(t => 
            t.id === id ? { ...t, isPublic } : t
        );
        setMarkerThemesState(normalizeThemeList(newThemes));
        
        if (currentUser) {
            await apiCall(`/themes/${id}`, 'PUT', { isPublic });
        }
    };

    const updateThemeDescription = async (id: string, description: string) => {
        const newThemes = markerThemes.map(t => 
          t.id === id ? { ...t, description } : t
        );
        setMarkerThemesState(normalizeThemeList(newThemes));
        if (currentUser) {
           await apiCall(`/themes/${id}`, 'PUT', { description });
        }
    };
    
    const copyPublicTheme = async (themeId: string) => {
        if (!currentUser) return;
        const copied = await apiCall(`/themes/${themeId}/copy`, 'POST') as MarkerTheme | null;
        if (copied) {
            const parsed = { ...copied, configs: normalizeMarkerConfigsSchema(copied.configs) };
            setMarkerThemesState((prev) => normalizeThemeList(
                prev.some((t) => t.id === parsed.id) ? prev : [...prev, parsed]
            ));
            setCurrentThemeIdState(parsed.id);
        }
    };

    return {
        markerThemes,
        setMarkerThemes, // Exposed for external sync
        currentThemeId,
        setCurrentThemeId,
        markerConfigs,
        systemDefaultConfigs,
        
        // Actions
        setMarkerConfigs,
        addTheme,
        addThemeFromCurrent,
        deleteTheme,
        renameTheme,
        updateThemePublicity,
        updateThemeDescription,
        copyPublicTheme,
        switchTheme: setCurrentThemeId
    };
}
