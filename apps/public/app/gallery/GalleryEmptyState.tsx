"use client";

import { DocumentIcon } from "./GalleryIcons";
import { PublicEmptyState } from "@/components/PublicEmptyState";

interface GalleryEmptyStateProps {
  /** "no-match" shows reset button; "no-public-scripts" | "no-data" shows generic message */
  reason: "no-match" | "no-public-scripts" | "no-data";
  onResetFilters?: () => void;
  /** Extra className applied to the outer wrapper (e.g. "col-span-full" for grid contexts) */
  className?: string;
}

export function GalleryEmptyState({ reason, onResetFilters, className = "" }: GalleryEmptyStateProps) {
  const icon = <DocumentIcon className="h-5 w-5" />;

  if (reason === "no-match") {
    return (
      <PublicEmptyState
        className={className}
        icon={icon}
        title="找不到符合條件的台本"
        description="試試減少篩選條件、換個關鍵字，或到作者與 Demo 專區逛逛。"
        primaryAction={onResetFilters ? { label: "清除篩選", onClick: onResetFilters } : undefined}
        secondaryAction={{ label: "看看 Demo 專區", href: "/demos" }}
      />
    );
  }

  return (
    <PublicEmptyState
      className={className}
      icon={icon}
      title="目前沒有公開台本"
      description="作者們還在準備中，可以先看看作者與 Demo 專區。"
      primaryAction={{ label: "瀏覽作者", href: "/?view=authors" }}
      secondaryAction={{ label: "看看 Demo 專區", href: "/demos" }}
    />
  );
}
