"use client";

import { useEffect } from "react";

const PRODUCTION_HOST = "open-scripts.shawnup.com";
const MEASUREMENT_ID = "G-9BV3FLJ6VS";
const SCRIPT_ID = "open-scripts-google-tag";

export function PublicAnalytics() {
  useEffect(() => {
    if (window.location.hostname !== PRODUCTION_HOST || document.getElementById(SCRIPT_ID)) {
      return;
    }

    const analyticsWindow = window as Window & {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    const dataLayer = analyticsWindow.dataLayer ??= [];
    const gtag: NonNullable<typeof analyticsWindow.gtag> = function () {
      dataLayer.push(arguments);
    };
    analyticsWindow.gtag = gtag;
    gtag("js", new Date());
    gtag("config", MEASUREMENT_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.fetchPriority = "low";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.append(script);
  }, []);

  return null;
}
