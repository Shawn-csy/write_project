import React from "react";
import { getMediaCropStyle } from "../../lib/mediaCropRef";

interface ActivitySectionProps {
  name?: string;
  bannerUrl?: string;
  bannerCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  content?: string;
  workUrl?: string;
}

export function ActivitySection({ name, bannerUrl, bannerCrop, content, workUrl }: ActivitySectionProps): React.JSX.Element {
  const [bannerLoadFailed, setBannerLoadFailed] = React.useState(false);
  const cropBanner = getMediaCropStyle(String(bannerUrl || ""), bannerCrop);

  return (
    <section className="mx-auto mb-8 w-full max-w-4xl px-6 text-left">
      <div className="rounded-xl border border-border/70 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="text-xs font-semibold text-muted-foreground">活動宣傳</div>
        {name && (
          <h3 className="mt-1 text-lg font-semibold text-foreground">{name}</h3>
        )}
        {bannerUrl && !bannerLoadFailed && (
          <div className="mt-3 overflow-hidden rounded-md border border-border/70 bg-muted/20">
            <img
              src={cropBanner.src}
              style={cropBanner.style}
              alt={name || "activity banner"}
              className="max-h-64 w-full object-cover"
              loading="lazy"
              onError={() => setBannerLoadFailed(true)}
            />
          </div>
        )}
        {content && (
          <p className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-foreground/90">
            {content}
          </p>
        )}
        {workUrl && (
          <div className="mt-3">
            <a
              href={workUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted"
            >
              成品連結 ↗
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
