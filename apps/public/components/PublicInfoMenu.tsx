"use client";

import * as Popover from "@radix-ui/react-popover";
import { CircleHelp } from "lucide-react";
import Link from "next/link";

// Only actionable help links — legal/trust links live in PublicFooter.
const HELP_LINKS = [
  {
    href: "/help",
    label: "使用說明",
    description: "閱讀、發布與工作室操作",
  },
  {
    href: "/license",
    label: "授權說明",
    description: "台本使用、改作與商業使用規則",
  },
] as const;

const linkClass =
  "flex flex-col gap-0.5 px-3 py-2.5 rounded-lg transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Shareable inner content — used by popover (desktop) and nav overlay (mobile). */
export function InfoMenuContent() {
  return (
    <nav aria-label="說明與平台資訊">
      {HELP_LINKS.map(({ href, label, description }) => (
        <Link key={href} href={href} className={linkClass}>
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground leading-snug">{description}</span>
        </Link>
      ))}
    </nav>
  );
}

export function PublicInfoMenu() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="說明與平台資訊"
          title="說明與平台資訊"
          className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
        >
          <CircleHelp className="h-4 w-4" aria-hidden />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-[101] w-80 rounded-xl p-1.5"
          style={{
            border: "1px solid hsl(var(--border) / 0.6)",
            background: "hsl(var(--card))",
            boxShadow:
              "0 8px 30px hsl(var(--foreground)/0.1), 0 2px 8px hsl(var(--foreground)/0.06), 0 0 0 0.5px hsl(var(--border)/0.5)",
          }}
        >
          <InfoMenuContent />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
