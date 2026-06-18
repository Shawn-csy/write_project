"use client";

import React from "react";
import { PublicScriptInfoOverlay } from "@write/public-ui";
import type { ReadWorkHeaderModel } from "@/lib/readWorkHeaderModel";

interface Props {
  model: ReadWorkHeaderModel;
  actions: {
    onLike: () => void;
    onShare: () => void;
    onDownload: () => void;
    copied: boolean;
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
        <div className="flex flex-wrap items-center justify-center gap-2 pb-2 text-sm text-muted-foreground">
          <a href={model.series.href} className="hover:text-foreground underline">
            {model.series.name}
          </a>
          {typeof model.series.order === "number" && (
            <span>
              {model.series.order === 0 ? "設定／背景" : `第 ${model.series.order} 部`}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2 pb-4">
        <a
          href="#script-body"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-sm font-medium text-foreground hover:bg-background/90 transition-colors"
        >
          開始閱讀 ↓
        </a>
        <button
          type="button"
          onClick={actions.onShare}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/45 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-background/70 hover:text-foreground transition-colors"
        >
          {actions.copied ? "已複製！" : "分享"}
        </button>
        {model.canDownload && (
          <button
            type="button"
            onClick={actions.onDownload}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/45 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-background/70 hover:text-foreground transition-colors"
          >
            下載 .txt
          </button>
        )}
      </div>
    </>
  );
}
