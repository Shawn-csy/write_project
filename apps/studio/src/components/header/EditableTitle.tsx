import React from "react";

interface EditableTitleProps {
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (value: string) => void;
  onSubmit: () => void;
  inputClassName?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  renderDisplay?: () => React.ReactNode;
}

export default function EditableTitle({
  isEditing,
  editTitle,
  setEditTitle,
  onSubmit,
  inputClassName,
  inputProps,
  renderDisplay
}: EditableTitleProps): React.ReactNode {
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
