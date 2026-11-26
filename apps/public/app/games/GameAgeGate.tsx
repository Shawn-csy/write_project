"use client";

import type { ReactNode } from "react";
import { AdultContentNotice } from "@/components/AdultContentNotice";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
import { useResourceAgeGate } from "@/lib/useResourceAgeGate";

export function GameAgeGate({ children }: { children: ReactNode }) {
  const { confirmed, ready, confirm } = useResourceAgeGate();

  if (!confirmed) {
    return <PublicBrowseMain width="narrow">
      {ready && <AdultContentNotice scope="games" onConfirm={confirm} />}
    </PublicBrowseMain>;
  }

  return children;
}
