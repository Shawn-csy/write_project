"use client";

import { useState } from "react";
import { ArrowLeft, BookOpen, Clapperboard, FileText, Gamepad2, Headphones } from "lucide-react";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
import { AdultContentNotice } from "@/components/AdultContentNotice";
import { PublicContentLink, PublicPersonLink } from "@/components/PublicDirectoryDetails";
import { PublicImage } from "@/components/PublicImage";
import { PublicCast } from "@/components/PublicWorkDetails";
import { LinkifiedText } from "@/components/LinkifiedText";
import { useResourceAgeGate } from "@/lib/useResourceAgeGate";
import { kindNames, type CatalogWork, type WorkKind } from "@/lib/workCardModel";

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

export function WorkDetail({ work }: { work: CatalogWork }) {
  const age = useResourceAgeGate();
  const [imageFailed, setImageFailed] = useState(false);

  if (work.gated && !age.confirmed) {
    return (
      <PublicBrowseMain width="narrow">
        <a href="/audio-works" className="mb-3 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden />
          <span>返回音聲</span>
        </a>
        {age.ready && <AdultContentNotice scope="participations" onConfirm={age.confirm} />}
      </PublicBrowseMain>
    );
  }

  const FallbackIcon = fallbackIconFor(work.kind);
  const showCover = Boolean(work.cover && !imageFailed);
  const performers = work.credits
    .filter((c) => c.role === "聲演" || c.role === "配音" || c.role === "Demo 聲演")
    .map((c) => ({
      name: c.name.replace(/（[^）]*）$/, "").trim() || c.name,
      href: isSafeHref(c.href) && c.href.startsWith("/") ? c.href : undefined,
      socialUrl: isSafeHref(c.href) && isExternalHref(c.href) ? c.href : undefined,
      avatar: c.avatar ?? undefined,
    }));

  const actionLinks = [
    ...(work.primaryHref && work.primaryHref !== `/works/${encodeURIComponent(work.id)}`
      ? [{ label: work.kind === "game" ? "遊戲詳情" : "前往頁面", href: work.primaryHref }]
      : []),
    ...work.links,
    ...work.demos,
  ].filter((item, idx, arr) => arr.findIndex((other) => other.href === item.href) === idx);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="pt-4">
          <a href={work.kind === "game" ? "/games" : work.kind === "script" || work.kind === "external" ? "/authors" : "/audio-works"} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ArrowLeft className="size-3.5" aria-hidden />
            <span>{work.kind === "game" ? "返回遊戲" : work.kind === "script" || work.kind === "external" ? "返回作者" : "返回音聲"}</span>
          </a>
        </div>

        <section className="mb-6 mt-3 grid gap-5 border-b border-border pb-6 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] md:items-start">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
            {showCover ? (
              <PublicImage src={work.cover!} alt={`${work.title}封面`} preset="script-cover" eager onError={() => setImageFailed(true)} />
            ) : (
              <FallbackIcon aria-hidden className="absolute inset-0 m-auto size-10 text-muted-foreground/50" />
            )}
          </div>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {work.isAdult && <span className="rounded-sm bg-seal px-1.5 py-0.5 text-xs font-bold text-white">成人向</span>}
              {work.isFree && <span className="rounded-sm bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">免費版</span>}
              <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{kindNames[work.kind]}</span>
            </div>
            <h1 className="break-words text-2xl font-bold leading-tight">{work.title}</h1>
            {work.subtitle && <p className="text-sm text-muted-foreground">{work.subtitle}</p>}
            {work.summary && (
              <LinkifiedText text={work.summary} className="whitespace-pre-line text-sm leading-relaxed text-foreground/85 [overflow-wrap:anywhere]" />
            )}
            {actionLinks.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                {actionLinks.map(({ href, label }, index) => (
                  <PublicContentLink
                    key={`${href}-${index}`}
                    href={href}
                    appearance="source"
                    className="text-sm font-medium"
                    target={isExternalHref(href) ? "_blank" : undefined}
                    rel={isExternalHref(href) ? "noopener noreferrer" : undefined}
                    arrow={isExternalHref(href)}
                  >
                    {label}
                  </PublicContentLink>
                ))}
              </div>
            )}
          </div>
        </section>

        {performers.length > 0 && (
          <section className="mb-6" aria-label="聲演名單">
            <div className="section-bar mb-2.5 flex items-baseline gap-2">
              <h2 className="text-base font-bold">聲演名單</h2>
              <span className="text-xs text-muted-foreground">{performers.length}</span>
            </div>
            <PublicCast performers={performers} />
          </section>
        )}

        {work.credits.length > 0 && (
          <section className="mb-6" aria-label="參與人員">
            <div className="section-bar mb-2.5 flex items-baseline gap-2">
              <h2 className="text-base font-bold">參與人員</h2>
              <span className="text-xs text-muted-foreground">{work.credits.length}</span>
            </div>
            <dl className="grid grid-cols-[fit-content(35%)_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-border pt-3 text-sm leading-relaxed">
              {work.credits.map((credit, index) => (
                <div key={`${credit.role}-${credit.name}-${index}`} className="contents">
                  <dt className="text-muted-foreground [overflow-wrap:anywhere]">{credit.role}</dt>
                  <dd className="[overflow-wrap:anywhere]">
                    {isSafeHref(credit.href) ? (
                      credit.href.startsWith("/author/") ? (
                        <PublicPersonLink href={credit.href} name={credit.name} avatar={credit.avatar} />
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
      </div>
    </main>
  );
}
