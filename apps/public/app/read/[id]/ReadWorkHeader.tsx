"use client";

import React from "react";
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
export function ReadWorkHeader({ model, actions }: Props) {
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
              }
            : null
        }
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
        likes={model.likes}
        isLiked={model.isLiked}
        onLike={actions.onLike}
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
        customFields={model.customFields}
      />
      {model.series && (
        <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
          <a
            href={model.series.href}
            className="inline-flex h-6 items-center rounded-[5px] border border-border/50 bg-transparent px-2.5 text-xs font-medium text-muted-foreground transition-all duration-150 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
          >
            {model.series.name}
          </a>
          {typeof model.series.order === "number" && (
            <span className="inline-flex h-6 items-center rounded-[5px] border border-border/40 bg-muted/40 px-2.5 text-xs font-medium text-muted-foreground">
              {model.series.order === 0 ? "設定／背景" : `第 ${model.series.order} 部`}
            </span>
          )}
        </div>
      )}
    </>
  );
}
