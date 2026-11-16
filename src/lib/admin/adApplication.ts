import type { AdApplication, PublicFeedbackRecord } from "../../types/api";

/** New structured applications and both historic form formats. */
export function readAdApplication(item: Pick<PublicFeedbackRecord, "kind" | "content">): AdApplication | null {
  if (item.kind !== "ad_application") return null;
  try {
    const parsed = JSON.parse(item.content);
    const ad = parsed?.adApplication;
    if (ad && !Array.isArray(ad) && typeof ad === "object"
      && ["homepage", "demos", "audio-works"].includes(ad.placement)
      && [ad.title, ad.link, ad.imageUrl].every((value) => typeof value === "string")
      && [ad.startDate, ad.endDate].every((value) => value == null || typeof value === "string")) {
      return {
        placement: ad.placement,
        title: ad.title.trim(),
        link: ad.link.trim(),
        imageUrl: ad.imageUrl.trim(),
        startDate: ad.startDate || null,
        endDate: ad.endDate || null,
      };
    }
    if (ad !== undefined) return null;
  } catch { /* Legacy human-readable application. */ }
  const line = (label: string) => item.content.match(new RegExp(`^(?:${label})：(.+)$`, "m"))?.[1]?.trim() || "";
  const dates = line("預計期間").split(" 至 ");
  return {
    placement: item.content.startsWith("音聲作品頁") ? "audio-works" : "homepage",
    title: line("活動／品牌名稱"),
    link: line("導流網址"),
    imageUrl: line("Banner 圖片|廣告圖片"),
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(dates[0] || "") ? dates[0] : null,
    endDate: /^\d{4}-\d{2}-\d{2}$/.test(dates[1] || "") ? dates[1] : null,
  };
}
