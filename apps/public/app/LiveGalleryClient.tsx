"use client";

import { useEffect, useState } from "react";
import { readPublicBundle } from "@/lib/readPublicBundle";
import { HOMEPAGE_BUNDLE_SECTIONS, HOMEPAGE_SCRIPT_BUNDLE_SECTIONS, parseHomepageBundle, type HomepageBundle, type HomepageBundleResponse } from "@/lib/homepageBundle";
import { HomepageVersionSwitch as GalleryClient } from "./HomepageVersionSwitch";
import type { PublicHomepageUrlState } from "./gallery/useGalleryUrlState";

type GalleryBundle = Omit<HomepageBundle, "personas" | "organizations"> & Partial<Pick<HomepageBundle, "personas" | "organizations">>;

interface Props extends GalleryBundle {
  initialUrlState: PublicHomepageUrlState;
}

/**
 * The homepage of the static build. It hydrates with the list baked in at build
 * time, then replaces it with the live bundle so newly published or edited
 * works show up without a redeploy. If the refresh fails the baked list stays.
 */
export function LiveGalleryClient({ initialUrlState, ...initialBundle }: Props) {
  const [bundle, setBundle] = useState<GalleryBundle>(initialBundle);
  const preloadPeople = initialBundle.personas !== undefined && initialBundle.organizations !== undefined;

  useEffect(() => {
    let active = true;
    readPublicBundle<HomepageBundleResponse>(preloadPeople ? HOMEPAGE_BUNDLE_SECTIONS : HOMEPAGE_SCRIPT_BUNDLE_SECTIONS)
      .then(({ data }) => {
        if (!active) return;
        const next = parseHomepageBundle(data);
        setBundle(next);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [preloadPeople]);

  return (
    <GalleryClient
      initialScripts={bundle.scripts}
      initialExternalPublicScripts={bundle.externalPublicScripts}
      initialPersonas={preloadPeople ? bundle.personas : undefined}
      initialOrganizations={preloadPeople ? bundle.organizations : undefined}
      initialActivities={bundle.activities}
      initialBannerSlides={bundle.bannerSlides}
      showBrandHero={bundle.showBrandHero}
      initialUrlState={initialUrlState}
    />
  );
}
