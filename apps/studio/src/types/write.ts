import type { ScriptOwnerLike } from "./api";

export interface ScriptTagItem {
  id?: string;
  name: string;
  color?: string;
}

export interface WriteScriptItem {
  id: string;
  title: string;
  type?: string;
  folder?: string;
  content?: string;
  isPublic?: boolean;
  markerThemeId?: string;
  draftDate?: string;
  lastModified?: number;
  createdAt?: number;
  sortOrder?: number;
  author?: string | ScriptOwnerLike;
  depth?: number;
  contentLength?: number;
  tags?: ScriptTagItem[];
  _displayDate?: string;
  _displayAuthor?: string | ScriptOwnerLike;
  _themeName?: string;
  [key: string]: unknown;
}
