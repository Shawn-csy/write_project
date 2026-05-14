import React from "react";

interface ActivitySectionProps {
  name?: string;
  bannerUrl?: string;
  content?: string;
  workUrl?: string;
}

export function ActivitySection({ name, bannerUrl, content, workUrl }: ActivitySectionProps): React.JSX.Element {
  return (
    <section className="mx-auto mb-8 w-full max-w-4xl px-6 text-left">
      <div className="rounded-xl border border-border/70 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="text-xs font-semibold text-muted-foreground">活動宣傳</div>
        {name && (
          <h3 className="mt-1 text-lg font-semibold text-foreground">{name}</h3>
        )}
        {bannerUrl && (
          <div className="mt-3 overflow-hidden rounded-md border border-border/70 bg-muted/20">
            <img
              src={bannerUrl}
              alt={name || "activity banner"}
              className="max-h-64 w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        {content && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
            {content}
          </p>
        )}
        {workUrl && (
          <div className="mt-3">
            <a
              href={workUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted"
            >
              成品連結
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
