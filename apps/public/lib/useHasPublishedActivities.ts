"use client";

import { useEffect, useState } from "react";
import { liveApi } from "@/lib/liveApi";

/** Shared visibility rule for the public Activity navigation link. */
export function useHasPublishedActivities(): boolean {
  const [hasPublishedActivity, setHasPublishedActivity] = useState(false);

  useEffect(() => {
    let active = true;
    void liveApi
      .readJson<{ activityPages?: Array<{ status?: string }> }>("/api/public-bundle", { cache: "no-store" })
      .then(({ data }) => {
        if (active) setHasPublishedActivity((data.activityPages || []).some((page) => page.status === "published"));
      })
      .catch(() => {
        if (active) setHasPublishedActivity(false);
      });
    return () => { active = false; };
  }, []);

  return hasPublishedActivity;
}
