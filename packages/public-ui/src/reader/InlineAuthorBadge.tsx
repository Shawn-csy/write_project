/**
 * Minimal author badge — no router, no i18n.
 * Renders semantic element based on what action is available:
 *   link  → <a href>
 *   onClick only → <button type="button">
 *   neither → <span> (static)
 */
import React from "react";
import { getMediaCropStyle } from "@write/media-crop";

interface AuthorInfo {
  id?: string;
  displayName?: string;
  name?: string;
  avatarUrl?: string;
  avatar?: string;
  avatarCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
}

interface AuthorBadgeProps {
  author?: AuthorInfo | string;
  className?: string;
  showAvatar?: boolean;
  link?: string;
  clickable?: boolean;
  onClick?: () => void;
}

export function AuthorBadge({ author, className = "", showAvatar = true, link, clickable = true, onClick }: AuthorBadgeProps) {
  const displayName = typeof author === "object"
    ? (author?.displayName || author?.name || "")
    : (author || "");
  const avatarUrl = typeof author === "object" ? (author?.avatarUrl || author?.avatar || "") : "";
  const avatarCrop = typeof author === "object" ? author?.avatarCrop : null;
  const cropAvatar = getMediaCropStyle(String(avatarUrl || ""), avatarCrop);

  const badgeClass = `flex items-center gap-1.5 text-xs text-muted-foreground transition-colors bg-muted/40 px-2 py-1 rounded-full ${className}`;
  const interactiveClass = "cursor-pointer hover:text-foreground hover:bg-muted";
  const staticClass = "cursor-default";

  const avatarEl = showAvatar && avatarUrl ? (
    <img src={cropAvatar.src} style={cropAvatar.style as React.CSSProperties} alt={displayName} className="w-4 h-4 rounded-full object-cover" />
  ) : showAvatar ? (
    <span className="w-3.5 h-3.5 inline-block rounded-full bg-muted/60" aria-hidden />
  ) : null;

  const nameEl = <span className="font-medium">{displayName || "未知作者"}</span>;

  if (link && clickable) {
    return (
      <a href={link} className={`no-underline ${badgeClass} ${interactiveClass}`}>
        {avatarEl}
        {nameEl}
      </a>
    );
  }

  if (onClick && clickable) {
    return (
      <button type="button" className={`border-none bg-transparent p-0 ${badgeClass} ${interactiveClass}`} onClick={onClick}>
        {avatarEl}
        {nameEl}
      </button>
    );
  }

  return (
    <span className={`${badgeClass} ${staticClass}`}>
      {avatarEl}
      {nameEl}
    </span>
  );
}
