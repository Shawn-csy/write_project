"use client";

import { useEffect, useState } from "react";
import { DEFAULT_URL_STATE, useGalleryFilterModel } from "@write/public-ui";
import { GalleryAuthorGrid } from "@/app/gallery/GalleryPeopleGrid";
import { useGalleryUrlState } from "@/app/gallery/useGalleryUrlState";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
import { AUTHOR_DIRECTORY_SECTIONS, buildAuthorDirectory, type AuthorDirectory } from "@/lib/authorDirectory";
import type { HomepageBundleResponse } from "@/lib/homepageBundle";
import { readPublicBundle } from "@/lib/readPublicBundle";

const EMPTY_SCRIPTS: [] = [];
const EMPTY_TAGS: string[] = [];
const INITIAL_URL_STATE = { ...DEFAULT_URL_STATE, view: "authors" as const };

export function AuthorDirectoryClient({ initialDirectory, refreshOnMount }: {
  initialDirectory: AuthorDirectory | null;
  refreshOnMount: boolean;
}) {
  const [directory, setDirectory] = useState(initialDirectory);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const { state, actions } = useGalleryUrlState(INITIAL_URL_STATE);

  useEffect(() => {
    if (!refreshOnMount) return;
    let active = true;
    void readPublicBundle<HomepageBundleResponse>(AUTHOR_DIRECTORY_SECTIONS).then(({ data }) => {
      if (active) setDirectory(buildAuthorDirectory(data));
    }).catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [loadAttempt, refreshOnMount]);

  const { filteredAuthors, authorTags } = useGalleryFilterModel({
    scripts: EMPTY_SCRIPTS,
    authors: directory?.searchIndex,
    searchNeedle: state.q.toLowerCase(),
    selectedTags: EMPTY_TAGS,
    selectedAuthorTags: state.authorTags,
    segmentFilter: INITIAL_URL_STATE.segment,
    usageFilter: INITIAL_URL_STATE.usage,
  });

  return (
    <div className="modern-homepage flex flex-1 flex-col bg-background">
      <PublicBrowseMain>
        <GalleryAuthorGrid
          authors={directory?.authors ?? []}
          worksByAuthor={directory?.worksByAuthor}
          filteredAuthors={filteredAuthors}
          peopleStatus={directory ? "loaded" : loadFailed ? "error" : "loading"}
          onRetry={() => { setLoadFailed(false); setLoadAttempt((attempt) => attempt + 1); }}
          allTags={authorTags}
          selectedTags={state.authorTags}
          onToggleTag={actions.toggleAuthorTag}
          onResetFilters={actions.resetAuthorTags}
          searchTerm={state.q}
          onSearchChange={actions.setQ}
        />
      </PublicBrowseMain>
    </div>
  );
}
