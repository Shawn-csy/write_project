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
