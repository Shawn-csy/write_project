"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "public-announcement-dismissed:dev-notice-v1";

/**
 * Thin site-wide notice shown above the top bar on the Dev site only, so testers
 * know the data and behaviour can change. Dismissal lasts for the browser session.
 */
export function PublicAnnouncementBar() {
  const isDevSite = process.env.NEXT_PUBLIC_DEPLOY_ENV === "development";
  // Start hidden so server and client render the same markup, then reveal after reading storage.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isDevSite) return;
    try {
      setVisible(window.sessionStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, [isDevSite]);

  if (!isDevSite || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Storage can be unavailable; the bar simply returns on the next visit.
    }
  };

  return (
    <div
      role="region"
      aria-label="網站公告"
      className="flex items-center justify-center gap-3 border-b border-primary/15 bg-primary/10 px-4 py-2 [font-size:var(--public-font-meta)] text-foreground"
    >
      <p className="min-w-0 text-center leading-snug">
        <span className="mr-2 font-semibold">DEV 平台</span>
        目前正在調整架構，可能偶有不穩。需要上架或下架作品，請直接與我們聯繫。
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="關閉公告"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
