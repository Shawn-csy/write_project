"use client";

/**
 * PublicTopBar — the single public-site navigation composition.
 * PublicShellTopBar owns layout; this component owns links and actions.
 */

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { SITE_BRAND_NAME } from "@/lib/seo";
import { PublicShellTopBar } from "@write/public-ui";
import { PublicShellActions } from "@/components/PublicShellActions";
import { LazyPublicFeedbackDialog } from "@/components/LazyPublicFeedbackDialog";
import { PublicMobileActionSheet } from "@/components/PublicMobileActionSheet";
import { PUBLIC_SECTION_TABS } from "@/lib/publicNavigation";

const renderInternalLink = ({ href, className, ariaCurrent, children }: { href: string; className: string; ariaCurrent?: "page"; children: ReactNode }) => (
  <Link
    href={href}
    className={className}
    aria-current={ariaCurrent}
    prefetch={href === "/authors" || href === "/resources" || href === "/voice-actors" || href === "/audio-works" ? false : undefined}
  >{children}</Link>
);

export interface TopBarTab {
  key: string;
  label: string;
  href?: string;
  onSelect?: () => void;
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

const DEFAULT_TABS: TopBarTab[] = PUBLIC_SECTION_TABS.map((tab) => ({ ...tab }));

function MobileMoreButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="更多選項"
      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-all duration-150 hover:bg-muted/70 hover:text-foreground"
    >
      <MoreHorizontal className="h-[18px] w-[18px]" />
    </button>
  );
}

export function PublicTopBar({
  activeTab,
  tabs = DEFAULT_TABS,
  additionalTabs = [],
  showBack = false,
  backHref = "/",
  backLabel = "返回",
  trailing = <PublicShellActions />,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const visibleTabs = [...tabs];
  visibleTabs.push(...additionalTabs.filter((tab) => !visibleTabs.some((visibleTab) => visibleTab.key === tab.key)));
  return (
    <>
      <PublicShellTopBar
        activeTab={activeTab}
        activeTabStyle="subtle"
        tabs={visibleTabs}
        brandName="公開台本"
        brandSubtitle={SITE_BRAND_NAME}
        brandLeading={showBack ? <Link href={backHref} aria-label={backLabel} className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground">←</Link> : undefined}
        trailing={trailing}
        mobileTrailingAction={<MobileMoreButton onClick={() => setMoreOpen(true)} />}
        renderLink={renderInternalLink}
      />
      <LazyPublicFeedbackDialog mode="bug" hideTrigger open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      {moreOpen && (
        <PublicMobileActionSheet
          onClose={() => setMoreOpen(false)}
          onOpenFeedback={() => setFeedbackOpen(true)}
          activeTab={activeTab || ""}
        />
      )}
    </>
  );
}
