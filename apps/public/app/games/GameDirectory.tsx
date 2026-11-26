"use client";

import { useEffect, useState } from "react";
import { PublicBrowseHeader } from "@/components/PublicBrowseHeader";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
import { PublicEmptyState } from "@/components/PublicEmptyState";
import { PublicSearchField } from "@/components/PublicSearchField";
import type { GameCreditsEntry } from "@/lib/gameCredits";
import { GameCard } from "./GameCard";

export function GameDirectory({ catalog, avatarsById = {} }: { catalog: GameCreditsEntry[]; avatarsById?: Record<string, string> }) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (window.location.hash.startsWith("#game-")) {
      const card = document.getElementById(window.location.hash.slice(1));
      card?.focus({ preventScroll: true });
      card?.scrollIntoView();
    }
  }, []);
  const term = query.trim().normalize("NFKC").toLocaleLowerCase();
  const games = catalog.filter((game) => {
    if (!term) return true;
    const searchable = [game.title, ...(game.performers ?? []), ...game.credits.flatMap((credit) => [credit.role, credit.attribution])];
    return searchable.some((value) => value.normalize("NFKC").toLocaleLowerCase().includes(term));
  });

  return <PublicBrowseMain>
    <PublicBrowseHeader
      title="遊戲"
      count={`${games.length} 款`}
      search={<PublicSearchField value={query} onChange={setQuery} placeholder="搜尋遊戲、角色或製作人員" />}
    />
    {games.length === 0 ? <PublicEmptyState
      className="border-y border-border"
      title={term ? "找不到符合的遊戲。" : "目前尚未收錄遊戲。"}
      primaryAction={term ? { label: "清除搜尋", onClick: () => setQuery("") } : undefined}
    /> : <ul role="list" className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {games.map((game, index) => <li key={game.appId} className="min-w-0">
        <GameCard game={game} eager={index < 3} avatarsById={avatarsById} />
      </li>)}
    </ul>}
  </PublicBrowseMain>;
}
