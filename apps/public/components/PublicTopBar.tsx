"use client";

/**
 * PublicTopBar — shared top navigation for public SSR pages.
 * Uses the shared shell topbar and adds the activity link when an activity is published.
 * Pass client-side actions (theme toggle, studio link, etc.) via the `trailing` prop.
 */

import { type ReactNode } from "react";
import Link from "next/link";
import { SITE_BRAND_NAME } from "@/lib/seo";
import { useHasPublishedActivities } from "@/lib/useHasPublishedActivities";
import { PublicShellTopBar } from "@write/public-ui";
import { PublicShellActions } from "@/components/PublicShellActions";

export interface TopBarTab {
  key: string;
  label: string;
  href: string;
  hideOnTablet?: boolean;
}

interface Props {
  activeTab?: string;
  tabs?: TopBarTab[];
  additionalTabs?: TopBarTab[];
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  /** Override the standard public actions rendered on the right. */
  trailing?: ReactNode;
}

const DEFAULT_TABS: TopBarTab[] = [
  { key: "authors", label: "作者", href: "/?view=authors" },
  { key: "voice-actors", label: "聲演", href: "/voice-actors" },
  { key: "demos", label: "Demo 專區", href: "/demos" },
];

export function PublicTopBar({
  activeTab,
  tabs = DEFAULT_TABS,
  additionalTabs = [],
  showBack = false,
  backHref = "/",
  backLabel = "返回",
  trailing = <PublicShellActions />,
}: Props) {
  const hasPublishedActivity = useHasPublishedActivities();
  const visibleTabs = [...tabs];
  if (hasPublishedActivity && !visibleTabs.some((tab) => tab.key === "activities")) {
    visibleTabs.push({ key: "activities", label: "活動專區", href: "/activities" });
  }
  visibleTabs.push(...additionalTabs.filter((tab) => !visibleTabs.some((visibleTab) => visibleTab.key === tab.key)));
  return <PublicShellTopBar
    activeTab={activeTab}
    activeTabStyle="subtle"
    tabs={visibleTabs}
    brandName="公開台本"
    brandSubtitle={SITE_BRAND_NAME}
    brandLeading={showBack ? <Link href={backHref} aria-label={backLabel} className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground">←</Link> : undefined}
    trailing={trailing}
  />;
}
