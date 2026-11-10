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
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-card px-4 py-3" role="note">
    <p className="[font-size:var(--public-font-meta)] text-muted-foreground">資源頁的參與作品可能包含成人向封面與內容。請先確認年齡，之後瀏覽本次工作階段的資源頁不需重複確認。</p>
    <button type="button" onClick={onConfirm} className="min-h-9 rounded-lg bg-primary px-3 [font-size:var(--public-font-meta)] font-semibold text-primary-foreground hover:bg-primary/90">我已年滿 18 歲，顯示作品</button>
  </div>;
}
