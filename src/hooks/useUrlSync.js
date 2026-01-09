import { useEffect } from "react";

export function useUrlSync({
    activeFile,
    files,
    filterCharacter,
    currentSceneId,
}) {
    const syncUrl = ({ fileName, character, sceneId } = {}) => {
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        
        // File
        const fileEntry =
        (fileName && files.find((f) => f.name === fileName)) ||
        (activeFile && files.find((f) => f.name === activeFile));
        if (fileEntry) url.searchParams.set("file", fileEntry.display);
        else url.searchParams.delete("file");

        // Character
        const charVal = character !== undefined ? character : filterCharacter;
        if (charVal && charVal !== "__ALL__") url.searchParams.set("char", charVal);
        else url.searchParams.delete("char");

        // Scene
        const sceneVal = sceneId !== undefined ? sceneId : currentSceneId;
        if (sceneVal) url.searchParams.set("scene", sceneVal);
        else url.searchParams.delete("scene");

        window.history.replaceState({}, "", url);
    };

    useEffect(() => {
        if (!files.length || !activeFile) return;
        syncUrl();
    }, [filterCharacter, currentSceneId, activeFile, files]);

    return { syncUrl };
}
