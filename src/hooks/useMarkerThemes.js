import { useState, useMemo } from 'react';
import { defaultMarkerConfigs } from "../constants/defaultMarkers.js";
import { apiCall as serviceApiCall } from "../services/settingsApi.js";

export function useMarkerThemes(currentUser) {
    const DEFAULT_THEME_ID = 'default';
  
    const [markerThemes, setMarkerThemesState] = useState([
        { id: DEFAULT_THEME_ID, name: '預設主題 (Default)', configs: defaultMarkerConfigs }
    ]);
    const [currentThemeId, setCurrentThemeIdState] = useState(DEFAULT_THEME_ID);

    // API Helper
    const apiCall = (url, method, body) => serviceApiCall(currentUser, url, method, body);

    // Derived State: Active Markers
    const markerConfigs = useMemo(() => {
        const activeTheme = markerThemes.find(t => t.id === currentThemeId);
        return activeTheme?.configs || defaultMarkerConfigs;
    }, [markerThemes, currentThemeId]);

    // Actions
    const setMarkerThemes = (val) => {
        setMarkerThemesState(val);
    };

    const setCurrentThemeId = (id) => {
        setCurrentThemeIdState(id);
    };

    // Update CURRENT theme's configs
    const setMarkerConfigs = (newConfigs) => {
        const newThemes = markerThemes.map(t => 
            t.id === currentThemeId ? { ...t, configs: newConfigs } : t
        );
        setMarkerThemes(newThemes);
        
        if (currentUser && currentThemeId !== 'default') {
            apiCall(`/themes/${currentThemeId}`, 'PUT', { configs: JSON.stringify(newConfigs) });
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
            await apiCall('/themes', 'POST', newTheme);
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
                await apiCall('/themes', 'POST', newTheme);
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
            const parsed = { ...copied, configs: JSON.parse(copied.configs) };
            setMarkerThemesState(prev => [...prev, parsed]);
            setCurrentThemeId(parsed.id);
            alert("已成功複製主題！");
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
