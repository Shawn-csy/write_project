import { useCallback, useEffect, useMemo, useRef } from "react";
import type React from "react";
import { getScript, updateScript } from "../../lib/api/scripts";
import { debounce } from "../../lib/utils";
import type { BaseScript } from "../../types/script";

const getDraftKey = (id: string) => `draft_script_${id}`;

type SaveStatus = "saving" | "local-saved" | "saved" | "error" | "unsaved";

interface ScriptDataLike extends BaseScript {}

const readNewerDraft = (scriptId: string, serverLastModified: ScriptDataLike["lastModified"]) => {
  try {
    const draftJson = localStorage.getItem(getDraftKey(scriptId));
    if (!draftJson) return null;
    const draft = JSON.parse(draftJson);
    const serverMtime = new Date(serverLastModified || Date.now()).getTime();
    if (draft?.mtime > serverMtime) {
      return {
        content: draft.content || "",
        title: draft.title || "",
      };
    }
  } catch (error) {
    console.error("Failed to parse local draft", error);
  }
  return null;
};

const persistDraft = (
  scriptId: string,
  content: string,
  title: string,
  setSaveStatus: React.Dispatch<React.SetStateAction<SaveStatus>>
) => {
  try {
    localStorage.setItem(
      getDraftKey(scriptId),
      JSON.stringify({
        content,
        title,
        mtime: Date.now(),
      })
    );
    setSaveStatus((prev) => (prev === "saving" ? "saving" : "local-saved"));
  } catch (error) {
    console.error("Local save failed", error);
  }
};

export function useLiveEditorPersistence({
  scriptId,
  initialData,
  readOnly,
  content,
  title,
  onClose,
  onTitleName,
  t,
  setContent,
  setTitle,
  setLoading,
  setSaveStatus,
  setLastSaved,
  lastSavedContentRef,
  lastSavedTitleRef,
}: {
  scriptId: string;
  initialData?: ScriptDataLike | null;
  readOnly: boolean;
  content: string;
  title: string;
  onClose: () => void;
  onTitleName?: (title: string) => void;
  t: (key: string) => string;
  setContent: (content: string) => void;
  setTitle: (title: string) => void;
  setLoading: (loading: boolean) => void;
  setSaveStatus: React.Dispatch<React.SetStateAction<SaveStatus>>;
  setLastSaved: (date: Date) => void;
  lastSavedContentRef: React.MutableRefObject<string>;
  lastSavedTitleRef: React.MutableRefObject<string>;
}) {
  const pendingDraftRef = useRef<{ scriptId: string; content: string; title: string } | null>(null);
  const flushPendingDraft = useCallback(() => {
    const pending = pendingDraftRef.current;
    if (!pending) return;
    persistDraft(pending.scriptId, pending.content, pending.title, setSaveStatus);
    pendingDraftRef.current = null;
  }, [setSaveStatus]);

  const debouncedPersistDraft = useMemo(
    () =>
      debounce((...args: unknown[]) => {
        const [scriptId, nextContent, nextTitle] = args as [string, string, string];
        pendingDraftRef.current = {
          scriptId,
          content: nextContent,
          title: nextTitle,
        };
        flushPendingDraft();
      }, 800),
    [flushPendingDraft]
  );

  useEffect(() => {
    if (initialData && initialData.id === scriptId && initialData.content !== undefined) {
      const draft = readNewerDraft(scriptId, initialData.lastModified);
      const loadedContent = draft?.content ?? (initialData.content || "");
      const loadedTitle = draft?.title ?? initialData.title ?? t("liveEditor.untitled");
      if (draft) {
        setSaveStatus("local-saved");
      }
      setContent(loadedContent);
      setTitle(loadedTitle);
      lastSavedContentRef.current = loadedContent;
      lastSavedTitleRef.current = loadedTitle;
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      if (!scriptId) return;
      try {
        setLoading(true);
        const data = await getScript(scriptId);
        if (cancelled) return;
        const draft = readNewerDraft(scriptId, data.lastModified);
        const loadedContent = draft?.content ?? (data.content || "");
        const loadedTitle = draft?.title ?? data.title ?? t("liveEditor.untitled");
        if (draft) {
          setSaveStatus("local-saved");
        }
        setContent(loadedContent);
        setTitle(loadedTitle);
        lastSavedContentRef.current = loadedContent;
        lastSavedTitleRef.current = loadedTitle;
        setLastSaved(new Date(data.lastModified || Date.now()));
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load script", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [
    initialData,
    lastSavedContentRef,
    lastSavedTitleRef,
    scriptId,
    setContent,
    setLastSaved,
    setLoading,
    setSaveStatus,
    setTitle,
    t,
  ]);

  const performSave = useCallback(
    async (id: string, newContent: string, newTitle: string) => {
      try {
        setSaveStatus("saving");
        await updateScript(id, {
          content: newContent,
          title: newTitle,
        });
        setLastSaved(new Date());
        setSaveStatus("saved");
        lastSavedContentRef.current = newContent;
        lastSavedTitleRef.current = newTitle;
      } catch (error) {
        console.error("Auto-save failed", error);
        setSaveStatus("error");
      }
    },
    [lastSavedContentRef, lastSavedTitleRef, setLastSaved, setSaveStatus]
  );

  const debouncedSave = useMemo(
    () =>
      debounce((...args: unknown[]) => {
        const [id, newContent, newTitle] = args as [string, string, string];
        performSave(id, newContent, newTitle);
      }, 60000),
    [performSave]
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
      debouncedPersistDraft.cancel();
      flushPendingDraft();
    };
  }, [debouncedPersistDraft, debouncedSave, flushPendingDraft]);

  const handleChange = useCallback(
    (nextContent: string) => {
      setContent(nextContent);
      if (readOnly) return;
      pendingDraftRef.current = {
        scriptId,
        content: nextContent,
        title,
      };
      debouncedPersistDraft(scriptId, nextContent, title);
      debouncedSave(scriptId, nextContent, title);
    },
    [debouncedPersistDraft, debouncedSave, readOnly, scriptId, setContent, title]
  );

  const handleTitleUpdate = useCallback(
    (newTitle: string) => {
      if (!newTitle || newTitle === title) return;
      setTitle(newTitle);
      onTitleName?.(newTitle);
      if (readOnly) return;
      pendingDraftRef.current = {
        scriptId,
        content,
        title: newTitle,
      };
      debouncedPersistDraft(scriptId, content, newTitle);
      debouncedSave(scriptId, content, newTitle);
    },
    [content, debouncedPersistDraft, debouncedSave, onTitleName, readOnly, scriptId, setTitle, title]
  );

  const handleBack = useCallback(async () => {
    debouncedPersistDraft.cancel();
    flushPendingDraft();
    debouncedSave.cancel();
    const hasCloudDiff = content !== lastSavedContentRef.current || title !== lastSavedTitleRef.current;
    if (!readOnly && hasCloudDiff) {
      await performSave(scriptId, content, title);
    }
    onClose();
  }, [content, debouncedPersistDraft, debouncedSave, flushPendingDraft, lastSavedContentRef, lastSavedTitleRef, onClose, performSave, readOnly, scriptId, title]);

  const handleManualSave = useCallback(() => {
    debouncedPersistDraft.cancel();
    flushPendingDraft();
    debouncedSave.cancel();
    performSave(scriptId, content, title);
  }, [content, debouncedPersistDraft, debouncedSave, flushPendingDraft, performSave, scriptId, title]);

  return {
    performSave,
    debouncedSave,
    handleChange,
    handleTitleUpdate,
    handleBack,
    handleManualSave,
  };
}
