import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppShortcuts } from "../hooks/useAppShortcuts";

export function GlobalListeners({ nav, adjustFont, filterCharacter, setFocusMode, setShowTitle }) {
    const location = useLocation();

    // 1. Keyboard Shortcuts
    useAppShortcuts({ adjustFont, nav, filterCharacter, setFocusMode });

    // 2. Auto-hide Title on Nav
    useEffect(() => {
        if (nav.homeOpen || nav.aboutOpen || nav.settingsOpen) {
            setShowTitle(false);
        }
    }, [nav.homeOpen, nav.aboutOpen, nav.settingsOpen, setShowTitle]);

    // 3. Reset overlays on route change
    useEffect(() => {
        if (location.pathname !== '/' && (nav.homeOpen || nav.aboutOpen || nav.settingsOpen)) {
            nav.setHomeOpen(false);
            nav.setAboutOpen(false);
            nav.setSettingsOpen(false);
        }
    }, [location.pathname, nav]);

    return null;
}
