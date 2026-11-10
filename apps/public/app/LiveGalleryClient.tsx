"use client";

import { useEffect, useState } from "react";
import { readPublicBundle } from "@/lib/readPublicBundle";
import { HOMEPAGE_BUNDLE_SECTIONS, parseHomepageBundle, type HomepageBundle, type HomepageBundleResponse } from "@/lib/homepageBundle";
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
export function LiveGalleryClient({ scripts, externalPublicScripts, personas, organizations, activities, bannerSlides, showBrandHero, initialUrlState }: Props) {
  const [bundle, setBundle] = useState<HomepageBundle>({ scripts, externalPublicScripts, personas, organizations, activities, bannerSlides, showBrandHero });

  useEffect(() => {
    let active = true;
    readPublicBundle<HomepageBundleResponse>(HOMEPAGE_BUNDLE_SECTIONS)
      .then(({ data }) => {
        if (!active) return;
        const next = parseHomepageBundle(data);
        setBundle(next);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <GalleryClient
      initialScripts={bundle.scripts}
      initialExternalPublicScripts={bundle.externalPublicScripts}
      initialPersonas={bundle.personas}
      initialOrganizations={bundle.organizations}
      initialActivities={bundle.activities}
      initialBannerSlides={bundle.bannerSlides}
      showBrandHero={bundle.showBrandHero}
      initialUrlState={initialUrlState}
    />
  );
}
