/**
 * PublicInfoDocument — server-only editorial layout for static info pages.
 * No "use client". No hooks. No animation.
 *
 * Establishes a plain text-first first viewport.
 * Nested cards, icon blocks, and multi-card lists belong below the fold.
 */

import type { ReactNode } from "react";

interface PublicInfoDocumentProps {
  children: ReactNode;
}

/**
 * Top-level editorial document wrapper.
 * Provides consistent vertical rhythm for info page content.
 */
export function PublicInfoDocument({ children }: PublicInfoDocumentProps) {
  return (
    <div className="space-y-10">
      {children}
    </div>
  );
}

interface PublicInfoLeadProps {
  children: ReactNode;
}

/**
 * Lead section — first-viewport plain text area.
 * Use prose (paragraphs, lists, inline links) only. No cards.
 */
export function PublicInfoLead({ children }: PublicInfoLeadProps) {
  return (
    <section className="space-y-4 text-sm text-muted-foreground leading-relaxed">
      {children}
    </section>
  );
}

interface PublicInfoBelowFoldProps {
  children: ReactNode;
}

/**
 * Below-fold content area — cards, update lists, contact blocks live here.
 * Visually separated from the lead section.
 */
export function PublicInfoBelowFold({ children }: PublicInfoBelowFoldProps) {
  return (
    <div className="space-y-6 pt-2 border-t border-border/40">
      {children}
    </div>
  );
}
