"use client";

import { useState } from "react";
import { BookOpen, Clapperboard, FileText, Gamepad2, Headphones } from "lucide-react";
import { PublicCatalogWorkCard } from "./PublicCatalogWorkCard";
import { PublicContentLink, PublicPersonLink } from "./PublicDirectoryDetails";
import { PublicImage } from "./PublicImage";
import { PublicProfileWorkCard } from "./PublicProfileLayout";
import { PublicCast } from "./PublicWorkDetails";
import { LinkifiedText } from "./LinkifiedText";
import { kindNames, type CatalogWork, type WorkKind } from "@/lib/workCardModel";
import { workHref } from "@/lib/workIdentity";

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function isSafeHref(href?: string): href is string {
  return Boolean(href && /^(?:https?:\/\/|\/(?!\/))/i.test(href));
}

function fallbackIconFor(kind: WorkKind) {
  if (kind === "game") return Gamepad2;
  if (kind === "audio" || kind === "soundtrack") return Headphones;
  if (kind === "video") return Clapperboard;
  if (kind === "script") return BookOpen;
  return FileText;
}

function profileWorkTypeFor(kind: WorkKind): "audio" | "game" | "video" | "other" | "script" {
  if (kind === "game") return "game";
  if (kind === "audio" || kind === "soundtrack") return "audio";
  if (kind === "video") return "video";
  if (kind === "script") return "script";
  return "other";
}

function voicePerformersOf(work: CatalogWork) {
  return work.credits
    .filter((c) => c.role === "聲演" || c.role === "配音" || c.role === "Demo 聲演")
    .map((c) => ({
      name: c.name.replace(/（[^）]*）$/, "").trim() || c.name,
      href: isSafeHref(c.href) && c.href.startsWith("/") ? c.href : undefined,
      socialUrl: isSafeHref(c.href) && isExternalHref(c.href) ? c.href : undefined,
      avatar: c.avatar ?? undefined,
    }));
}

export function WorkCard({
  work,
  compact = false,
  personaId,
}: {
  work: CatalogWork;
  compact?: boolean;
  personaId?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const destinationHref = work.primaryHref || workHref(work.id);

  if (compact) {
    return (
      <PublicProfileWorkCard
        title={work.title}
        url={destinationHref}
        coverUrl={work.cover}
        workType={profileWorkTypeFor(work.kind)}
        sourceLabel={work.externalLabel || kindNames[work.kind]}
        compact
      />
    );
  }

  const FallbackIcon = fallbackIconFor(work.kind);
  const roles = [...new Set(work.credits.filter((c) => personaId && c.personaId === personaId).map((c) => c.role))];
  const performers = voicePerformersOf(work);
  const staffCredits = work.credits.filter((c) => c.role !== "製作");
  const hasDetails = Boolean(work.summary || staffCredits.length > 0 || work.links.length > 0 || work.demos.length > 0);
  const showCover = Boolean(work.cover && !imageFailed);

  const details = hasDetails ? (
    <>
      {work.summary && (
        <section className="mt-2">
          <h4 className="text-sm font-semibold">作品介紹</h4>
          <LinkifiedText text={work.summary} className="mt-1 whitespace-pre-line leading-7 text-foreground/85 [overflow-wrap:anywhere]" />
        </section>
      )}
      {staffCredits.length > 0 && (
        <section className="mt-2">
          <h4 className="text-sm font-semibold">製作人員</h4>
          <dl className="mt-1 grid grid-cols-[fit-content(42%)_minmax(0,1fr)] gap-x-3 gap-y-1 leading-relaxed">
            {staffCredits.map((credit, index) => (
              <div key={`${credit.role}-${credit.name}-${index}`} className="contents">
                <dt className="text-muted-foreground [overflow-wrap:anywhere]">{credit.role}</dt>
                <dd className="[overflow-wrap:anywhere]">
                  {isSafeHref(credit.href) ? (
                    credit.href.startsWith("/author/") ? (
                      <PublicPersonLink href={credit.href} name={credit.name} avatar={credit.avatar} compact />
                    ) : (
                      <PublicContentLink
                        href={credit.href}
                        appearance="identity"
                        target={isExternalHref(credit.href) ? "_blank" : undefined}
                        rel={isExternalHref(credit.href) ? "noopener noreferrer" : undefined}
                        arrow={isExternalHref(credit.href)}
                      >
                        {credit.name}
                      </PublicContentLink>
                    )
                  ) : (
                    credit.name
                  )}
                  {credit.source && isExternalHref(credit.source) && (
                    <PublicContentLink
                      className="ms-2 text-xs"
                      href={credit.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${credit.name}的署名來源`}
                      arrow
                    >
                      來源
                    </PublicContentLink>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {(work.links.length > 0 || work.demos.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {[...work.links, ...work.demos].map(({ href, label }, index) => (
            <PublicContentLink
              key={`${href}-${index}`}
              href={href}
              appearance="source"
              className="text-xs"
              target={isExternalHref(href) ? "_blank" : undefined}
              rel={isExternalHref(href) ? "noopener noreferrer" : undefined}
              arrow={isExternalHref(href)}
            >
              {label}
            </PublicContentLink>
          ))}
        </div>
      )}
    </>
  ) : undefined;

  return (
    <PublicCatalogWorkCard
      title={work.title}
      heading="h3"
      titleHref={destinationHref}
      href={work.externalHref}
      sourceLabel={work.externalLabel}
      id={work.id}
      className="scroll-mt-20"
      data-work-id={work.id}
      hasArtwork={showCover}
      linkArtwork
      artwork={
        <>
          {showCover ? (
            <PublicImage
              src={work.cover!}
              alt={`${work.title}封面`}
              preset="script-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <FallbackIcon aria-hidden className="absolute inset-0 m-auto size-8 text-muted-foreground/50" />
          )}
          {work.isAdult && (
            <span className="absolute left-2 top-2 rounded-sm bg-seal px-1.5 py-0.5 text-xs font-bold text-white">成人向</span>
          )}
          {work.isFree && (
            <span className="absolute right-2 top-2 rounded-sm bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">免費版</span>
          )}
        </>
      }
      details={details}
      detailsLabel="製作人員與介紹"
    >
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span>{kindNames[work.kind]}</span>
        {work.subtitle && <span>{work.subtitle}</span>}
        {roles.length > 0 && <span>· {roles.join("、")}</span>}
      </div>
      {performers.length > 0 && (
        <div className="mt-2">
          <PublicCast performers={performers} compact />
        </div>
      )}
    </PublicCatalogWorkCard>
  );
}
