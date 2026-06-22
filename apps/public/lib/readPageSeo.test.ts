import { describe, it, expect } from "vitest";
import {
  buildReadPageTitle,
  buildReadPageDescription,
  buildReadPageStructuredData,
  buildReadPageBreadcrumbData,
} from "./readPageSeo";
import type { PublicScript } from "./types";

function baseScript(overrides: Partial<PublicScript> = {}): PublicScript {
  return { id: "s1", title: "測試台本", ...overrides };
}

describe("buildReadPageTitle", () => {
  it("no series, no author", () => {
    expect(buildReadPageTitle(baseScript())).toBe("測試台本｜泛用型產品作坊");
  });

  it("no series, author from persona", () => {
    const script = baseScript({ persona: { displayName: "作者A" } });
    expect(buildReadPageTitle(script)).toBe("測試台本｜作者A｜泛用型產品作坊");
  });

  it("no series, author from owner fallback", () => {
    const script = baseScript({ owner: { displayName: "作者B" } });
    expect(buildReadPageTitle(script)).toBe("測試台本｜作者B｜泛用型產品作坊");
  });

  it("series with numeric order", () => {
    const script = baseScript({ series: { name: "黑夜系列" }, seriesOrder: 2 });
    expect(buildReadPageTitle(script)).toBe(
      "黑夜系列 第 2 部：測試台本｜泛用型產品作坊"
    );
  });

  it("series with order 0", () => {
    const script = baseScript({ series: { name: "黑夜系列" }, seriesOrder: 0 });
    expect(buildReadPageTitle(script)).toBe(
      "黑夜系列 設定／背景：測試台本｜泛用型產品作坊"
    );
  });

  it("series without order", () => {
    const script = baseScript({ series: { name: "黑夜系列" } });
    expect(buildReadPageTitle(script)).toBe(
      "測試台本｜黑夜系列｜泛用型產品作坊"
    );
  });
});

describe("buildReadPageDescription series-aware fallback", () => {
  it("synopsis takes priority", () => {
    const script = baseScript({
      synopsis: "這是劇情簡介",
      series: { name: "黑夜系列" },
      seriesOrder: 1,
    });
    expect(buildReadPageDescription(script)).toBe("這是劇情簡介");
  });

  it("series fallback with order and author", () => {
    const script = baseScript({
      series: { name: "黑夜系列" },
      seriesOrder: 2,
      persona: { displayName: "作者A" },
    });
    expect(buildReadPageDescription(script)).toBe(
      "黑夜系列第 2 部，作者 作者A 的公開台本。"
    );
  });

  it("series fallback without order", () => {
    const script = baseScript({ series: { name: "黑夜系列" } });
    expect(buildReadPageDescription(script)).toBe("黑夜系列公開台本。");
  });

  it("author-only fallback", () => {
    const script = baseScript({ owner: { displayName: "作者B" } });
    expect(buildReadPageDescription(script)).toBe("作者B 的公開台本。");
  });
});

describe("buildReadPageStructuredData isPartOf / position", () => {
  it("no series: no isPartOf", () => {
    const data = buildReadPageStructuredData(baseScript(), "s1");
    expect(data.isPartOf).toBeUndefined();
    expect(data.position).toBeUndefined();
  });

  it("series: isPartOf present", () => {
    const script = baseScript({ series: { name: "黑夜系列" }, seriesOrder: 1 });
    const data = buildReadPageStructuredData(script, "s1");
    expect((data.isPartOf as Record<string, unknown>)?.["@type"]).toBe("CreativeWorkSeries");
    expect((data.isPartOf as Record<string, unknown>)?.name).toBe("黑夜系列");
  });

  it("series with order: position present", () => {
    const script = baseScript({ series: { name: "黑夜系列" }, seriesOrder: 3 });
    const data = buildReadPageStructuredData(script, "s1");
    expect(data.position).toBe(3);
  });

  it("series without order: no position", () => {
    const script = baseScript({ series: { name: "黑夜系列" } });
    const data = buildReadPageStructuredData(script, "s1");
    expect(data.isPartOf).toBeDefined();
    expect(data.position).toBeUndefined();
  });
});

describe("buildReadPageBreadcrumbData", () => {
  it("no series: 2 items", () => {
    const data = buildReadPageBreadcrumbData(baseScript(), "s1");
    const items = data.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("首頁");
    expect(items[1].name).toBe("測試台本");
  });

  it("with series: 3 items, series in middle", () => {
    const script = baseScript({ series: { name: "黑夜系列" } });
    const data = buildReadPageBreadcrumbData(script, "s1");
    const items = data.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(3);
    expect(items[1].name).toBe("黑夜系列");
    expect(items[2].name).toBe("測試台本");
  });
});
