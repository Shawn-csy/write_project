import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExternalPublicScript, PublicAudioWork, PublicOrg } from "@/lib/types";

vi.mock("@/components/PublicImage", () => ({ PublicImage: () => null }));
vi.mock("@/components/ExternalPublicScriptSection", () => ({
  ExternalPublicScriptCard: ({ item }: { item: ExternalPublicScript }) => <a href={item.sourceUrl}>{item.title}</a>,
}));

import { OrgPageClient } from "./OrgPageClient";

describe("organization audio catalog", () => {
  it("shows audio work count instead of an empty script state", () => {
    const org = { id: "org-1", name: "音聲社團", bannerUrl: "https://example.com/banner.png" } as PublicOrg;
    const audioWorks = Array.from({ length: 3 }, (_, index) => ({ id: `audio-${index}`, organizationId: org.id })) as PublicAudioWork[];
    render(<OrgPageClient org={org} scripts={[]} audioWorks={audioWorks} />);

    expect(screen.getByText("此社團收錄 3 件音聲作品，可查看作品介紹、聲演及發售資訊。")).toBeTruthy();
    expect(screen.getByRole("link", { name: "查看音聲作品" }).getAttribute("href")).toBe("/audio-works?organization=org-1");
    expect(screen.queryByText("目前沒有公開作品")).toBeNull();
    expect(screen.queryByText("0 位成員")).toBeNull();
  });

  it("shows associated public scripts together with the audio catalog", () => {
    const org = { id: "org-2", name: "被談聲聆" } as PublicOrg;
    const externalScripts = [{ id: "script-1", title: "夜間台本", sourceUrl: "https://example.com/script", organizationName: org.name, status: "published" }] as ExternalPublicScript[];
    const audioWorks = [{ id: "audio-1", organizationId: org.id }] as PublicAudioWork[];
    render(<OrgPageClient org={org} scripts={[]} externalScripts={externalScripts} audioWorks={audioWorks} />);

    expect(screen.getByRole("button", { name: "台本作品 (1)" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "夜間台本" }).getAttribute("href")).toBe("https://example.com/script");
    expect(screen.getByRole("button", { name: "音聲作品 (1)" })).toBeTruthy();
  });
});
