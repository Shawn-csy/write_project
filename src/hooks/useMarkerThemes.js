import { useState, useMemo, useEffect } from 'react';
import { defaultMarkerConfigs } from "../constants/defaultMarkers.js";
import { apiCall as serviceApiCall } from "../services/settingsApi.js";
import { normalizeThemeConfigs } from "../lib/markerThemeCodec.js";

export function useMarkerThemes(currentUser) {
    const DEFAULT_THEME_ID = 'default';
    const defaultTheme = { id: DEFAULT_THEME_ID, name: '預設主題 (Default)', configs: defaultMarkerConfigs };
  
    const [markerThemes, setMarkerThemesState] = useState([
        defaultTheme
    ]);
    const [currentThemeId, setCurrentThemeIdState] = useState(DEFAULT_THEME_ID);

    // API Helper
    const apiCall = (url, method, body) => serviceApiCall(currentUser, url, method, body);

    // Derived State: Active Markers
    const markerConfigs = useMemo(() => {
        const activeTheme = markerThemes.find(t => t.id === currentThemeId);
        return normalizeThemeConfigs(activeTheme?.configs).length > 0
            ? normalizeThemeConfigs(activeTheme?.configs)
            : defaultMarkerConfigs;
    }, [markerThemes, currentThemeId]);

    // Actions
    const setMarkerThemes = (val) => {
        const normalized = Array.isArray(val)
            ? val.map((theme) => ({ ...theme, configs: normalizeThemeConfigs(theme.configs) }))
            : [];
        if (normalized.length === 0) {
            setMarkerThemesState([defaultTheme]);
            setCurrentThemeIdState(DEFAULT_THEME_ID);
            return;
        }
        setMarkerThemesState(normalized);
        setCurrentThemeIdState((prev) => (normalized.some((t) => t.id === prev) ? prev : normalized[0].id));
    };

    const setCurrentThemeId = (id) => {
        setCurrentThemeIdState(id);
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
        setMarkerThemesState(prev => {
            if (prev.some((t) => t.id === newId)) return prev;
            return [...prev, newTheme];
        });
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
        setMarkerThemesState(prev => {
            if (prev.some((t) => t.id === newId)) return prev;
            return [...prev, newTheme];
        });
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
        setMarkerThemesState(newThemes);
        
        if (currentUser) {
            await apiCall(`/themes/${id}`, 'PUT', { isPublic });
        }
    };

    const updateThemeDescription = async (id, description) => {
        const newThemes = markerThemes.map(t => 
          t.id === id ? { ...t, description } : t
        );
        setMarkerThemesState(newThemes);
        if (currentUser) {
           await apiCall(`/themes/${id}`, 'PUT', { description });
        }
    };
    
    const copyPublicTheme = async (themeId) => {
        if (!currentUser) return;
        const copied = await apiCall(`/themes/${themeId}/copy`, 'POST');
        if (copied) {
            const parsed = { ...copied, configs: normalizeThemeConfigs(copied.configs) };
            setMarkerThemesState(prev => (prev.some((t) => t.id === parsed.id) ? prev : [...prev, parsed]));
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
