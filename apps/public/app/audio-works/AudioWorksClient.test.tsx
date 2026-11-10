import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicAudioWork, PublicOrg } from "@/lib/types";

const readPublicBundle = vi.hoisted(() => vi.fn());
vi.mock("@/lib/readPublicBundle", () => ({ readPublicBundle }));

import { AudioWorksClient } from "./AudioWorksClient";

const initialWorks = [{ id: "work-1", title: "作品甲", url: "https://example.com/work-1", organizationId: "org-1" }] as PublicAudioWork[];
const initialOrganizations = [{ id: "org-1", name: "社團甲" }] as PublicOrg[];

describe("AudioWorksClient data loading", () => {
  beforeEach(() => readPublicBundle.mockReset());
  afterEach(() => vi.unstubAllGlobals());

  it("uses server data without downloading the same bundle again", () => {
    render(<AudioWorksClient initialWorks={initialWorks} initialOrganizations={initialOrganizations} />);
    fireEvent.click(screen.getByRole("button", { name: /我已年滿 18 歲/ }));
    expect(screen.getByRole("button", { name: /社團甲/ })).toBeTruthy();
    expect(readPublicBundle).not.toHaveBeenCalled();
  });

  it("refreshes a static export when opened in the browser", async () => {
    readPublicBundle.mockResolvedValue({ data: {
      audioWorks: [{ id: "work-2", title: "作品乙", url: "https://example.com/work-2", organizationId: "org-2" }],
      organizations: [{ id: "org-2", name: "社團乙" }],
    }, source: "primary" });
    render(<AudioWorksClient initialWorks={initialWorks} initialOrganizations={initialOrganizations} refreshOnMount />);
    fireEvent.click(screen.getByRole("button", { name: /我已年滿 18 歲/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /社團乙/ })).toBeTruthy());
    expect(screen.queryByRole("button", { name: /社團甲/ })).toBeNull();
    expect(readPublicBundle).toHaveBeenCalledWith(["audioWorks", "organizations"]);
  });

  it("loads the next works when the bottom enters view, without a button", () => {
    let onIntersect!: IntersectionObserverCallback;
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) { onIntersect = callback; }
      observe() {}
      disconnect() {}
    });
    const manyWorks = Array.from({ length: 20 }, (_, index) => ({
      id: `work-${index}`, title: `作品${index}`, url: `https://example.com/${index}`, organizationId: "org-1",
    })) as PublicAudioWork[];
    render(<AudioWorksClient initialWorks={manyWorks} initialOrganizations={initialOrganizations} />);
    fireEvent.click(screen.getByRole("button", { name: /我已年滿 18 歲/ }));
    fireEvent.click(screen.getByRole("button", { name: /社團甲/ }));
    expect(screen.getAllByRole("article")).toHaveLength(18);
    expect(screen.queryByRole("button", { name: /顯示更多作品/ })).toBeNull();

    act(() => onIntersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(screen.getAllByRole("article")).toHaveLength(20);
  });
});
