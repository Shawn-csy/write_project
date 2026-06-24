"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CircleHelp } from "lucide-react";

const itemClass =
  "block px-4 py-2 text-sm text-muted-foreground outline-none cursor-pointer select-none hover:text-foreground hover:bg-muted focus:text-foreground focus:bg-muted transition-colors";

const TOP_LINKS = [
  { href: "/help",    label: "使用說明" },
  { href: "/license", label: "授權說明" },
  { href: "/about",   label: "關於我們" },
] as const;

const POLICY_LINKS = [
  { href: "/privacy", label: "隱私政策" },
  { href: "/terms",   label: "使用條款" },
] as const;

export function PublicInfoMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="說明與平台資訊"
          title="說明與平台資訊"
          className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <CircleHelp className="h-4 w-4" aria-hidden />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-[101] w-40 rounded-lg border border-border/60 bg-background shadow-md py-1 text-sm"
        >
          {TOP_LINKS.map(({ href, label }) => (
            <DropdownMenu.Item key={href} asChild>
              <a href={href} className={itemClass}>{label}</a>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator data-testid="public-info-menu-separator" className="my-1 border-t border-border/40" />
          {POLICY_LINKS.map(({ href, label }) => (
            <DropdownMenu.Item key={href} asChild>
              <a href={href} className={itemClass}>{label}</a>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
