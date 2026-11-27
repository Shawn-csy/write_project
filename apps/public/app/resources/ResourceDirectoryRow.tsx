"use client";

import { useEffect, useState } from "react";
import { PublicIdentityDirectoryRow } from "@/components/PublicIdentityDirectoryRow";
import { liveApi } from "@/lib/liveApi";
import { publicIdentityRoleLabel } from "@/lib/publicIdentityMetadata";
import { gameResourceWorks, resourceWorks, type ResourceSummary } from "@/lib/resourceCatalog";
import type { ResourceCategory, ResourceDirectoryEntry } from "@/lib/resourceDirectory";
import type { PublicPersona } from "@/lib/types";

export function ResourceDirectoryRow({ item, category, showWorks, onTagClick }: {
  item: ResourceSummary; category: ResourceCategory; showWorks: boolean; onTagClick: (tag: string) => void;
}) {
  const role = category === "recording_engineer" || category === "recording_unclassified" ? "recording_studio" : category;
  const count = item.workCounts[role] ?? 0;
  const [works, setWorks] = useState<ResourceDirectoryEntry["works"]>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const needsDetails = showWorks && count > 0 && !item.localOnly && works === undefined;

  useEffect(() => {
    if (!needsDetails) return;
    const controller = new AbortController();
    liveApi.readJson<PublicPersona>(`/api/public-personas/${encodeURIComponent(item.id)}`, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setWorks(resourceWorks(data));
      }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [item.id, needsDetails, attempt]);

  const lane = (item.localOnly ? gameResourceWorks(item.id) : works)?.filter(work => work.creditRole === role);
  return <PublicIdentityDirectoryRow
    name={item.name} href={item.href} avatar={item.avatar} bio={item.bio}
    works={lane ?? []} workCount={lane?.length ?? count} showWorks={showWorks}
    emptyLabel={role !== "voice_actor" && item.commissionRoles.includes(role) ? "提供委託資訊" : "尚無參與作品"}
    roleLabels={item.roles.map(role => publicIdentityRoleLabel(role, item.recordingEntityType))}
    tags={item.tags} onTagClick={onTagClick} links={item.links}
    extra={needsDetails && (failed ? <button type="button" className="text-link" onClick={() => {
      setFailed(false);
      setAttempt(previous => previous + 1);
    }}>重新載入參與作品</button> : <span role="status">載入參與作品中…</span>)}
  />;
}
