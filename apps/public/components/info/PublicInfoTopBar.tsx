/** Shared public navigation used on informational and legal pages. */

import { PublicTopBar } from "@/components/PublicTopBar";

const INFO_TABS = [
  { key: "about", label: "關於", href: "/about", hideOnTablet: true },
  { key: "help", label: "說明", href: "/help", hideOnTablet: true },
  { key: "license", label: "授權", href: "/license", hideOnTablet: true },
  { key: "privacy", label: "隱私權", href: "/privacy", hideOnTablet: true },
  { key: "terms", label: "使用條款", href: "/terms", hideOnTablet: true },
];

type InfoTabKey = (typeof INFO_TABS)[number]["key"];

interface Props {
  activeKey?: InfoTabKey;
}

export function PublicInfoTopBar({ activeKey }: Props) {
  return (
    <PublicTopBar
      activeTab={activeKey}
      additionalTabs={INFO_TABS}
    />
  );
}
