"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PUBLIC_SECTION_TABS } from "@/lib/publicNavigation";
import { PublicFooter } from "./PublicFooter";
import { PublicTopBar } from "./PublicTopBar";

export function MainPublicLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()?.replace(/\/$/, "") || "/";
  const home = pathname === "/";
  const section = PUBLIC_SECTION_TABS.find((tab) => tab.href === pathname);
  const activeTab = home ? "scripts" : pathname === "/voice-actors" ? "resources" : section?.key;

  if (!activeTab && pathname !== "/activities") return children;

  return (
    <>
      <PublicTopBar activeTab={activeTab} homeCurrent={home} />
      {children}
      <PublicFooter />
    </>
  );
}
