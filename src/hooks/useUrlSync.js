import { useEffect } from "react";

export function useUrlSync({
    activeFile,
    activeCloudScript,
    activePublicScriptId,
    files,
    filterCharacter,
    currentSceneId,
}) {
    const syncUrl = ({ fileName, cloudScriptId, publicScriptId, character, sceneId } = {}) => {
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        
        // 1. Cloud Script (Editor) - ?edit=ID
        const targetCloud = cloudScriptId !== undefined ? cloudScriptId : activeCloudScript?.id;
        if (targetCloud) {
            url.searchParams.set("edit", targetCloud);
            url.searchParams.delete("read");
            url.searchParams.delete("file");
        } 
        // 2. Public Script (Reader) - ?read=ID
        else {
             url.searchParams.delete("edit");
             const targetPublic = publicScriptId !== undefined ? publicScriptId : activePublicScriptId;
             
             if (targetPublic) {
                 url.searchParams.set("read", targetPublic);
                 url.searchParams.delete("file");
             } 
             // 3. Local File (Reader) - ?file=NAME
             else {
                 url.searchParams.delete("read");
                 const targetName = fileName !== undefined ? fileName : activeFile;
                 const fileEntry = targetName && files.find((f) => f.name === targetName);
                 if (fileEntry) url.searchParams.set("file", fileEntry.display);
                 else url.searchParams.delete("file");
             }
        }

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
        // Sync on state changes
        syncUrl();
    }, [filterCharacter, currentSceneId, activeFile, activeCloudScript, activePublicScriptId, files]);

    return { syncUrl };
}
