import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { gameCatalog, gameResourceAvatars } from "@/lib/gameCatalog";
import { gameCreditIdentity } from "@/lib/gameCredits";
import gameDetailsMap from "@/lib/gameDetails.json";
import { BASE_URL, SITE_NAME, TITLE_SUFFIX } from "@/lib/seo";
import type { PublicPersona } from "@/lib/types";
import { PublicBackButton } from "@/components/PublicBackButton";
import { PublicContentLink, PublicPersonLink, PublicTag } from "@/components/PublicDirectoryDetails";
import { PublicImage } from "@/components/PublicImage";
import { PublicCast } from "@/components/PublicWorkDetails";
import { GameAgeGate } from "../GameAgeGate";

interface GameDetailMeta {
  developers: string[];
  publishers: string[];
  releaseDate: string;
  shortDescription: string;
  audioLanguages: string[];
  genres: string[];
  screenshots: string[];
}

const detailsByAppId = gameDetailsMap as Record<string, GameDetailMeta>;

export const dynamicParams = false;

export function generateStaticParams() {
  return gameCatalog.map(({ appId }) => ({ appId }));
}

export async function generateMetadata({ params }: { params: Promise<{ appId: string }> }): Promise<Metadata> {
  const { appId } = await params;
  const game = gameCatalog.find((entry) => entry.appId === appId);
  if (!game) return { title: `找不到遊戲｜${TITLE_SUFFIX}` };
  const detail = detailsByAppId[appId];

  const title = `${game.title}｜遊戲｜${TITLE_SUFFIX}`;
  const description = (detail?.shortDescription || `${game.title} 的公開演出與製作署名（配音、美術、後製、錄音、音樂）。`).slice(0, 200);
  const canonical = `${BASE_URL}/games/${appId}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "zh_TW",
      images: [{ url: game.screenshotUrl, alt: game.title }],
    },
  };
}

export default async function GameDetailPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const game = gameCatalog.find((entry) => entry.appId === appId);
  if (!game) notFound();
  const detail = detailsByAppId[appId];

  let avatarsById: Record<string, string> = { ...gameResourceAvatars };
  try {
    const bundle = await apiFetch<{ personas?: PublicPersona[] }>("/public-bundle?sections=personas", { next: { revalidate: 300, tags: ["public-bundle"] } });
    if (Array.isArray(bundle.personas)) {
      avatarsById = {
        ...gameResourceAvatars,
        ...Object.fromEntries(bundle.personas.filter((p) => p.avatar).map((p) => [p.id, p.avatar!])),
      };
    }
  } catch {
    // Fallback without avatars if API is unavailable.
  }

  const steamAppUrl = `https://store.steampowered.com/app/${game.appId}/`;
  const profiles = game.credits.map(gameCreditIdentity);
  const performers = (game.performers ?? []).map((name) => {
    const profile = profiles.find((item) => item?.name === name);
    return {
      name,
      href: profile ? `/author/${encodeURIComponent(profile.id)}` : undefined,
      avatar: profile ? avatarsById[profile.id] : undefined,
    };
  });

  const infoRows: Array<{ label: string; value: string }> = [
    ...(detail?.developers?.length ? [{ label: "開發", value: detail.developers.join("、") }] : []),
    ...(detail?.publishers?.length ? [{ label: "發行", value: detail.publishers.join("、") }] : []),
    ...(detail?.releaseDate ? [{ label: "發售日", value: detail.releaseDate }] : []),
    ...(detail?.audioLanguages?.length ? [{ label: "語音支援", value: detail.audioLanguages.join("、") }] : []),
  ];

  const extraScreenshots = (detail?.screenshots ?? []).filter((src) => src !== game.screenshotUrl);

  return (
    <GameAgeGate>
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="pt-4">
            <PublicBackButton label="返回遊戲" href="/games" />
          </div>

          <section className="mb-6 mt-3 grid gap-5 border-b border-border pb-6 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] md:items-start">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
              <PublicImage src={game.screenshotUrl} alt={`${game.title}封面`} preset="script-cover" eager />
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-sm bg-seal px-1.5 py-0.5 text-xs font-bold text-white">成人向</span>
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">遊戲</span>
                {(detail?.genres ?? []).map((genre) => (
                  <PublicTag key={genre}>{genre}</PublicTag>
                ))}
              </div>
              <h1 className="break-words text-2xl font-bold leading-tight">{game.title}</h1>
              {detail?.shortDescription && (
                <p className="max-w-3xl text-sm leading-6 text-foreground/85">{detail.shortDescription}</p>
              )}
              {infoRows.length > 0 && (
                <dl className="grid gap-y-1 text-xs sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-3">
                  {infoRows.map((row) => (
                    <div key={row.label} className="contents">
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="text-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {performers.length > 0 && <PublicCast performers={performers} />}
              <div className="pt-1">
                <PublicContentLink href={`${steamAppUrl}?l=tchinese`} target="_blank" rel="noopener noreferrer" appearance="source" className="text-sm" arrow>
                  前往 Steam 商店
                </PublicContentLink>
              </div>
            </div>
          </section>

          {game.credits.length > 0 && (
            <section className="mb-6" aria-label="製作人員">
              <div className="section-bar mb-2.5 flex items-baseline gap-2">
                <h2 className="text-base font-bold">製作人員</h2>
                <span className="text-xs text-muted-foreground">{game.credits.length}</span>
              </div>
              <dl className="divide-y divide-border border-y border-border text-sm">
                {game.credits.map((credit) => {
                  const profile = gameCreditIdentity(credit);
                  const idx = profile ? credit.attribution.indexOf(profile.name) : -1;
                  return (
                    <div key={`${credit.role}-${credit.attribution}`} className="grid gap-1 py-2.5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-baseline sm:gap-4">
                      <dt className="font-medium text-muted-foreground">{credit.role}</dt>
                      <dd className="min-w-0 leading-relaxed [overflow-wrap:anywhere]">
                        {profile && idx !== -1 ? (
                          <>
                            {credit.attribution.slice(0, idx)}
                            <PublicPersonLink href={`/author/${encodeURIComponent(profile.id)}`} name={profile.name} avatar={avatarsById[profile.id]} compact />
                            {credit.attribution.slice(idx + profile.name.length)}
                          </>
                        ) : credit.attribution}
                        {!credit.sourceUrl.startsWith(steamAppUrl) && (
                          <PublicContentLink
                            href={credit.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`來源 · ${credit.sourceLabel ?? credit.role} · ${game.title}`}
                            className="ms-2 text-xs"
                            arrow
                          >來源</PublicContentLink>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          )}

          {extraScreenshots.length > 0 && (
            <section className="mb-6" aria-label="遊戲截圖">
              <div className="section-bar mb-2.5 flex items-baseline gap-2">
                <h2 className="text-base font-bold">遊戲截圖</h2>
                <span className="text-xs text-muted-foreground">{extraScreenshots.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {extraScreenshots.map((src, index) => (
                  <div key={src} className="relative aspect-video overflow-hidden rounded-md border border-border bg-muted">
                    <PublicImage src={src} alt={`${game.title} 遊戲截圖 ${index + 1}`} preset="script-cover" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </GameAgeGate>
  );
}
