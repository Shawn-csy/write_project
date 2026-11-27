"use client";

import { useEffect } from "react";
import { NotFoundBody } from "@/components/NotFoundContent";
import { readPublicBundle } from "@/lib/readPublicBundle";
import { buildWorkCatalog, WORK_SECTIONS, type WorkBundle, type CatalogWork } from "@/lib/workCatalog";
import { useLiveData } from "@/lib/useLiveData";
import { TITLE_SUFFIX } from "@/lib/seo";
import { WorkDetail } from "./WorkDetail";

export function LiveWorkDetail({ id, initial }: { id: string; initial?: CatalogWork }) {
  const state = useLiveData(initial, async () => {
    const { data } = await readPublicBundle<WorkBundle>(WORK_SECTIONS);
    return buildWorkCatalog(data).get(id) ?? null;
  }, id);
  const title = state.status === "ready" ? state.data.title : "";
  useEffect(() => { if (title) document.title = `${title}｜作品卡｜${TITLE_SUFFIX}`; }, [title]);
  if (state.status === "ready") return <WorkDetail work={state.data} />;
  if (state.status === "missing") return <NotFoundBody />;
  return <p role="status" className="p-6">{state.status === "loading" ? "載入作品卡中…" : "作品卡暫時無法載入，請重新整理。"}</p>;
}
