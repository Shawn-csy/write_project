import { useCallback } from "react";
import { createTag } from "../../lib/api/tags";
import { AUDIENCE_TAG_GROUP, RATING_TAG_GROUP, syncGroupedTagSelection } from "./tagGroupUtils";
import type { TagLike } from "./types";

export function useScriptMetadataTagHandlers({
  currentTags,
  availableTags,
  setAvailableTags,
  setCurrentTags,
  setTargetAudience,
  setContentRating,
}: {
  currentTags: TagLike[];
  availableTags: TagLike[];
  setAvailableTags: (fn: (prev: TagLike[]) => TagLike[]) => void;
  setCurrentTags: (tags: TagLike[]) => void;
  setTargetAudience: (v: string) => void;
  setContentRating: (v: string) => void;
}) {
  const handleSetTargetAudience = useCallback(
    async (newAudience: string) => {
      setTargetAudience(newAudience);
      try {
        const next = await syncGroupedTagSelection({
          currentTags,
          availableTags,
          selectedName: newAudience,
          groupNames: AUDIENCE_TAG_GROUP,
          createTag: createTag as (name: string, color: string, ownerIdQuery?: string) => Promise<TagLike>,
          resolveColor: () => "bg-gray-500",
          onTagCreated: (created) => {
            setAvailableTags((prev) => {
              if (prev.some((tag) => tag.id === created.id)) return prev;
              return [...prev, created];
            });
          },
        });
        setCurrentTags(next);
      } catch (error) {
        console.error(error);
      }
    },
    [availableTags, currentTags, setAvailableTags, setContentRating, setCurrentTags, setTargetAudience]
  );

  const handleSetContentRating = useCallback(
    async (newRating: string) => {
      setContentRating(newRating);
      try {
        const next = await syncGroupedTagSelection({
          currentTags,
          availableTags,
          selectedName: newRating,
          groupNames: RATING_TAG_GROUP,
          createTag: createTag as (name: string, color: string, ownerIdQuery?: string) => Promise<TagLike>,
          resolveColor: (name) => (name === "成人向" ? "bg-red-500" : "bg-gray-500"),
          onTagCreated: (created) => {
            setAvailableTags((prev) => {
              if (prev.some((tag) => tag.id === created.id)) return prev;
              return [...prev, created];
            });
          },
        });
        setCurrentTags(next);
      } catch (error) {
        console.error(error);
      }
    },
    [availableTags, currentTags, setAvailableTags, setCurrentTags, setContentRating]
  );

  return {
    handleSetTargetAudience,
    handleSetContentRating,
  };
}
