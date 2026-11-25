import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VoiceActorDirectoryEntry } from "@/lib/voiceActorDirectory";

const readPublicBundle = vi.hoisted(() => vi.fn());
vi.mock("@/lib/readPublicBundle", () => ({ readPublicBundle }));

import { VoiceActorDirectoryClient } from "./VoiceActorDirectoryClient";

const initialDirectory: VoiceActorDirectoryEntry[] = [{ id: "actor-1", displayName: "聲演甲" }];

describe("VoiceActorDirectoryClient data loading", () => {
  beforeEach(() => readPublicBundle.mockReset());

  it("uses fresh server data without a duplicate browser request", () => {
    render(<VoiceActorDirectoryClient initialDirectory={initialDirectory} />);
    expect(screen.getByText("聲演甲")).toBeTruthy();
    expect(readPublicBundle).not.toHaveBeenCalled();
  });

  it("refreshes a static export when opened in the browser", async () => {
    readPublicBundle.mockResolvedValue({ data: {
      personas: [{ id: "actor-2", displayName: "聲演乙", roles: ["voice_actor"] }],
      scripts: [], externalPublicScripts: [], demoSubmissions: [],
    }, source: "primary" });
    render(<VoiceActorDirectoryClient initialDirectory={initialDirectory} refreshOnMount />);
    await waitFor(() => expect(screen.getByText("聲演乙")).toBeTruthy());
    expect(screen.queryByText("聲演甲")).toBeNull();
    expect(readPublicBundle).toHaveBeenCalledWith(["personas", "scripts", "externalPublicScripts", "demoSubmissions"]);
  });
});
