"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "public-resources-adult-confirmed";

export function useResourceAgeGate() {
  const [confirmed, setConfirmed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { setConfirmed(window.sessionStorage.getItem(STORAGE_KEY) === "1"); } catch { /* Storage may be unavailable. */ }
    setReady(true);
  }, []);
  const confirm = () => {
    try { window.sessionStorage.setItem(STORAGE_KEY, "1"); } catch { /* Confirmation still applies to this page. */ }
    setConfirmed(true);
  };
  return { confirmed, ready, confirm };
}

export function ResourceAgeGate({ onConfirm }: { onConfirm: () => void }) {
  return <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 sm:mb-5 sm:px-4 sm:py-3" role="note">
    <p className="[font-size:var(--public-font-meta)] text-muted-foreground">參與作品可能含成人內容。確認年滿 18 歲後顯示封面，本次瀏覽期間免重複確認。</p>
    <button type="button" onClick={onConfirm} className="min-h-9 rounded-lg bg-primary px-3 [font-size:var(--public-font-meta)] font-semibold text-primary-foreground hover:bg-primary/90">我已年滿 18 歲，顯示作品</button>
  </div>;
}
