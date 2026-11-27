import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthorPageClient } from "./AuthorPageClient";
import type { ExternalPublicScript, PublicAudioWork, PublicPersona } from "@/lib/types";

import { buildWorkCatalog, cardsForPersona } from "@/lib/workCatalog";

describe("AuthorPageClient work cards", () => {
  const writer: PublicPersona = { id: "writer", displayName: "編劇甲", roles: ["scriptwriter"] };
  const actor: PublicPersona = { id: "actor", displayName: "聲演乙", roles: ["voice_actor", "post_production"] };
  const audio: PublicAudioWork = {
    id: "recording", title: "測試錄音", url: "https://example.com/work",
    voiceActors: [{ id: actor.id, name: actor.displayName }],
    credits: [
      { role: "script", sourceRole: "台本", creditedAs: writer.displayName, personaId: writer.id, provenance: "official_page", sourceUrl: "https://example.com/credits" },
      { role: "post_production", sourceRole: "後製", creditedAs: actor.displayName, personaId: actor.id, provenance: "official_page", sourceUrl: "https://example.com/credits" },
    ],
  };

  it("embeds the same card on two profiles, with all roles and both identity links", () => {
    window.sessionStorage.clear();
    const catalog = buildWorkCatalog({ personas: [writer, actor], audioWorks: [audio] });
    const writersCards = cardsForPersona(catalog, writer.id);
    const actorsCards = cardsForPersona(catalog, actor.id);
    expect(actorsCards).toHaveLength(1);
    expect(actorsCards[0]).toBe(writersCards[0]);
    const view = render(<AuthorPageClient persona={writer} scripts={[]} workCards={writersCards} />);
    expect(screen.queryByText(audio.title)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "我已年滿 18 歲" }));
    expect(screen.getByRole("region", { name: "參與台本作品" })).toBeTruthy();
    expect(screen.getByText("· 台本")).toBeTruthy();
    view.rerender(<AuthorPageClient persona={actor} scripts={[]} workCards={actorsCards} />);
    expect(screen.getByRole("region", { name: "參演作品" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "後製作品" })).toBeTruthy();
    const card = view.container.querySelector('[data-work-id="audio-recording"]')!;
    for (const id of ["actor", "writer"]) expect(card.querySelector(`a[href="/author/${id}"]`)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "密集" }));
    expect(view.container.querySelector('a[href="/works/audio-recording"]')).toBeTruthy();
    window.sessionStorage.clear();
  });

  it("keeps the external reading link and the original attribution", () => {
    const external: ExternalPublicScript = { id: "doc", title: "星光", status: "published", sourceUrl: "https://example.com/script", authorPersonaId: writer.id, authorName: "刊登時署名" };
    const cards = cardsForPersona(buildWorkCatalog({ externalPublicScripts: [external] }), writer.id);
    const view = render(<AuthorPageClient persona={writer} scripts={[]} workCards={cards} />);
    expect(view.container.querySelector('a[href="https://example.com/script"]')).toHaveTextContent("閱讀原作");
    expect(view.container.querySelector('[data-work-id="external-doc"] a[href="/author/writer"]')).toHaveTextContent("刊登時署名");
  });

  it("preserves sourced commission terms beside the portfolio", () => {
    const persona = { ...writer, roleProfiles: { scriptwriter: { commissionOffers: [{
      service: "台本師", details: "每字 $2", scope: "商用含稅參考價", sourceUrl: "https://example.com/terms", sourceUpdatedOn: "2026-11-05",
    }] } } };
    render(<AuthorPageClient persona={persona} scripts={[]} workCards={[]} />);
    expect(screen.getByRole("region", { name: "音聲委託參考價" })).toHaveTextContent("每字 $2");
    expect(screen.getByRole("link", { name: /查看收費標準來源/ })).toHaveAttribute("href", "https://example.com/terms");
  });

  it.each([
    ["production", "recording_studio"], ["author", "scriptwriter"], ["voice_actor", "voice_actor"],
  ] as const)("proposes %s works through the shared profile submission", async (kind, role) => {
    const { liveApi } = await import("@/lib/liveApi");
    const read = vi.spyOn(liveApi, "readJson").mockRejectedValue(new Error("offline"));
    const write = vi.spyOn(liveApi, "write").mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    try {
      const persona = { id: "studio", displayName: "錄音室甲", roles: [role], productionCredits: [] } as PublicPersona;
      render(<AuthorPageClient persona={persona} scripts={[]} workCards={[]} />);
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
