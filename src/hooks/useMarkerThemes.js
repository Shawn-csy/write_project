import { useState, useMemo, useEffect } from 'react';
import { defaultMarkerConfigs } from "../constants/defaultMarkers.js";
import { readString, writeValue } from "../lib/storage";
import { apiCall as serviceApiCall } from "../services/settingsApi.js";

export function useMarkerThemes(currentUser) {
    const DEFAULT_THEME_ID = 'default';
  
    const [markerThemes, setMarkerThemesState] = useState([
        { id: DEFAULT_THEME_ID, name: '預設主題 (Default)', configs: defaultMarkerConfigs }
    ]);
    const [currentThemeId, setCurrentThemeIdState] = useState(DEFAULT_THEME_ID);

    // API Helper
    const apiCall = (url, method, body) => serviceApiCall(currentUser, url, method, body);

    // Derived State: Active Markers with System Merge Logic
    const markerConfigs = useMemo(() => {
        const activeTheme = markerThemes.find(t => t.id === currentThemeId);
        const rawConfigs = activeTheme?.configs || defaultMarkerConfigs;
        
        // Ensure "System Default" markers (like 'dual') are present even in old themes
        const mandatoryIds = ['dual', 'sound', 'section', 'post']; 
        
        const merged = [...rawConfigs];
        mandatoryIds.forEach(id => {
            if (!merged.find(c => c.id === id)) {
                const def = defaultMarkerConfigs.find(d => d.id === id);
                if (def) merged.push(def);
            }
        });
        
        return merged;
    }, [markerThemes, currentThemeId]);

    // Actions
    const setMarkerThemes = (val) => {
        setMarkerThemesState(val);
        writeValue('markerThemes', JSON.stringify(val));
    };

    const setCurrentThemeId = (id) => {
        setCurrentThemeIdState(id);
        writeValue('currentThemeId', id);
    };

    // Update CURRENT theme's configs
    const setMarkerConfigs = (newConfigs) => {
        const newThemes = markerThemes.map(t => 
            t.id === currentThemeId ? { ...t, configs: newConfigs } : t
        );
        setMarkerThemes(newThemes);
        
        if (currentUser && currentThemeId !== 'default') {
            apiCall(`/api/themes/${currentThemeId}`, 'PUT', { configs: JSON.stringify(newConfigs) });
        }
    };

    const addTheme = async (name) => {
        const newId = crypto.randomUUID();
        const newTheme = {
            id: newId,
            name: name,
            configs: JSON.stringify(defaultMarkerConfigs), // Server expects string
            isPublic: false
        };
        // Optimistic
        const themeForState = { ...newTheme, configs: defaultMarkerConfigs };
        setMarkerThemesState(prev => [...prev, themeForState]);
        setCurrentThemeId(newId);
        
        if (currentUser) {
            await apiCall('/api/themes', 'POST', newTheme);
        }
    };

    const addThemeFromCurrent = async (name, isPublic = false) => {
        const newId = crypto.randomUUID();
        const newTheme = {
            id: newId,
            name: name,
            configs: JSON.stringify(markerConfigs),
            isPublic: isPublic
        };
        const themeForState = { ...newTheme, configs: markerConfigs };
        setMarkerThemesState(prev => [...prev, themeForState]);
        setCurrentThemeId(newId);

        if (currentUser) {
                await apiCall('/api/themes', 'POST', newTheme);
        }
    };

    const deleteTheme = async (id) => {
        if (markerThemes.length <= 1) return; // Prevent deleting last theme
        const newThemes = markerThemes.filter(t => t.id !== id);
        setMarkerThemes(newThemes);
        if (currentThemeId === id) {
            setCurrentThemeId(newThemes[0].id);
        }
        
        if (currentUser && id !== 'default') {
            await apiCall(`/api/themes/${id}`, 'DELETE');
        }
    };

    const renameTheme = (id, newName) => {
        const newThemes = markerThemes.map(t => 
            t.id === id ? { ...t, name: newName } : t
        );
        setMarkerThemes(newThemes);
        
        if (currentUser && id !== 'default') {
            apiCall(`/api/themes/${id}`, 'PUT', { name: newName });
        }
    };

    const updateThemePublicity = async (id, isPublic) => {
        const newThemes = markerThemes.map(t => 
            t.id === id ? { ...t, isPublic } : t
        );
        setMarkerThemesState(newThemes);
        
        if (currentUser) {
            await apiCall(`/api/themes/${id}`, 'PUT', { isPublic });
        }
    };

    const updateThemeDescription = async (id, description) => {
        const newThemes = markerThemes.map(t => 
          t.id === id ? { ...t, description } : t
        );
        setMarkerThemesState(newThemes);
        if (currentUser) {
           await apiCall(`/api/themes/${id}`, 'PUT', { description });
        }
    };
    
    const copyPublicTheme = async (themeId) => {
        if (!currentUser) return;
        const copied = await apiCall(`/api/themes/${themeId}/copy`, 'POST');
        if (copied) {
            const parsed = { ...copied, configs: JSON.parse(copied.configs) };
            setMarkerThemesState(prev => [...prev, parsed]);
            setCurrentThemeId(parsed.id);
            alert("已成功複製主題！");
        }
    };

    // Migration Effect
    useEffect(() => {
        // Markers & Themes Migration
        const savedThemes = readString('markerThemes');
        const savedCurrentId = readString('currentThemeId');
        const legacyConfigs = readString('markerConfigs');
    
        if (savedThemes) {
            try {
                const parsedThemes = JSON.parse(savedThemes);
                if (Array.isArray(parsedThemes) && parsedThemes.length > 0) {
                    setMarkerThemesState(parsedThemes);
                    if (savedCurrentId) {
                        const exists = parsedThemes.find(t => t.id === savedCurrentId);
                        if (exists) setCurrentThemeIdState(savedCurrentId);
                    }
                }
            } catch (e) {
                console.error("Failed to load themes", e);
            }
        } else if (legacyConfigs) {
            // MIGRATION: Convert legacy configs to Default Theme
            try {
                const parsedLegacy = JSON.parse(legacyConfigs);
                // Merge logic (restore defaults if missing)
                const merged = [...parsedLegacy];
                defaultMarkerConfigs.forEach(def => {
                     if (!merged.find(m => m.id === def.id)) {
                         merged.push(def);
                     }
                });
                
                const migratedTheme = {
                    id: DEFAULT_THEME_ID,
                    name: '預設主題 (Default)',
                    configs: merged
                };
                setMarkerThemesState([migratedTheme]);
                setCurrentThemeIdState(DEFAULT_THEME_ID);
                
                // Save immediately to complete migration
                writeValue('markerThemes', JSON.stringify([migratedTheme]));
            } catch (e) {
                console.error("Legacy migration failed", e);
            }
        }
    }, []);

    return {
        markerThemes,
        setMarkerThemes, // Exposed for external sync if needed
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
