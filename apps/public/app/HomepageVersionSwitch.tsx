"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import { GalleryClient } from "./GalleryClient";

const LegacyGalleryClient = dynamic(() => import("@/components/legacy-homepage/apps/public/app/GalleryClient").then(module => module.GalleryClient), {
  loading: () => <div className="p-8 text-center text-muted-foreground" role="status">正在載入舊版首頁…</div>,
});
const STORAGE_KEY = "public-homepage:version";
type Version = "modern" | "legacy";

/** Both presentations use the current live content and shared filter controller. */
export function HomepageVersionSwitch(props: ComponentProps<typeof GalleryClient>) {
  const [version, setVersion] = useState<Version>("modern");
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "legacy") setVersion("legacy");
    } catch { /* Storage may be disabled; the switch still works for this visit. */ }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.homepageVersion = version;
    return () => { delete document.documentElement.dataset.homepageVersion; };
  }, [version]);
  const toggle = () => {
    const next = version === "modern" ? "legacy" : "modern";
    setVersion(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Optional persistence. */ }
  };
  return <>
    <div className="flex items-center justify-end gap-3 border-b border-border bg-background px-4 py-2 text-xs" aria-label="首頁版本">
      <span className="text-muted-foreground">{version === "modern" ? "新版首頁" : "舊版首頁"}</span>
      <button type="button" onClick={toggle} className="rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        {version === "modern" ? "切換回舊版首頁" : "切換到新版首頁"}
      </button>
    </div>
    {version === "legacy" ? <LegacyGalleryClient {...props} /> : <GalleryClient {...props} />}
  </>;
}
