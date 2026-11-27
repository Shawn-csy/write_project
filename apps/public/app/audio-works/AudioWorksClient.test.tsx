import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicAudioWork, PublicOrg } from "@/lib/types";

const readPublicBundle = vi.hoisted(() => vi.fn());
vi.mock("@/lib/readPublicBundle", () => ({ readPublicBundle }));

import { AudioWorksClient } from "./AudioWorksClient";

const initialWorks = [{ id: "work-1", title: "作品甲", url: "https://example.com/work-1", organizationId: "org-1" }] as PublicAudioWork[];
const initialOrganizations = [{ id: "org-1", name: "社團甲" }] as PublicOrg[];

describe("AudioWorksClient data loading", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/audio-works");
    readPublicBundle.mockReset().mockResolvedValue({ data: { audioWorkBanner: [] }, source: "primary" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("shows the age notice before the catalog responds and loads the catalog only once", async () => {
    let resolveCatalog!: (result: { data: { audioWorks: PublicAudioWork[]; organizations: PublicOrg[] } }) => void;
    readPublicBundle.mockImplementationOnce(() => new Promise((resolve) => { resolveCatalog = resolve; }));
    render(<AudioWorksClient />);

    expect(screen.getByRole("heading", { name: "成人向內容提醒", level: 1 })).toBeTruthy();
    expect(screen.getByRole("link", { name: "返回首頁" })).toHaveAttribute("href", "/");
    expect(readPublicBundle.mock.calls).toEqual([[["audioWorks", "organizations"]]]);

    fireEvent.click(screen.getByRole("button", { name: "我已年滿 18 歲" }));
    expect(screen.getByRole("status", { name: "載入作品" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /社團甲/ })).toBeNull();

    resolveCatalog({ data: { audioWorks: initialWorks, organizations: initialOrganizations } });
    expect(await screen.findByRole("button", { name: /社團甲/ })).toBeTruthy();
    expect(readPublicBundle.mock.calls).toEqual([[["audioWorks", "organizations"]], [["audioWorkBanner"]]]);
  });

  it("loads the Pages snapshot only after the live read fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_STATIC_EXPORT", "1");
    const fetchSnapshot = vi.fn().mockResolvedValue(Response.json({ audioWorks: initialWorks, organizations: initialOrganizations }));
    vi.stubGlobal("fetch", fetchSnapshot);
    readPublicBundle.mockRejectedValueOnce(new Error("Both APIs are offline"));
    render(<AudioWorksClient />);

    expect(fetchSnapshot).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "我已年滿 18 歲" }));
    expect(await screen.findByRole("button", { name: /社團甲/ })).toBeTruthy();
    expect(fetchSnapshot).toHaveBeenCalledExactlyOnceWith("/audio-works/catalog.json", {
      cache: "no-cache",
      signal: expect.any(AbortSignal),
    });
  });

  it("uses a successful live fallback without requesting the Pages snapshot", async () => {
    vi.stubEnv("NEXT_PUBLIC_STATIC_EXPORT", "1");
    const fetchSnapshot = vi.fn();
    vi.stubGlobal("fetch", fetchSnapshot);
    readPublicBundle.mockResolvedValueOnce({
      data: { audioWorks: initialWorks, organizations: initialOrganizations },
      source: "fallback",
    });
    render(<AudioWorksClient />);

    fireEvent.click(screen.getByRole("button", { name: "我已年滿 18 歲" }));
    expect(await screen.findByRole("button", { name: /社團甲/ })).toBeTruthy();
    expect(fetchSnapshot).not.toHaveBeenCalled();
  });

  it("retries when the catalog request fails", async () => {
    readPublicBundle.mockRejectedValueOnce(new Error("Offline"));
    render(<AudioWorksClient />);
    fireEvent.click(screen.getByRole("button", { name: "我已年滿 18 歲" }));

    await screen.findByText("無法載入音聲");
    readPublicBundle.mockResolvedValueOnce({ data: { audioWorks: initialWorks, organizations: initialOrganizations } });
    fireEvent.click(screen.getByRole("button", { name: "重新載入" }));

    expect(await screen.findByRole("button", { name: /社團甲/ })).toBeTruthy();
  });

  it("loads the next works when the bottom enters view, without a button", async () => {
    let onIntersect!: IntersectionObserverCallback;
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) { onIntersect = callback; }
      observe() {}
      disconnect() {}
    });
    const manyWorks = Array.from({ length: 20 }, (_, index) => ({
      id: `work-${index}`, title: `作品${index}`, url: `https://example.com/${index}`, organizationId: "org-1",
    })) as PublicAudioWork[];
    const organizations = [{ ...initialOrganizations[0], description: "社團簡介", website: "https://example.com/studio" }];
    readPublicBundle.mockResolvedValueOnce({ data: { audioWorks: manyWorks, organizations } });
    render(<AudioWorksClient />);
    fireEvent.click(screen.getByRole("button", { name: /我已年滿 18 歲/ }));
    fireEvent.click(await screen.findByRole("button", { name: /社團甲/ }));
    expect(screen.getByRole("heading", { name: "社團甲", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("社團簡介")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "官方網站" })).toHaveAttribute("href", "https://example.com/studio");
    expect(screen.getByRole("searchbox", { name: "搜尋作品或聲演" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "時間排序 最新優先" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "最舊優先" }));
    expect(screen.getByRole("button", { name: "時間排序 最舊優先" })).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(18);
    expect(screen.queryByRole("button", { name: /顯示更多作品/ })).toBeNull();

    act(() => onIntersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(screen.getAllByRole("article")).toHaveLength(20);
  });

  it("links reviewed staff credits while leaving unlinked source names as text", async () => {
    const works = [{ ...initialWorks[0], credits: [
      { role: "cover_art", sourceRole: "封面", creditedAs: "舊署名", personaId: "artist-1", provenance: "official_page", sourceUrl: initialWorks[0].url },
      { role: "cover_art", sourceRole: "封面", creditedAs: "待核署名", provenance: "official_page", sourceUrl: initialWorks[0].url },
    ] }] as PublicAudioWork[];
    readPublicBundle.mockResolvedValueOnce({ data: { audioWorks: works, organizations: initialOrganizations } });
    render(<AudioWorksClient />);
    fireEvent.click(screen.getByRole("button", { name: /我已年滿 18 歲/ }));
    fireEvent.click(await screen.findByRole("button", { name: /社團甲/ }));
    fireEvent.click(screen.getByText("製作人員與介紹"));
    expect(screen.getAllByText("美術")).toHaveLength(2);
    expect(screen.queryByText("封面")).toBeNull();
    expect(screen.getByRole("link", { name: "舊署名" }).getAttribute("href")).toBe("/author/artist-1");
    expect(screen.queryByRole("link", { name: "待核署名" })).toBeNull();
    expect(screen.getByText("待核署名")).toBeTruthy();
    expect(screen.getByRole("link", { name: "待核署名的署名來源" })).toHaveAttribute("href", initialWorks[0].url);
  });

  it("remembers adult content confirmation across mounts within the same session", async () => {
    readPublicBundle.mockResolvedValue({ data: { audioWorks: initialWorks, organizations: initialOrganizations } });
    const first = render(<AudioWorksClient />);
    fireEvent.click(screen.getByRole("button", { name: "我已年滿 18 歲" }));
    expect(await screen.findByRole("button", { name: /社團甲/ })).toBeTruthy();
    first.unmount();

    render(<AudioWorksClient />);
    expect(screen.queryByRole("heading", { name: "成人向內容提醒" })).toBeNull();
    expect(await screen.findByRole("button", { name: /社團甲/ })).toBeTruthy();
  });

  it("supports switching between studios/channels and all works with access filtering", async () => {
    const works = [
      { id: "work-1", title: "社團免費作", url: "https://example.com/1", organizationId: "org-1", accessType: "free" },
      { id: "work-2", title: "企劃付費作", url: "https://example.com/2", accessType: "paid" },
    ] as PublicAudioWork[];
    readPublicBundle.mockResolvedValueOnce({ data: { audioWorks: works, organizations: initialOrganizations } });
    render(<AudioWorksClient />);
    fireEvent.click(screen.getByRole("button", { name: "我已年滿 18 歲" }));

    expect(await screen.findByRole("button", { name: /社團甲/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "企劃與單發作品" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "全部作品" }));
    expect(screen.getByRole("searchbox", { name: "搜尋作品、聲演或社團" })).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(2);

    fireEvent.keyDown(screen.getByRole("button", { name: "收聽類型 全部類型" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "免費" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("社團免費作")).toBeTruthy();
  });
});
