import { useState, useMemo, useEffect } from 'react';
import { defaultMarkerConfigs } from "../constants/defaultMarkerRules";
import { apiCall as serviceApiCall } from "../services/settingsApi.js";
import { normalizeMarkerConfigsSchema } from "../lib/markerThemeCodec.js";
import { isDefaultLikeTheme } from "../lib/themeNameUtils";
import { fetchPublic } from "../lib/api/client.js";

export function useMarkerThemes(currentUser, isAdmin = false) {
    const DEFAULT_THEME_ID = 'default';
    const localDefaultConfigs = normalizeMarkerConfigsSchema(defaultMarkerConfigs);
    const [systemDefaultConfigs, setSystemDefaultConfigs] = useState(localDefaultConfigs);
    const defaultTheme = { id: DEFAULT_THEME_ID, name: '預設主題 (Default)', configs: systemDefaultConfigs };
    const withDefaultTheme = (themes = []) => {
        const normalizedThemes = Array.isArray(themes) ? themes : [];
        const withoutDefault = normalizedThemes.filter(
            (t) => t?.id !== DEFAULT_THEME_ID && !isDefaultLikeTheme(t, { includeDefaultId: false })
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
            configs: normalizeMarkerConfigsSchema(theme?.configs),
        }))
    );
    const [markerThemes, setMarkerThemesState] = useState([defaultTheme]);
    const [currentThemeId, setCurrentThemeIdState] = useState(DEFAULT_THEME_ID);

    // API Helper
    const apiCall = (url, method, body) => serviceApiCall(currentUser, url, method, body);

    // Derived State: Active Markers
    const markerConfigs = useMemo(() => {
        if (currentThemeId === DEFAULT_THEME_ID) {
            return normalizeMarkerConfigsSchema(systemDefaultConfigs);
        }
        const activeTheme = markerThemes.find(t => t.id === currentThemeId);
        if (!activeTheme) return normalizeMarkerConfigsSchema(systemDefaultConfigs);
        return normalizeMarkerConfigsSchema(activeTheme?.configs);
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
                    setSystemDefaultConfigs(localDefaultConfigs);
                }
            })
            .catch(() => {
                if (active) setSystemDefaultConfigs(localDefaultConfigs);
            });
        return () => { active = false; };
    }, []);

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
    const setMarkerConfigs = async (newConfigs) => {
        const normalizedConfigs = normalizeMarkerConfigsSchema(newConfigs);
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

    const addTheme = async (name, initialOrOptions = null, legacyOptions = null) => {
        const initialConfigs = Array.isArray(initialOrOptions)
            ? initialOrOptions
            : (initialOrOptions?.initialConfigs || null);
        const options = Array.isArray(initialOrOptions)
            ? (legacyOptions || {})
            : (initialOrOptions || {});
        const newId = crypto.randomUUID();
        const configsToSave = initialConfigs || systemDefaultConfigs;
        const newTheme = {
            id: newId,
            name: name,
            configs: normalizeMarkerConfigsSchema(configsToSave),
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
            configs: normalizeMarkerConfigsSchema(markerConfigs),
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
