import { describe, expect, it } from "vitest";
import { readAdApplication } from "./adApplication";

describe("advertising application compatibility", () => {
  it.each(["Banner 圖片", "廣告圖片"])("reads legacy %s and inclusive date fields", (label) => {
    expect(readAdApplication({ kind: "ad_application", content: `音聲作品頁廣告申請\n活動／品牌名稱：Campaign\n導流網址：https://example.com\n${label}：/media/banner.webp\n預計期間：2026-11-01 至 2026-11-30` })).toEqual({ placement: "audio-works", title: "Campaign", link: "https://example.com", imageUrl: "/media/banner.webp", startDate: "2026-11-01", endDate: "2026-11-30" });
  });
  it("reads structured fields without parsing notes as public data", () => {
    const ad = { placement: "demos", title: "Structured", link: "https://example.com", imageUrl: "/media/a.webp", startDate: null, endDate: null };
    expect(readAdApplication({ kind: "ad_application", content: JSON.stringify({ adApplication: ad, notes: "Private notes" }) })).toEqual(ad);
    expect(readAdApplication({ kind: "bug", content: JSON.stringify({ adApplication: ad }) })).toBeNull();
  });
});

it.each([
  { placement: "audio-works", title: "Test", link: "https://example.com", imageUrl: { unsafe: true } },
  ["homepage"],
  { placement: "unknown", title: "Test", link: "https://example.com", imageUrl: "/media/a.webp" },
  { placement: "homepage", title: "Test", link: "https://example.com", imageUrl: "/media/a.webp", startDate: 20261116 },
])("ignores malformed structured content without crashing the inbox", (adApplication) => {
  expect(readAdApplication({ kind: "ad_application", content: JSON.stringify({ adApplication }) })).toBeNull();
});
