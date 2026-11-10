import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthorPageClient } from "./AuthorPageClient";
import type { PublicPersona } from "@/lib/types";

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
