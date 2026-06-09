"use client";

// Thin re-export — Next public reader uses the shared renderer directly.
// Host app (globals.css) owns the @write/script-theme CSS import.
export { RenderBlockRenderer as ScriptContentRenderer } from "@write/script-reader-renderer";
