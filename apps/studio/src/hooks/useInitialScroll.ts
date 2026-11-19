import { useEffect, type RefObject } from "react";
import type { ParsedScene } from "./useScriptManager.types";

interface InitialParams {
  char: string | null;
  scene: string | null;
}

export function useInitialScroll(
  sceneList: ParsedScene[],
  initialParamsRef: RefObject<InitialParams>,
  setCurrentSceneId: (id: string) => void,
  setScrollSceneId: (id: string) => void
) {
  useEffect(() => {
    if (!sceneList.length) return;
    const initialScene = initialParamsRef.current?.scene;
    if (initialScene && sceneList.some((s) => s.id === initialScene)) {
      setCurrentSceneId(initialScene);
      setScrollSceneId(initialScene);
      if (initialParamsRef.current) {
        initialParamsRef.current.scene = null;
      }
    }
  }, [sceneList, initialParamsRef, setCurrentSceneId, setScrollSceneId]);
}
