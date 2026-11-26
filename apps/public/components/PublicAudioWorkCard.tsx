import { Headphones } from "lucide-react";
import { PARTICIPATION_ROLE_LABELS } from "@write/public-ui/participation-roles";
import type { PublicAudioWork, PublicOrg } from "@/lib/types";
import { audioWorkPublication, audioWorkPurchaseLabel, audioWorkSource, publicAudioWorkContent } from "@/lib/publicAudioWorkContent";
import { publicAudioPerformers } from "@/lib/publicWorkPerformers";
import { PublicContentLink, PublicPersonLink } from "./PublicDirectoryDetails";
import { PublicCast } from "./PublicWorkDetails";
import { LinkifiedText } from "./LinkifiedText";
import { PublicImage } from "./PublicImage";
import { PublicCatalogWorkCard } from "./PublicCatalogWorkCard";

export function PublicAudioWorkCard({ work, organization, highlightCover = false, description, attribution }: {
  work: PublicAudioWork;
  organization?: PublicOrg;
  highlightCover?: boolean;
  description?: string;
  attribution?: string;
}) {
  const performers = publicAudioPerformers(work);
  const credits = (work.credits || []).filter((credit) => credit.role !== "voice_actor");
  const { isAdult, introduction, sources } = publicAudioWorkContent(work, performers, description || work.description);
  const organizationHref = work.organizationId ? organization?.externalHref || `/org/${encodeURIComponent(work.organizationId)}` : undefined;
  const creatorName = work.creatorName?.trim();
  const creatorHref = /^https?:\/\//i.test(work.creatorUrl || "") ? work.creatorUrl : undefined;
  const organizationName = organization?.name || (organizationHref ? creatorName : undefined);
  const hasDistinctCreator = creatorName && creatorName !== organizationName;
  const publication = audioWorkPublication(work);
  const sourceLabel = audioWorkPurchaseLabel(work.url);
  const creditSources = sources.filter((url) => url !== work.url);
  return <PublicCatalogWorkCard
    title={work.title}
    href={work.url}
    sourceLabel={sourceLabel}
    hasArtwork={Boolean(work.coverUrl)}
    className={highlightCover ? "public-featured-glare" : undefined}
    artwork={<>
      {work.coverUrl
        ? <PublicImage src={work.coverUrl} alt={`${work.title}封面`} preset="script-cover" />
        : <Headphones className="absolute inset-0 m-auto size-8 text-muted-foreground/50" aria-hidden />}
      {isAdult && <span className="absolute left-2 top-2 rounded-sm bg-seal px-1.5 py-0.5 text-xs font-bold text-white">成人向</span>}
      {work.accessType === "free" && <span className="absolute right-2 top-2 rounded-sm bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">免費版</span>}
    </>}
    details={(credits.length > 0 || introduction || creditSources.length > 0) && <>
      {introduction && <section className="mt-2">
        <h4 className="text-sm font-semibold">作品介紹</h4>
        <LinkifiedText text={introduction} className="mt-1 whitespace-pre-line leading-7 text-foreground/85 [overflow-wrap:anywhere]" />
      </section>}
      {credits.length > 0 && <section className="mt-2">
        <h4 className="text-sm font-semibold">製作人員</h4>
        <dl className="mt-1 grid grid-cols-[fit-content(42%)_minmax(0,1fr)] gap-x-3 gap-y-1 leading-relaxed">
          {credits.map((credit, index) => <div className="contents" key={`${credit.role}-${credit.creditedAs}-${index}`}>
            <dt className="text-muted-foreground [overflow-wrap:anywhere]">{credit.sourceRole.trim() === "封面" ? PARTICIPATION_ROLE_LABELS.cover_art : credit.sourceRole}</dt>
            <dd className="[overflow-wrap:anywhere]">
              {credit.personaId
                ? <PublicPersonLink href={`/author/${encodeURIComponent(credit.personaId)}`} name={credit.creditedAs} avatar={credit.personaAvatar} compact />
                : <>
                  {credit.creditedAs}
                  {credit.sourceUrl && /^https?:\/\//i.test(credit.sourceUrl) && <PublicContentLink href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${credit.creditedAs}的署名來源`} className="ms-2 text-xs" arrow>來源</PublicContentLink>}
                </>}
            </dd>
          </div>)}
        </dl>
      </section>}
      {creditSources.length > 0 && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {creditSources.map((url) => <PublicContentLink key={url} href={url} target="_blank" rel="noopener noreferrer" appearance="source" className="text-xs" arrow>{audioWorkSource(url) || "署名來源"}</PublicContentLink>)}
      </div>}
    </>}
  >
    <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {organizationName && organizationHref && <PublicContentLink href={organizationHref} appearance="identity">{organizationName}</PublicContentLink>}
      {hasDistinctCreator && (creatorHref
        ? <PublicContentLink href={creatorHref} target="_blank" rel="noopener noreferrer" arrow>{creatorName}</PublicContentLink>
        : <span>{creatorName}</span>)}
      {publication && <time dateTime={publication.dateTime}>{publication.label} {publication.text}</time>}
    </div>
    {attribution && <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{attribution}</p>}
    {performers.length > 0 && <div className="mt-2"><PublicCast performers={performers} compact /></div>}
  </PublicCatalogWorkCard>;
}
