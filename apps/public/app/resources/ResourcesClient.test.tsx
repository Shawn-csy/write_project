import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResourcesClient } from "./ResourcesClient";
import { buildResourceDirectory, type ProductionResource } from "@/lib/resourceDirectory";
import type { PublicPersona } from "@/lib/types";
import { liveApi } from "@/lib/liveApi";

const base = {
  categories: ["post_production"], summary: "", websiteUrl: "https://example.com/",
} satisfies Pick<ProductionResource, "categories" | "summary" | "websiteUrl">;

function ResourceDirectoryFixture({ initialPersonas, initialResources }: {
  initialPersonas: PublicPersona[];
  initialResources: ProductionResource[];
}) {
  return <ResourcesClient initialDirectory={buildResourceDirectory(initialPersonas, initialResources)} />;
}

describe("ResourcesClient", () => {
  beforeEach(() => { window.history.replaceState({}, "", "/resources"); window.sessionStorage.clear(); });
  it("only shows the unclassified recording tab while an unresolved identity exists", () => {
    const studio: ProductionResource = { id: "studio", personaId: "studio", name: "錄音室", categories: ["recording_studio"], recordingEntityType: "studio", summary: "", websiteUrl: "", works: [{ id: "w", title: "作品", url: "https://example.com/w", coverUrl: "", creditRole: "recording_studio", creditedAs: "錄音室" }] };
    const { unmount } = render(<ResourceDirectoryFixture initialPersonas={[]} initialResources={[studio]} />);
    expect(screen.queryByRole("button", { name: "待分類錄音" })).toBeNull();
    unmount();
    render(<ResourceDirectoryFixture initialPersonas={[]} initialResources={[studio, { ...studio, id: "legacy", personaId: "legacy", name: "待核身份", recordingEntityType: undefined }]} />);
    expect(screen.getByRole("button", { name: "待分類錄音" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "待分類錄音" }));
    expect(screen.getByText("待核身份")).toBeTruthy();
    expect(screen.getByText("1 筆")).toBeTruthy();
  });
  it("uses the same role-filtered work lane for voice actors with deduplicated counts", () => {
    window.sessionStorage.clear();
    const work = { id: "audio", title: "參演作品", url: "https://example.com/audio", coverUrl: "https://example.com/cover.jpg", creditRole: "voice_actor" as const, creditedAs: "聲演甲" };
    render(<ResourceDirectoryFixture initialResources={[]} initialPersonas={[{
      id: "actor", displayName: "聲演甲", roles: ["voice_actor", "post_production"],
      workParticipations: [work, { ...work, id: "duplicate" }, { ...work, id: "mix", title: "後製作品", creditRole: "post_production" }],
    }]} />);
    expect(screen.getByText("1 部參與作品")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "前往作品：參演作品" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "我已年滿 18 歲" }));
    expect(screen.getAllByRole("link", { name: "前往作品：參演作品" })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "前往作品：後製作品" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "後製" }));
    expect(screen.getByRole("link", { name: "前往作品：後製作品" })).toBeTruthy();
    window.sessionStorage.clear();
  });

  it("submits an independent game credit without requiring audio catalog entry", async () => {
    const write = vi.spyOn(liveApi, "write").mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    try {
      render(<ResourceDirectoryFixture initialPersonas={[]} initialResources={[]} />);
      fireEvent.click(screen.getByRole("button", { name: "投稿資源" }));
      const dialog = within(screen.getByRole("dialog"));
      fireEvent.change(dialog.getByLabelText("資源類別"), { target: { value: "recording_studio" } });
      fireEvent.change(dialog.getByLabelText("錄音身份"), { target: { value: "studio" } });
      fireEvent.change(dialog.getByLabelText("名稱", { exact: true }), { target: { value: "遊戲錄音室" } });
      fireEvent.change(dialog.getByLabelText("官方／委託頁網址"), { target: { value: "https://example.com/studio" } });
      fireEvent.change(dialog.getByLabelText("作品名稱 1"), { target: { value: "獨立遊戲" } });
      fireEvent.change(dialog.getByLabelText("作品網址 1"), { target: { value: "https://example.com/game" } });
      fireEvent.change(dialog.getByLabelText("作品類型 1"), { target: { value: "game" } });
      fireEvent.change(dialog.getByLabelText("作品封面網址 1"), { target: { value: "https://example.com/game.jpg" } });
      fireEvent.change(dialog.getByLabelText("投稿人稱呼"), { target: { value: "投稿者" } });
      fireEvent.change(dialog.getByLabelText("聯絡 Email（不公開）"), { target: { value: "sender@example.com" } });
      fireEvent.click(dialog.getByRole("button", { name: "送出審核" }));
      await waitFor(() => expect(write).toHaveBeenCalledOnce());
      const payload = JSON.parse(String(write.mock.calls[0][1]?.body));
      expect(payload.works).toEqual([{ title: "獨立遊戲", url: "https://example.com/game", role: "", workType: "game", coverUrl: "https://example.com/game.jpg" }]);
      expect(payload.recordingEntityType).toBe("studio");
      expect(dialog.getByRole("status").textContent).toContain("投稿已送出");
    } finally { write.mockRestore(); }
  });

  it("shows verified voice actor profile links on the card", () => {
    render(<ResourceDirectoryFixture initialPersonas={[{
      id: "actor-1", displayName: "一介", avatar: "https://example.com/avatar.jpg",
      roles: ["voice_actor"], links: [{ label: "X", url: "https://x.com/heyiam_1J" }],
    }]} initialResources={[]} />);
    const profile = screen.getByRole("link", { name: "一介的X" });
    expect(profile.getAttribute("href")).toBe("https://x.com/heyiam_1J");
    expect(profile.getAttribute("target")).toBe("_blank");
  });

  it("hides production resources without a credited work in the selected category", () => {
    const resources: ProductionResource[] = [
      { ...base, id: "empty", personaId: "empty", name: "沒有作品", works: [] },
      { ...base, id: "listed", personaId: "listed", name: "有作品", works: [{ id: "work-1", title: "作品甲", url: "https://example.com/work", coverUrl: "", creditRole: "post_production", creditedAs: "有作品" }] },
    ];
    render(<ResourceDirectoryFixture initialPersonas={[]} initialResources={resources} />);
    fireEvent.click(screen.getByRole("button", { name: "後製" }));
    expect(screen.getByText("1 筆")).toBeTruthy();
    expect(screen.getByText("有作品")).toBeTruthy();
    expect(screen.queryByText("沒有作品")).toBeNull();
    expect(screen.getByRole("link", { name: "有作品的個人頁" }).getAttribute("href")).toBe("/author/listed");
  });

  it("lists a creator with sourced commission terms before production credits exist", () => {
    const resources: ProductionResource[] = [{
      ...base, id: "wind", personaId: "wind", name: "風蓮/Hong Liân",
      commissionCategories: ["post_production"], works: [],
    }];
    render(<ResourceDirectoryFixture initialPersonas={[]} initialResources={resources} />);
    fireEvent.click(screen.getByRole("button", { name: "後製" }));
    expect(screen.getByText("1 筆")).toBeTruthy();
    expect(screen.getByRole("link", { name: "風蓮/Hong Liân的個人頁" }).getAttribute("href")).toBe("/author/wind");
    expect(screen.getByText("提供委託資訊")).toBeTruthy();
  });

  it("shows resource avatars and contact links before revealing work covers", () => {
    render(<ResourceDirectoryFixture initialPersonas={[]} initialResources={[{
      ...base, id: "studio", personaId: "studio", name: "韾笙重工", avatarUrl: "https://example.com/avatar.jpg",
      otherRoles: ["voice_actor"],
      links: [{ label: "X", url: "https://x.com/oseizyuukou" }],
      works: [{ id: "work-1", title: "作品甲", url: "https://example.com/work", coverUrl: "https://example.com/cover.jpg", creditRole: "post_production", creditedAs: "韾笙重工" }],
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: "後製" }));
    expect(screen.getByAltText("韾笙重工").getAttribute("src")).toBe("https://example.com/avatar.jpg");
    expect(screen.getByRole("link", { name: "韾笙重工的X" }).getAttribute("href")).toBe("https://x.com/oseizyuukou");
    expect(screen.getAllByText("聲演")).toHaveLength(2);
    expect(screen.queryByAltText("作品甲封面")).toBeNull();
  });

  it("asks for age confirmation once before showing work covers", () => {
    window.sessionStorage.clear();
    const item: ProductionResource = { ...base, id: "studio", personaId: "studio", name: "製作人甲",
      works: [{ id: "work-1", title: "作品甲", url: "https://example.com/work", coverUrl: "https://example.com/cover.jpg", creditRole: "post_production", creditedAs: "製作人甲" }],
    };
    render(<ResourceDirectoryFixture initialPersonas={[]} initialResources={[item]} />);
    fireEvent.click(screen.getByRole("button", { name: "後製" }));
    fireEvent.click(screen.getByRole("button", { name: "我已年滿 18 歲" }));
    expect(window.sessionStorage.getItem("public-resources-adult-confirmed")).toBe("1");
    expect(screen.getByRole("link", { name: "前往作品：作品甲" })).toBeTruthy();
    window.sessionStorage.clear();
  });
});
