import { useEffect } from "react";

export function useInitialScroll(sceneList, initialParamsRef, setCurrentSceneId, setScrollSceneId) {
    useEffect(() => {
        if (!sceneList.length) return;
        const initialScene = initialParamsRef.current.scene;
        if (initialScene && sceneList.some((s) => s.id === initialScene)) {
            setCurrentSceneId(initialScene);
            setScrollSceneId(initialScene);
            initialParamsRef.current.scene = null;
        }
    }, [sceneList, initialParamsRef, setCurrentSceneId, setScrollSceneId]);
}
