"use client";

import { useState } from "react";
import { PublicBrowseHeader } from "@/components/PublicBrowseHeader";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
import { PublicSearchField } from "@/components/PublicSearchField";
import { AdultContentNotice } from "@/components/AdultContentNotice";
import { PublicProfileWorkCard } from "@/components/PublicProfileLayout";
import { useResourceAgeGate } from "@/lib/useResourceAgeGate";
import { kindNames, type WorkKind, type WorkSummary } from "@/lib/workCardModel";
import { workHref } from "@/lib/workIdentity";

function profileWorkTypeFor(kind: WorkKind): "audio" | "game" | "video" | "other" | "script" {
  if (kind === "game") return "game";
  if (kind === "audio" || kind === "soundtrack") return "audio";
  if (kind === "video") return "video";
  if (kind === "script") return "script";
  return "other";
}

export function WorksDirectory({ works }: { works: WorkSummary[] }) {
  const [kind, setKind] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(48);
  const age = useResourceAgeGate();
  const matched = works.filter((w) => (!kind || w.kind === kind) && w.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const visible = matched.filter((w) => !w.gated || age.confirmed);

  return (
    <PublicBrowseMain>
      <PublicBrowseHeader
        title="作品卡"
        count={`${matched.length} 部`}
        search={<PublicSearchField value={query} onChange={(q) => { setQuery(q); setLimit(48); }} placeholder="搜尋作品名稱" />}
        actions={
          <select
            className="rounded-md border border-border bg-background px-2.5 py-2 text-sm"
            aria-label="作品類型"
            value={kind}
            onChange={(e) => { setKind(e.target.value); setLimit(48); }}
          >
            <option value="">全部類型</option>
            {Object.entries(kindNames)
              .filter(([k]) => works.some((w) => w.kind === k))
              .map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
          </select>
        }
      />
      {age.ready && visible.length < matched.length && (
        <div className="mb-4">
          <AdultContentNotice scope="participations" onConfirm={age.confirm} />
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visible.slice(0, limit).map((w) => (
          <PublicProfileWorkCard
            key={w.id}
            title={w.title}
            url={w.primaryHref || workHref(w.id)}
            coverUrl={w.cover}
            workType={profileWorkTypeFor(w.kind)}
            sourceLabel={kindNames[w.kind]}
            compact
          />
        ))}
      </div>
      {matched.length === 0 && <p className="py-6 text-sm text-muted-foreground">沒有符合的作品。</p>}
      {limit < visible.length && (
        <div className="my-6 flex justify-center">
          <button
            type="button"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
            onClick={() => setLimit(limit + 48)}
          >
            顯示更多作品
          </button>
        </div>
      )}
    </PublicBrowseMain>
  );
}
