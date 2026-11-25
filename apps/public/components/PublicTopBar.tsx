"use client";

/**
 * PublicTopBar — the single public-site navigation composition.
 * PublicShellTopBar owns layout; this component owns links and actions.
 */

import { type ReactNode, useCallback, useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { MoreHorizontal } from "lucide-react";
import { SITE_BRAND_NAME } from "@/lib/seo";
import { PublicShellTopBar } from "@write/public-ui";
import { PublicShellActions } from "@/components/PublicShellActions";
import { LazyPublicFeedbackDialog } from "@/components/LazyPublicFeedbackDialog";
import { PublicMobileActionSheet } from "@/components/PublicMobileActionSheet";
import { PUBLIC_SECTION_TABS } from "@/lib/publicNavigation";

function SectionLinkPending() {
  const { pending } = useLinkStatus();
  return <span
    aria-hidden="true"
    data-pending={pending ? "true" : undefined}
    className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-link opacity-0 transition-opacity duration-150 data-[pending=true]:opacity-100 data-[pending=true]:delay-150 motion-reduce:duration-0"
  />;
}

const renderInternalLink = ({ href, className, ariaCurrent, children }: { href: string; className: string; ariaCurrent?: "page"; children: ReactNode }) => (
  <Link
    href={href}
    className={className}
    aria-current={ariaCurrent}
    prefetch={href === "/authors" || href === "/resources" || href === "/voice-actors" ? false : undefined}
  >
    {children}
    {href !== "/" && !ariaCurrent && <SectionLinkPending />}
  </Link>
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
  homeCurrent?: boolean;
  tabs?: TopBarTab[];
  additionalTabs?: TopBarTab[];
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  /** Override the standard public actions rendered on the right. */
  trailing?: ReactNode;
}

const DEFAULT_TABS: TopBarTab[] = PUBLIC_SECTION_TABS.map((tab) => ({ ...tab }));

function MobileMoreButton({ onClick, open }: { onClick: () => void; open: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="更多選項"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? "mobile-action-sheet" : undefined}
      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <MoreHorizontal className="h-[18px] w-[18px]" />
    </button>
  );
}

export function PublicTopBar({
  activeTab,
  homeCurrent = false,
  tabs = DEFAULT_TABS,
  additionalTabs = [],
  showBack = false,
  backHref = "/",
  backLabel = "返回",
  trailing = <PublicShellActions />,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = useCallback(() => setMoreOpen(false), []);
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
        brandCurrent={homeCurrent}
        brandSubtitle={SITE_BRAND_NAME}
        brandLeading={showBack ? <Link href={backHref} aria-label={backLabel} className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">←</Link> : undefined}
        trailing={trailing}
        mobileTrailingAction={<MobileMoreButton onClick={() => setMoreOpen(true)} open={moreOpen} />}
        renderLink={renderInternalLink}
      />
      <LazyPublicFeedbackDialog mode="bug" hideTrigger open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      {moreOpen && (
        <PublicMobileActionSheet
          onClose={closeMore}
          onOpenFeedback={() => setFeedbackOpen(true)}
          activeTab={activeTab || ""}
        />
      )}
    </>
  );
}
