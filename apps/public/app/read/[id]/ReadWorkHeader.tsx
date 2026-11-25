"use client";

import React from "react";
import { PublicImage } from "@/components/PublicImage";
import { demoArtwork } from "@/lib/demoArtwork";
import { PublicVoiceTypes, PublicWorkDetails } from "@/components/PublicWorkDetails";
import { PublicPersonLink, PublicPlayLink } from "@/components/PublicDirectoryDetails";
import { usePublicDemoIdentities } from "@/lib/usePublicDemoIdentities";
import { publicDemoPerformers } from "@/lib/publicWorkPerformers";
import { PublicScriptInfoOverlay } from "@write/public-ui";
import type { ReadWorkHeaderModel } from "@/lib/readWorkHeaderModel";

interface Props {
  model: ReadWorkHeaderModel;
  actions: {
    onLike: () => void;
  };
}

/**
 * Canonical read-page work header.
 * Renders from a stable ReadWorkHeaderModel, not from raw PublicScript props.
 * Delegates visual composition to PublicScriptInfoOverlay (transitional).
 */
export function ReadWorkHeader({ model }: Props) {
  const demoIdentities = usePublicDemoIdentities(model.demoLinks);
  const author = model.author;
  return (
    <>
      <PublicScriptInfoOverlay
        title={model.title}
        synopsis={model.synopsis}
        coverUrl={model.coverUrl}
        coverCrop={model.coverCrop}
        coverDesign={model.coverDesign}
        author={
          model.author
            ? {
                id: model.author.id,
                displayName: model.author.displayName,
                avatarUrl: model.author.avatarUrl,
              }
            : null
        }
        renderAuthor={author?.href ? () => (
          <PublicPersonLink href={author.href} name={author.displayName} avatar={author.avatarUrl} compact className="text-sm" />
        ) : undefined}
        organization={
          model.organization
            ? {
                id: model.organization.id,
                name: model.organization.name,
                logoUrl: model.organization.logoUrl,
              }
            : null
        }
        tags={model.tags}
        tagHref={(tag) => `/tag/${encodeURIComponent(tag)}`}
        views={model.views}
        durationMinutes={model.durationMinutes}
        dialogueChars={model.dialogueChars}
        license={model.license}
        commercialUse={model.commercialUse}
        derivativeUse={model.derivativeUse}
        notifyOnModify={model.notifyOnModify}
        licenseSpecialTerms={model.licenseSpecialTerms}
        targetAudience={model.targetAudience}
        contentRating={model.contentRating}
        prefaceItems={model.prefaceItems}
        demoLinks={model.demoLinks}
        renderDemoLink={(item, index) => {
          const artwork = demoArtwork(item.url, item.coverUrl, model.coverUrl ?? "");
          return <PublicWorkDetails
            title={item.name || `試聽連結 ${index + 1}`}
            action={<PublicPlayLink href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs">試聽</PublicPlayLink>}
            meta={<PublicVoiceTypes types={item.voiceTypes} />}
            artwork={artwork ? <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
              <PublicImage src={artwork} alt="" preset="thumbnail" />
            </div> : undefined}
            performers={publicDemoPerformers(item, demoIdentities)}
            description={item.description}
          />;
        }}
        customFields={model.customFields}
      />
      {model.series && (
        <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
          <a
            href={model.series.href}
            className="inline-flex h-6 items-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {model.series.name}
          </a>
          {typeof model.series.order === "number" && (
            <span className="inline-flex h-6 items-center rounded-md border border-border bg-muted px-2.5 text-xs font-medium text-muted-foreground">
              {model.series.order === 0 ? "設定／背景" : `第 ${model.series.order} 部`}
            </span>
          )}
        </div>
      )}
    </>
  );
}
