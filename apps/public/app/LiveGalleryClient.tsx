"use client";

import { useEffect, useRef, useState } from "react";
import { liveApi } from "@/lib/liveApi";
import { parseHomepageBundle, type HomepageBundle, type HomepageBundleResponse } from "@/lib/homepageBundle";
import { GalleryClient } from "./GalleryClient";
import type { PublicHomepageUrlState } from "./gallery/useGalleryUrlState";

interface Props extends HomepageBundle {
  initialUrlState: PublicHomepageUrlState;
}

/**
 * The homepage of the static build. It hydrates with the list baked in at build
 * time, then replaces it with the live bundle so newly published or edited
 * works show up without a redeploy. If the refresh fails the baked list stays.
 */
export function LiveGalleryClient({ scripts, externalPublicScripts, bannerSlides, showBrandHero, initialUrlState }: Props) {
  const [bundle, setBundle] = useState<HomepageBundle>({ scripts, externalPublicScripts, bannerSlides, showBrandHero });
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    liveApi
      .readJson<HomepageBundleResponse>("/api/public-bundle", { signal: controller.signal })
      .then(({ data }) => {
        const next = parseHomepageBundle(data);
        const signature = JSON.stringify(next);
        if (signature === lastSignature.current) return;
        lastSignature.current = signature;
        setBundle(next);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <GalleryClient
      initialScripts={bundle.scripts}
      initialExternalPublicScripts={bundle.externalPublicScripts}
      initialBannerSlides={bundle.bannerSlides}
      showBrandHero={bundle.showBrandHero}
      initialUrlState={initialUrlState}
    />
  );
}
