import { useCallback, useState } from "react";
import { createTag, getTags } from "../../lib/api/tags";

export function useScriptTags({ t, toast, tagOwnerId = "" } = {}) {
  const [currentTags, setCurrentTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState("");

  const loadTags = useCallback(async () => {
    try {
      const tags = await getTags(tagOwnerId);
      setAvailableTags(tags || []);
    } catch (error) {
      console.error("Failed to load tags", error);
    }
  }, [tagOwnerId]);

  const handleAddTagsBatch = useCallback(
    async (inputs = []) => {
      const names = Array.from(
        new Set(
          (inputs || [])
            .map((item) => String(item || "").trim())
            .filter(Boolean)
            .map((name) => name.toLowerCase())
        )
      );
      if (names.length === 0) return;

      const nameMap = new Map();
      names.forEach((lowerName) => {
        const original = (inputs || []).find((item) => String(item || "").trim().toLowerCase() === lowerName);
        nameMap.set(lowerName, String(original || "").trim());
      });

      const resolved = [];
      for (const lowerName of names) {
        const displayName = nameMap.get(lowerName);
        if (!displayName) continue;
        let existing = availableTags.find((tag) => tag.name.toLowerCase() === lowerName);
        if (!existing) {
          try {
            existing = await createTag(displayName, "bg-gray-500", tagOwnerId);
            setAvailableTags((prev) => {
              if (prev.some((tag) => tag.id === existing.id || tag.name.toLowerCase() === lowerName)) return prev;
              return [...prev, existing];
            });
          } catch (error) {
            console.error("Batch add tag failed", error);
            continue;
          }
        }
        resolved.push(existing);
      }

      if (resolved.length > 0) {
        setCurrentTags((prev) => {
          const next = [...prev];
          for (const tag of resolved) {
            const exists = next.some((item) => item.id === tag.id || item.name.toLowerCase() === tag.name.toLowerCase());
            if (!exists) next.push(tag);
          }
          return next;
        });
        setNewTagInput("");
        if (toast && t) {
          toast({
            title: t("scriptMetadataDialog.tagsAdded"),
            description: t("scriptMetadataDialog.tagsAddedCount").replace("{count}", String(resolved.length)),
          });
        }
      }
    },
    [availableTags, t, toast, tagOwnerId]
  );

  const handleAddTag = useCallback(
    async (inputOverride) => {
      const candidate = (inputOverride ?? newTagInput).trim();
      if (!candidate) return;

      const splitCandidates = candidate
        .split(/[,，、#\n\t;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      if (splitCandidates.length > 1) {
        await handleAddTagsBatch(splitCandidates);
        return;
      }
      const tagName = candidate;

      const isFromInput = !inputOverride || inputOverride === newTagInput || inputOverride === newTagInput.trim();

      if (currentTags.find((tag) => tag.name.toLowerCase() === tagName.toLowerCase())) {
        if (isFromInput) setNewTagInput("");
        return;
      }

      let tagToAdd = availableTags.find((tag) => tag.name.toLowerCase() === tagName.toLowerCase());

      try {
        if (!tagToAdd) {
          const newTag = await createTag(tagName, "bg-gray-500", tagOwnerId);
          tagToAdd = newTag;
          setAvailableTags((prev) => {
            if (prev.some((tag) => tag.id === newTag.id || tag.name.toLowerCase() === newTag.name.toLowerCase())) return prev;
            return [...prev, newTag];
          });
        }
        setCurrentTags((prev) => {
          if (prev.some((tag) => tag.id === tagToAdd.id || tag.name.toLowerCase() === tagToAdd.name.toLowerCase())) return prev;
          return [...prev, tagToAdd];
        });
        if (isFromInput) setNewTagInput("");
      } catch (error) {
        console.error("Error adding tag", error);
      }
    },
    [availableTags, currentTags, handleAddTagsBatch, newTagInput, tagOwnerId]
  );

  const handleRemoveTag = useCallback((tagId) => {
    setCurrentTags((prev) => prev.filter((tag) => tag.id !== tagId));
  }, []);

  const handleClearTags = useCallback(() => {
    setCurrentTags([]);
  }, []);

  return {
    currentTags,
    setCurrentTags,
    availableTags,
    setAvailableTags,
    newTagInput,
    setNewTagInput,
    loadTags,
    handleAddTag,
    handleAddTagsBatch,
    handleRemoveTag,
    handleClearTags,
  };
}
