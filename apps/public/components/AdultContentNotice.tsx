"use client";

import { useId } from "react";
import Link from "next/link";

const notices = {
  "audio-works": "音聲作品與封面可能含成人向內容，僅供年滿 18 歲者瀏覽。",
  games: "收錄的遊戲限年滿 18 歲者瀏覽，外部商店頁可能含成人向內容。",
  participations: "參與作品可能含成人向內容。確認後會顯示作品與封面，本次瀏覽期間免重複確認。",
};

export function AdultContentNotice({ scope, onConfirm }: {
  scope: keyof typeof notices;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const page = scope !== "participations";
  const Heading = page ? "h1" : "h2";
  const actionClass = "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold";

  return (
    <section aria-labelledby={titleId} className={`flex gap-4 rounded-md border border-border border-s-4 border-s-seal bg-card p-4 ${page ? "flex-col sm:p-6" : "flex-col sm:flex-row sm:items-center sm:justify-between"}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="rounded-sm bg-seal px-1.5 py-0.5 text-xs font-bold leading-5 text-white">R18</span>
          <Heading id={titleId} className={`font-semibold leading-snug ${page ? "text-xl" : "text-base"}`}>成人向內容提醒</Heading>
        </div>
        <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {notices[scope]}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button type="button" onClick={onConfirm} aria-describedby={descriptionId} className={`${actionClass} bg-primary text-primary-foreground hover:bg-primary/90`}>
          我已年滿 18 歲
        </button>
        {page && <Link href="/" className={`${actionClass} border border-border hover:bg-muted`}>返回首頁</Link>}
      </div>
    </section>
  );
}
