import { useState, useMemo, useEffect } from 'react';
import { defaultMarkerConfigs } from "../constants/defaultMarkerRules";
import { apiCall as serviceApiCall } from "../services/settingsApi.js";
import { normalizeThemeConfigs } from "../lib/markerThemeCodec.js";

const REQUIRED_MARKERS = normalizeThemeConfigs(defaultMarkerConfigs)
    .filter((marker) => marker?.parseAs === "character")
    .map((marker) => ({ ...marker }));

const ensureRequiredMarkers = (configs) => {
    const base = normalizeThemeConfigs(configs);
    const hasRequiredCharacter = base.some((c) => c?.parseAs === "character");
    if (hasRequiredCharacter || REQUIRED_MARKERS.length === 0) return base;
    const ids = new Set(base.map((c) => c?.id).filter(Boolean));
    const missing = REQUIRED_MARKERS.filter((m) => !ids.has(m.id));
    if (missing.length === 0) return base;
    return [...base, ...missing.map((m) => ({ ...m }))];
};

export function useMarkerThemes(currentUser) {
    const DEFAULT_THEME_ID = 'default';
    const isLegacyDefaultNamedTheme = (theme) => {
        if (!theme || theme.id === DEFAULT_THEME_ID) return false;
        const name = String(theme.name || "").trim();
        if (!name) return false;
        const normalized = name
            .toLowerCase()
            .replace(/[\s_()（）\-[\]{}]/g, "");
        return normalized.includes("default") || normalized.includes("預設");
    };
    const defaultTheme = { id: DEFAULT_THEME_ID, name: '預設主題 (Default)', configs: defaultMarkerConfigs };
    const withDefaultTheme = (themes = []) => {
        const normalizedThemes = Array.isArray(themes) ? themes : [];
        const withoutDefault = normalizedThemes.filter(
            (t) => t?.id !== DEFAULT_THEME_ID && !isLegacyDefaultNamedTheme(t)
        );
        const dedupById = [];
        const seen = new Set([DEFAULT_THEME_ID]);
        for (const theme of withoutDefault) {
            if (!theme?.id || seen.has(theme.id)) continue;
            seen.add(theme.id);
            dedupById.push(theme);
        }
        return [defaultTheme, ...dedupById];
    };
    const normalizeThemeList = (themes) => withDefaultTheme(
        (Array.isArray(themes) ? themes : []).map((theme) => ({
            ...theme,
            configs: normalizeThemeConfigs(theme?.configs),
        }))
    );
  
    const [markerThemes, setMarkerThemesState] = useState([defaultTheme]);
    const [currentThemeId, setCurrentThemeIdState] = useState(DEFAULT_THEME_ID);

    // API Helper
    const apiCall = (url, method, body) => serviceApiCall(currentUser, url, method, body);

    // Derived State: Active Markers
    const markerConfigs = useMemo(() => {
        if (currentThemeId === DEFAULT_THEME_ID) {
            return ensureRequiredMarkers(defaultMarkerConfigs);
        }
        const activeTheme = markerThemes.find(t => t.id === currentThemeId);
        return normalizeThemeConfigs(activeTheme?.configs).length > 0
            ? ensureRequiredMarkers(activeTheme?.configs)
            : ensureRequiredMarkers(defaultMarkerConfigs);
    }, [markerThemes, currentThemeId]);

    // Actions
    const setMarkerThemes = (val) => {
        const merged = normalizeThemeList(val);
        setMarkerThemesState(merged);
        setCurrentThemeIdState((prev) => (merged.some((t) => t.id === prev) ? prev : DEFAULT_THEME_ID));
    };

    const setCurrentThemeId = (id) => {
        setCurrentThemeIdState((prev) => (markerThemes.some((theme) => theme.id === id) ? id : DEFAULT_THEME_ID));
    };

    useEffect(() => {
        if (!markerThemes.length) {
            setCurrentThemeIdState(DEFAULT_THEME_ID);
            return;
        }
        if (!markerThemes.some((theme) => theme.id === currentThemeId)) {
            setCurrentThemeIdState(markerThemes[0].id);
        }
    }, [markerThemes, currentThemeId]);

    // Update CURRENT theme's configs
    const setMarkerConfigs = (newConfigs) => {
        if (currentThemeId === DEFAULT_THEME_ID) return;
        const newThemes = markerThemes.map(t => 
            t.id === currentThemeId ? { ...t, configs: normalizeThemeConfigs(newConfigs) } : t
        );
        setMarkerThemes(newThemes);
        
        if (currentUser && currentThemeId !== 'default') {
            apiCall(`/themes/${currentThemeId}`, 'PUT', { configs: normalizeThemeConfigs(newConfigs) });
        }
    };

    const addTheme = async (name, initialOrOptions = null, legacyOptions = null) => {
        const initialConfigs = Array.isArray(initialOrOptions)
            ? initialOrOptions
            : (initialOrOptions?.initialConfigs || null);
        const options = Array.isArray(initialOrOptions)
            ? (legacyOptions || {})
            : (initialOrOptions || {});
        const newId = crypto.randomUUID();
        const configsToSave = initialConfigs || defaultMarkerConfigs;
        const newTheme = {
            id: newId,
            name: name,
            configs: normalizeThemeConfigs(configsToSave),
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

    const addThemeFromCurrent = async (name, optionsOrPublic = false) => {
        const options =
            typeof optionsOrPublic === "boolean"
                ? { isPublic: optionsOrPublic }
                : (optionsOrPublic || {});
        const newId = crypto.randomUUID();
        const newTheme = {
            id: newId,
            name: name,
            configs: normalizeThemeConfigs(markerConfigs),
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

    const deleteTheme = async (id) => {
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

    const renameTheme = (id, newName) => {
        const newThemes = markerThemes.map(t => 
            t.id === id ? { ...t, name: newName } : t
        );
        setMarkerThemes(newThemes);
        
        if (currentUser && id !== 'default') {
            apiCall(`/themes/${id}`, 'PUT', { name: newName });
        }
    };

    const updateThemePublicity = async (id, isPublic) => {
        const newThemes = markerThemes.map(t => 
            t.id === id ? { ...t, isPublic } : t
        );
        setMarkerThemesState(normalizeThemeList(newThemes));
        
        if (currentUser) {
            await apiCall(`/themes/${id}`, 'PUT', { isPublic });
        }
    };

    const updateThemeDescription = async (id, description) => {
        const newThemes = markerThemes.map(t => 
          t.id === id ? { ...t, description } : t
        );
        setMarkerThemesState(normalizeThemeList(newThemes));
        if (currentUser) {
           await apiCall(`/themes/${id}`, 'PUT', { description });
        }
    };
    
    const copyPublicTheme = async (themeId) => {
        if (!currentUser) return;
        const copied = await apiCall(`/themes/${themeId}/copy`, 'POST');
        if (copied) {
            const parsed = { ...copied, configs: normalizeThemeConfigs(copied.configs) };
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
