"use client";

/**
 * Shared script grid for public entity pages (author / org / tag).
 * Uses the same ScriptGalleryCard + PublicImage path as the homepage gallery.
 */

import type { PublicScript } from "@/lib/types";
import { toGalleryInput } from "@/lib/galleryProjection";
import {
  ScriptGalleryCard,
  enrichScript,
  type CoverImageRenderer,
} from "@write/public-ui";
import { PublicImage } from "@/components/PublicImage";

const coverRenderer: CoverImageRenderer = ({ src, crop, alt, className }) => (
  <PublicImage src={src} crop={crop} alt={alt} preset="script-cover" className={className} />
);

interface Props {
  scripts: PublicScript[];
}

export function EntityScriptGrid({ scripts }: Props) {
  if (scripts.length === 0) return null;
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
    >
      {scripts.map((s) => {
        const enriched = enrichScript(toGalleryInput(s));
        // Only emit /author/:id when the script has a canonical persona id.
        // toGalleryInput falls back to owner when persona is absent, so we
        // must guard against that here using the raw script shape.
        const authorHref = s.persona?.id ? `/author/${s.persona.id}` : undefined;
        const seriesHref = enriched.seriesName
          ? `/series/${encodeURIComponent(enriched.seriesName)}`
          : undefined;
        return (
          <ScriptGalleryCard
            key={s.id}
            script={enriched}
            variant="standard"
            scriptHref={`/read/${s.id}`}
            authorHref={authorHref}
            seriesHref={seriesHref}
            tagHref={(tag) => `/tag/${encodeURIComponent(tag)}`}
            onSeriesClick={(name) => { window.location.href = `/series/${encodeURIComponent(name)}`; }}
            onAuthorClick={(id) => { window.location.href = `/author/${id}`; }}
            coverImageRenderer={coverRenderer}
          />
        );
      })}
    </div>
  );
}
