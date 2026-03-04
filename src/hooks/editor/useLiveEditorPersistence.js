import { useCallback, useEffect, useMemo } from "react";
import { getScript, updateScript } from "../../lib/api/scripts";
import { extractMetadata } from "../../lib/metadataParser";
import { debounce } from "../../lib/utils";

const getDraftKey = (id) => `draft_script_${id}`;

const readNewerDraft = (scriptId, serverLastModified) => {
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

const persistDraft = (scriptId, content, title, setSaveStatus) => {
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
}) {
  useEffect(() => {
    if (initialData && initialData.id === scriptId && initialData.content !== undefined) {
      const draft = readNewerDraft(scriptId, initialData.lastModified);
      const loadedContent = draft?.content ?? initialData.content;
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
        const loadedContent = draft?.content ?? data.content ?? "";
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
    async (id, newContent, newTitle) => {
      try {
        setSaveStatus("saving");
        const meta = extractMetadata(newContent);
        await updateScript(id, {
          content: newContent,
          title: newTitle,
          author: meta.author || meta.authors || "",
          draftDate: meta.date || meta.draftdate || "",
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
      debounce((id, newContent, newTitle) => {
        performSave(id, newContent, newTitle);
      }, 60000),
    [performSave]
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const handleChange = useCallback(
    (nextContent) => {
      setContent(nextContent);
      if (readOnly) return;
      persistDraft(scriptId, nextContent, title, setSaveStatus);
      debouncedSave(scriptId, nextContent, title);
    },
    [debouncedSave, readOnly, scriptId, setContent, setSaveStatus, title]
  );

  const handleTitleUpdate = useCallback(
    (newTitle) => {
      if (!newTitle || newTitle === title) return;
      setTitle(newTitle);
      onTitleName?.(newTitle);
      if (readOnly) return;
      persistDraft(scriptId, content, newTitle, setSaveStatus);
      debouncedSave(scriptId, content, newTitle);
    },
    [content, debouncedSave, onTitleName, readOnly, scriptId, setSaveStatus, setTitle, title]
  );

  const handleBack = useCallback(async () => {
    debouncedSave.cancel();
    const hasCloudDiff = content !== lastSavedContentRef.current || title !== lastSavedTitleRef.current;
    if (!readOnly && hasCloudDiff) {
      await performSave(scriptId, content, title);
    }
    onClose();
  }, [content, debouncedSave, lastSavedContentRef, lastSavedTitleRef, onClose, performSave, readOnly, scriptId, title]);

  const handleManualSave = useCallback(() => {
    debouncedSave.cancel();
    performSave(scriptId, content, title);
  }, [content, debouncedSave, performSave, scriptId, title]);

  return {
    performSave,
    debouncedSave,
    handleChange,
    handleTitleUpdate,
    handleBack,
    handleManualSave,
  };
}
