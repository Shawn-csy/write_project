"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Headphones, Pause, Play, RefreshCw } from "lucide-react";
import { CardMediaImage } from "@/components/CardMediaVisibility";
import { useLoopingScroll } from "@/app/gallery/useLoopingScroll";
import { publicAudioPerformers } from "@/lib/publicWorkPerformers";
import type { PublicAudioWork, PublicOrg } from "@/lib/types";

const MARQUEE_SPEED = 32;

function AudioRecommendationCard({
  work,
  organization,
  duplicate,
  activateCopy,
}: {
  work: PublicAudioWork;
  organization?: PublicOrg;
  duplicate: boolean;
  activateCopy: () => void;
}) {
  const performers = publicAudioPerformers(work).map((actor) => actor.name).slice(0, 2);
  const creatorLabel = organization?.name || work.creatorName || "";
  const subtitle = [creatorLabel, performers.length > 0 ? performers.join("、") : ""].filter(Boolean).join(" · ");
  const Title = duplicate ? "div" : "h3";

  return (
    <article
      className="public-spotlight-card relative flex h-32 gap-3 overflow-hidden rounded-md px-1 py-1.5 text-card-foreground"
      onMouseMove={(event) => {
        const { left, top } = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--public-spotlight-x", `${event.clientX - left}px`);
        event.currentTarget.style.setProperty("--public-spotlight-y", `${event.clientY - top}px`);
      }}
    >
      <div className="relative h-full w-28 shrink-0 overflow-hidden rounded-sm bg-muted" aria-hidden="true">
        {work.coverUrl ? (
          <CardMediaImage src={work.coverUrl} alt="" preset="script-cover" sizes="112px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Headphones className="h-6 w-6" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Title className="line-clamp-2 text-sm font-semibold leading-[1.3]">
          {duplicate ? (
            <span onClick={activateCopy}>{work.title}</span>
          ) : (
            <a
              data-rec-action="primary"
              href={work.url}
              target="_blank"
              rel="noopener noreferrer"
              className="after:absolute after:inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-link"
            >
              {work.title}
            </a>
          )}
        </Title>
        {subtitle && (
          <div className="mt-1 truncate [font-size:var(--public-font-caption)] leading-4 text-muted-foreground">
            {subtitle}
          </div>
        )}
        <p className="mt-1 line-clamp-2 [font-size:var(--public-font-caption)] leading-[1.35] text-muted-foreground">
          {work.description?.trim() || "前往原始平台收聽完整音聲"}
        </p>
        {work.accessType && (
          <div className="mt-auto flex items-center gap-2 pt-0.5 [font-size:var(--public-font-caption)] leading-4">
            <span className={work.accessType === "free" ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
              {work.accessType === "free" ? "免費收聽" : "付費作品"}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

export function RandomAudioWorkStrip({
  works,
  orgById,
  onShuffle,
}: {
  works: PublicAudioWork[];
  orgById: Map<string, PublicOrg>;
  onShuffle: () => void;
}) {
  const resetKey = useMemo(() => works.map((work) => work.id).join("|"), [works]);
  const { trackRef, move, looping, cycles, paused, togglePaused, reducedMotion, interactionProps } = useLoopingScroll(
    works.length,
    resetKey,
    MARQUEE_SPEED,
  );
  const playbackLabel = paused ? "繼續播放隨機推薦" : "暫停隨機推薦";
  if (!works.length) return null;

  return (
    <section aria-label="隨機音聲推薦" data-testid="random-audio-recommendation-strip">
      <div className="section-bar mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">隨機推薦</h2>
        <div className="flex items-center gap-2">
          {looping && (
            <>
              <button
                type="button"
                aria-label="上一則隨機推薦"
                onClick={() => move(-1)}
                className="public-arrow-motion public-arrow-back inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="下一則隨機推薦"
                onClick={() => move(1)}
                className="public-arrow-motion public-arrow-forward inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
              {!reducedMotion && (
                <button
                  type="button"
                  aria-label={playbackLabel}
                  title={playbackLabel}
                  onClick={togglePaused}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
                </button>
              )}
            </>
          )}
          <button type="button" onClick={onShuffle} className="inline-flex h-8 items-center gap-1 text-xs text-link hover:underline">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />換一批
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        data-testid="audio-recommendation-track"
        data-looping={looping}
        className="recommendation-marquee flex gap-3 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        {...interactionProps}
      >
        {cycles.flatMap((cycle) =>
          works.map((work, index) => {
            const duplicate = cycle !== "original";
            const activateCopy = () => {
              (trackRef.current?.querySelector(`[data-rec-index="${index}"] [data-rec-action="primary"]`) as HTMLAnchorElement | null)?.click();
            };
            return (
              <div
                key={`${cycle}-${work.id}`}
                data-rec-index={duplicate ? undefined : index}
                aria-hidden={duplicate || undefined}
                className={`${looping ? "w-[88%] sm:w-[21rem]" : "w-full max-w-[21rem]"} shrink-0`}
                onClick={duplicate ? activateCopy : undefined}
              >
                <AudioRecommendationCard
                  work={work}
                  organization={work.organizationId ? orgById.get(work.organizationId) : undefined}
                  duplicate={duplicate}
                  activateCopy={activateCopy}
                />
              </div>
            );
          }),
        )}
      </div>
    </section>
  );
}
