"use client";

import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { PublicCatalogWorkCard } from "@/components/PublicCatalogWorkCard";
import { PublicContentLink, PublicPersonLink } from "@/components/PublicDirectoryDetails";
import { PublicImage } from "@/components/PublicImage";
import { PublicCast } from "@/components/PublicWorkDetails";
import { gameCreditIdentity, type GameCredit, type GameCreditsEntry } from "@/lib/gameCredits";
import gameDetailsMap from "@/lib/gameDetails.json";

const detailsByAppId = gameDetailsMap as Record<string, { developers?: string[]; releaseDate?: string }>;

function GameAttribution({ credit, avatarsById }: { credit: GameCredit; avatarsById: Record<string, string> }) {
  const profile = gameCreditIdentity(credit);
  if (!profile) return credit.attribution;

  const index = credit.attribution.indexOf(profile.name);
  if (index === -1) return credit.attribution;

  return <>
    {credit.attribution.slice(0, index)}
    <PublicPersonLink href={`/author/${encodeURIComponent(profile.id)}`} name={profile.name} avatar={avatarsById[profile.id]} compact />
    {credit.attribution.slice(index + profile.name.length)}
  </>;
}

export function GameCard({ game, eager = false, heading = "h2", avatarsById = {} }: {
  game: GameCreditsEntry;
  eager?: boolean;
  heading?: "h2" | "h3";
  avatarsById?: Record<string, string>;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const detail = detailsByAppId[game.appId];
  const steamAppUrl = `https://store.steampowered.com/app/${game.appId}/`;
  const profiles = game.credits.map(gameCreditIdentity);
  const performers = game.performers?.map((name) => {
    const profile = profiles.find((item) => item?.name === name);
    return { name, href: profile ? `/author/${encodeURIComponent(profile.id)}` : undefined, avatar: profile ? avatarsById[profile.id] : undefined };
  });

  return <PublicCatalogWorkCard
    id={heading === "h2" ? `game-${game.appId}` : undefined}
    tabIndex={heading === "h2" ? -1 : undefined}
    className={`scroll-mt-32 focus:border-primary focus:outline-2 focus:outline-ring ${eager ? "public-featured-glare" : ""}`}
    title={game.title}
    heading={heading}
    href={`${steamAppUrl}?l=tchinese`}
    titleHref={`/games/${game.appId}`}
    sourceLabel="Steam 商店"
    hasArtwork={!imageFailed}
    linkArtwork
    artwork={imageFailed
      ? <Gamepad2 className="absolute inset-0 m-auto size-8 text-muted-foreground/50" aria-hidden />
      : <PublicImage src={game.screenshotUrl} alt={`${game.title}封面`} preset="script-cover" eager={eager} onError={() => setImageFailed(true)} />}
    details={game.credits.length > 0 && <section className="mt-2">
      <h4 className="text-sm font-semibold">製作人員</h4>
      <dl className="mt-1 grid grid-cols-[fit-content(42%)_minmax(0,1fr)] gap-x-3 gap-y-1 leading-relaxed">
        {game.credits.map((credit) => (
          <div className="contents" key={`${credit.role}-${credit.attribution}`}>
            <dt className="text-muted-foreground [overflow-wrap:anywhere]">{credit.role}</dt>
            <dd className="[overflow-wrap:anywhere]">
              <GameAttribution credit={credit} avatarsById={avatarsById} />
              {!credit.sourceUrl.startsWith(steamAppUrl) && <PublicContentLink
                href={credit.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`來源 · ${credit.sourceLabel ?? credit.role} · ${game.title}`}
                className="ms-2 text-xs"
                arrow
              >來源</PublicContentLink>}
            </dd>
          </div>
        ))}
      </dl>
    </section>}
  >
    {(detail?.developers?.length || detail?.releaseDate) && (
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        {detail.developers?.length ? <span>{detail.developers.join("、")}</span> : null}
        {detail.releaseDate ? <time>{detail.releaseDate}</time> : null}
      </div>
    )}
    {performers?.length ? <div className="mt-2"><PublicCast performers={performers} compact /></div> : null}
  </PublicCatalogWorkCard>;
}
