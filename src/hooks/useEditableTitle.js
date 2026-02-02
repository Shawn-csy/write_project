import { useCallback, useEffect, useState } from "react";

export const useEditableTitle = (title, onTitleChange) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title || "");

  useEffect(() => {
    setEditTitle(title || "");
  }, [title]);

  const startEditing = useCallback(() => {
    if (!onTitleChange) return;
    setIsEditing(true);
  }, [onTitleChange]);

  const submitTitle = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== title) {
      onTitleChange?.(trimmed);
    } else {
      setEditTitle(title || "");
    }
    setIsEditing(false);
  }, [editTitle, title, onTitleChange]);

  const cancelEditing = useCallback(() => {
    setEditTitle(title || "");
    setIsEditing(false);
  }, [title]);

  return {
    isEditing,
    editTitle,
    setEditTitle,
    startEditing,
    submitTitle,
    cancelEditing
  };
};
