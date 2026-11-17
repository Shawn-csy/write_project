import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthorPageClient } from "./AuthorPageClient";
import type { ExternalPublicScript, PublicAudioWork, PublicPersona } from "@/lib/types";

describe("AuthorPageClient resource age confirmation", () => {
  it("keeps voice work covers behind the shared resource confirmation", () => {
    window.sessionStorage.clear();
    const persona = {
      id: "voice-1", displayName: "聲演甲", roles: ["voice_actor"],
      voiceActorWorks: [{ title: "參演甲", url: "https://example.com/work", coverUrl: "https://example.com/cover.jpg" }],
    } as PublicPersona;
    render(<AuthorPageClient persona={persona} scripts={[]} />);
    expect(screen.getByRole("button", { name: "我已年滿 18 歲，顯示作品" })).toBeTruthy();
    expect(screen.queryByText("參演甲")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "我已年滿 18 歲，顯示作品" }));
    expect(screen.getByText("參演甲")).toBeTruthy();
    window.sessionStorage.clear();
  });
});

describe("AuthorPageClient as the one identity page", () => {
  it("preserves source links and a cover area for external scripts without artwork", () => {
    render(<AuthorPageClient persona={{ id: "writer", displayName: "作者", roles: ["scriptwriter"] }} scripts={[]} externalScripts={[{
      id: "doc", title: "星光", sourceUrl: "https://docs.google.com/document/d/example/edit", sourceName: "Google Docs", coverUrl: "", summary: "作品簡介",
    } as ExternalPublicScript]} />);
    expect(screen.getByLabelText("星光尚未提供封面")).toBeTruthy();
    expect(screen.getByText("Google Docs")).toBeTruthy();
    expect(screen.getByRole("link", { name: "閱讀台本：星光" }).getAttribute("href")).toBe("https://docs.google.com/document/d/example/edit");
  });

  it("shows sourced commission terms and credited audio scripts", () => {
    window.sessionStorage.setItem("public-resources-adult-confirmed", "1");
    const persona = {
      id: "writer", displayName: "風蓮/Hong Liân", roles: ["scriptwriter"],
      roleProfiles: { scriptwriter: { commissionOffers: [{
        service: "台本師", details: "每字 $2", scope: "商用含稅參考價",
        sourceUrl: "https://ci-en.dlsite.com/example", sourceUpdatedOn: "2026-11-05",
      }] } },
    } as PublicPersona;
    render(<AuthorPageClient persona={persona} scripts={[]} audioScriptWorks={[{
      id: "audio-1", title: "音聲台本甲", url: "https://example.com/audio", coverUrl: "",
    } as PublicAudioWork]} />);
    expect(screen.getByRole("region", { name: "音聲委託參考價" }).textContent).toContain("每字 $2");
    expect(screen.getByRole("link", { name: /查看收費標準來源/ }).getAttribute("href")).toBe("https://ci-en.dlsite.com/example");
    expect(screen.getByRole("region", { name: "參與台本作品" }).textContent).toContain("音聲台本甲");
    window.sessionStorage.clear();
  });

  it("renders all confirmed roles from one participation payload", () => {
    window.sessionStorage.setItem("public-resources-adult-confirmed", "1");
    const persona = {
      id: "unified", displayName: "新名稱", voiceActorWorks: [{ title: "舊清單不重複", url: "https://example.com/work" }], roles: ["scriptwriter", "voice_actor", "recording_studio"],
      workParticipations: ["scriptwriter", "voice_actor", "recording_studio"].map((creditRole) => ({
        id: "same-work", audioWorkId: "same-work", creditRole, title: "同一作品", url: "https://example.com/work", coverUrl: "", creditedAs: "舊署名",
      })),
    } as PublicPersona;
    render(<AuthorPageClient persona={persona} scripts={[]} />);
    expect(screen.queryByText("舊清單不重複")).toBeNull();
    for (const name of ["參與台本作品", "參演作品", "錄音作品"]) {
      expect(screen.getByRole("region", { name }).textContent).toContain("同一作品");
    }
    window.sessionStorage.clear();
  });

  it("opens the sections each role brings and hides the rest", () => {
    window.sessionStorage.setItem("public-resources-adult-confirmed", "1");
    const persona = {
      id: "multi", displayName: "一介", roles: ["voice_actor", "post_production"],
      voiceActorWorks: [{ title: "參演甲", url: "https://example.com/role" }],
      productionCredits: [{ id: "w1", title: "後製作品甲", url: "https://example.com/mix", coverUrl: "", creditRole: "post_production", creditedAs: "一介", workType: "audio" }],
    } as PublicPersona;
    render(<AuthorPageClient persona={persona} scripts={[]} />);
    expect(screen.getByLabelText("創作者身份").textContent).toBe("聲演後製");
    expect(screen.getByRole("region", { name: "參演作品" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "後製作品" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "台本作品" })).toBeNull();
    expect(screen.queryByRole("region", { name: "封面作品" })).toBeNull();
    window.sessionStorage.clear();
  });

  it.each([
    ["production", "recording_studio"], ["author", "scriptwriter"], ["voice_actor", "voice_actor"],
  ] as const)("proposes %s works through the shared profile submission", async (kind, role) => {
    const { liveApi } = await import("@/lib/liveApi");
    const read = vi.spyOn(liveApi, "readJson").mockRejectedValue(new Error("offline"));
    const write = vi.spyOn(liveApi, "write").mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    try {
      const persona = { id: "studio", displayName: "錄音室甲", roles: [role], productionCredits: [] } as PublicPersona;
      render(<AuthorPageClient persona={persona} scripts={[]} />);
      fireEvent.click(screen.getByRole("button", { name: "更新資料" }));
      fireEvent.change(screen.getByLabelText("參與作品名稱 1"), { target: { value: "新遊戲" } });
      fireEvent.change(screen.getByLabelText("參與作品網址 1"), { target: { value: "https://example.com/game" } });
      fireEvent.change(screen.getByLabelText("作品類型 1"), { target: { value: "game" } });
      if (kind !== "author") fireEvent.change(screen.getByLabelText(/資料補充者名稱/), { target: { value: "協作者" } });
      fireEvent.change(screen.getByLabelText("聯絡姓名（不公開）"), { target: { value: "協作者" } });
      fireEvent.change(screen.getByLabelText("聯絡 Email（不公開）"), { target: { value: "a@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "送交審核" }));
      await waitFor(() => expect(write).toHaveBeenCalledOnce());
      expect(write.mock.calls[0][0]).toBe("/api/voice-actor-profile-submissions");
      const body = JSON.parse(String(write.mock.calls[0][1]?.body));
      expect(body.profileKind).toBe(kind);
      expect(body.workFormat).toBe("participation-v1");
      expect(body.works).toEqual([{ title: "新遊戲", url: "https://example.com/game", creditRole: role, workType: "game", coverUrl: "", characterName: "", description: "" }]);
      expect(await screen.findByRole("status")).toBeTruthy();
    } finally {
      read.mockRestore();
      write.mockRestore();
    }
  });
});
