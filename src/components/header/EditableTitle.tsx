import React from "react";

export default function EditableTitle({
  isEditing,
  editTitle,
  setEditTitle,
  onSubmit,
  inputClassName,
  inputProps,
  renderDisplay
}) {
  if (isEditing) {
    return (
      <input
        className={inputClassName}
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        onBlur={onSubmit}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        autoFocus
        {...inputProps}
      />
    );
  }

  return renderDisplay?.() || null;
}
