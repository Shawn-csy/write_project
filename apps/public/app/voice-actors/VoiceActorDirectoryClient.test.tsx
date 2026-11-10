import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicPersona } from "@/lib/types";

const readPublicBundle = vi.hoisted(() => vi.fn());
vi.mock("@/lib/readPublicBundle", () => ({ readPublicBundle }));

import { VoiceActorDirectoryClient } from "./VoiceActorDirectoryClient";

const initialPersonas = [{ id: "actor-1", displayName: "聲演甲", roles: ["voice_actor"] }] as PublicPersona[];

describe("VoiceActorDirectoryClient data loading", () => {
  beforeEach(() => readPublicBundle.mockReset());

  it("uses fresh server data without a duplicate browser request", () => {
    render(<VoiceActorDirectoryClient initialPersonas={initialPersonas} initialDemos={[]} initialScripts={[]} initialExternalScripts={[]} />);
    expect(screen.getByText("聲演甲")).toBeTruthy();
    expect(readPublicBundle).not.toHaveBeenCalled();
  });

  it("refreshes a static export when opened in the browser", async () => {
    readPublicBundle.mockResolvedValue({ data: {
      personas: [{ id: "actor-2", displayName: "聲演乙", roles: ["voice_actor"] }],
      scripts: [], externalPublicScripts: [], demoSubmissions: [],
    }, source: "primary" });
    render(<VoiceActorDirectoryClient initialPersonas={initialPersonas} initialDemos={[]} initialScripts={[]} initialExternalScripts={[]} refreshOnMount />);
    await waitFor(() => expect(screen.getByText("聲演乙")).toBeTruthy());
    expect(screen.queryByText("聲演甲")).toBeNull();
    expect(readPublicBundle).toHaveBeenCalledWith(["personas", "scripts", "externalPublicScripts", "demoSubmissions"]);
  });
});
