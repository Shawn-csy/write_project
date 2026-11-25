"use client";

import { useMemo, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RefreshCw } from "lucide-react";
import { CoverPlaceholder, CoverRenderer, useGalleryHoverPreview, type ScriptNavigationPolicy } from "@write/public-ui";
import { CardMediaImage } from "@/components/CardMediaVisibility";
import { trackExternalView } from "@/lib/externalScriptCard";
import { projectRecommendation, type MixedGalleryEntry, type RecommendationCardData } from "./recommendationModel";
import { useLoopingScroll } from "./useLoopingScroll";

const MARQUEE_SPEED = 32;

function RecommendationCard({ card, duplicate, activateCopy }: {
  card: RecommendationCardData;
  duplicate: boolean;
  activateCopy: (action: string) => void;
}) {
  const preview = useGalleryHoverPreview();
  const detail = { title: card.title, author: card.author, outline: card.outline || card.summary || "尚未提供簡介", label: "作品簡介" };
  const activate = (event: MouseEvent, action: string) => {
    event.stopPropagation();
    activateCopy(action);
  };
  const Title = duplicate ? "div" : "h3";
  return (
    <article className="public-spotlight-card relative flex h-32 gap-3 overflow-hidden rounded-md px-1 py-1.5 text-card-foreground"
      onMouseEnter={(event) => preview?.show(detail, event.clientX, event.clientY)}
      onMouseMove={(event) => {
        const { left, top } = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--public-spotlight-x", `${event.clientX - left}px`);
        event.currentTarget.style.setProperty("--public-spotlight-y", `${event.clientY - top}px`);
        preview?.move(event.clientX, event.clientY);
      }}
      onMouseLeave={() => preview?.hide()}
      onFocus={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        preview?.show(detail, rect.right + 8, rect.top);
      }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) preview?.hide(); }}>
      <div className="relative h-full w-[4.5rem] shrink-0 overflow-hidden rounded-sm bg-muted" aria-hidden="true">
        {card.coverUrl ? (
          <CardMediaImage src={card.coverUrl} crop={card.coverCrop} alt="" preset="script-cover" sizes="72px" />
        ) : card.coverDesign ? (
          <CoverRenderer design={card.coverDesign} title={card.title} compact responsive className="h-full w-full" />
        ) : <CoverPlaceholder title={card.title} compact className="h-full w-full" />}
        {card.showAgeGate && <span className="absolute left-0 top-0 bg-seal px-1 text-[10px] font-bold leading-5 text-white">R18</span>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Title className="line-clamp-2 text-sm font-semibold leading-[1.3]">
          {duplicate ? <span>{card.title}</span> : (
            <a data-rec-action="primary" href={card.href} target={card.external ? "_blank" : undefined}
              rel={card.external ? "noopener noreferrer" : undefined}
              onClick={() => { preview?.hide(); if (card.externalViewId) trackExternalView(card.externalViewId); }}
              className="after:absolute after:inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-link">
              {card.title}
            </a>
          )}
        </Title>
        <div className="mt-1 flex min-w-0 items-center gap-1 [font-size:var(--public-font-caption)] leading-4 text-muted-foreground">
          {card.authorHref ? duplicate ? (
            <span className="relative z-10 cursor-pointer truncate text-link" onClick={(event) => activate(event, "author")}>{card.author}</span>
          ) : (
            <a data-rec-action="author" href={card.authorHref} className="relative z-10 truncate text-link hover:underline">{card.author}</a>
          ) : <span className="truncate">{card.author || "未提供作者"}</span>}
          {card.chapterCount && <span className="shrink-0">· {card.chapterCount} 篇</span>}
        </div>
        <p className="mt-1 line-clamp-2 [font-size:var(--public-font-caption)] leading-[1.35] text-muted-foreground">{card.summary || "尚未提供簡介"}</p>
        <div className="mt-auto flex items-center gap-2 pt-0.5 [font-size:var(--public-font-caption)] leading-4">
          {card.showAgeGate && <span className="font-semibold text-seal">成人向</span>}
          {card.demoHref && (duplicate ? (
            <span className="relative z-10 cursor-pointer text-link" onClick={(event) => activate(event, "demo")}>Demo</span>
          ) : (
            <a data-rec-action="demo" href={card.demoHref} aria-label={`查看「${card.title}」的 Demo`} className="relative z-10 text-link hover:underline">Demo</a>
          ))}
        </div>
      </div>
    </article>
  );
}

export function RandomRecommendationStrip({ entries, navigationPolicyMap, onShuffle }: {
  entries: MixedGalleryEntry[];
  navigationPolicyMap: Map<string, ScriptNavigationPolicy>;
  onShuffle: () => void;
}) {
  const cards = useMemo(() => entries.map((entry) => projectRecommendation(entry, navigationPolicyMap)), [entries, navigationPolicyMap]);
  const resetKey = cards.map((card) => card.id).join("|");
  const { trackRef, move, looping, cycles, paused, togglePaused, reducedMotion, interactionProps } = useLoopingScroll(cards.length, resetKey, MARQUEE_SPEED);
  const playbackLabel = paused ? "繼續播放隨機推薦" : "暫停隨機推薦";
  if (!cards.length) return null;
  return (
    <section aria-label="隨機推薦" data-testid="random-recommendation-strip">
      <div className="section-bar mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">隨機推薦</h2>
        <div className="flex items-center gap-2">
          {looping && <>
            <button type="button" aria-label="上一則隨機推薦" onClick={() => move(-1)} className="public-arrow-motion public-arrow-back inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronLeft className="h-4 w-4" aria-hidden /></button>
            <button type="button" aria-label="下一則隨機推薦" onClick={() => move(1)} className="public-arrow-motion public-arrow-forward inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronRight className="h-4 w-4" aria-hidden /></button>
            {!reducedMotion && (
              <button type="button" aria-label={playbackLabel} title={playbackLabel} onClick={togglePaused} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                {paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
              </button>
            )}
          </>}
          <button type="button" onClick={onShuffle} className="inline-flex h-8 items-center gap-1 text-xs text-link hover:underline">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />換一批
          </button>
        </div>
      </div>
      <div ref={trackRef} data-testid="recommendation-track" data-looping={looping}
        className="recommendation-marquee flex gap-3 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" {...interactionProps}>
        {cycles.flatMap((cycle) => cards.map((card, index) => {
          const duplicate = cycle !== "original";
          const activateCopy = (action: string) => {
            (trackRef.current?.querySelector(`[data-rec-index="${index}"] [data-rec-action="${action}"]`) as HTMLAnchorElement | null)?.click();
          };
          return (
            <div key={`${cycle}-${card.id}`} data-rec-index={duplicate ? undefined : index}
              aria-hidden={duplicate || undefined}
              className={`${looping ? "w-[88%] sm:w-[19rem]" : "w-full max-w-[19rem]"} shrink-0`}
              onClick={duplicate ? () => activateCopy("primary") : undefined}>
              <RecommendationCard card={card} duplicate={duplicate} activateCopy={activateCopy} />
            </div>
          );
        }))}
      </div>
    </section>
  );
}
