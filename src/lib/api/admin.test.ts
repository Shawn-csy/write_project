import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./client", () => ({
  fetchApi: vi.fn(async (_url, options) => options),
}));

import { fetchApi } from "./client";
import { updateHomepageBannerAdmin } from "./admin";

describe("updateHomepageBannerAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends items payload for multi-banner save", async () => {
    const payload = {
      items: [
        { id: "a", title: "A", content: "CA", link: "https://a", imageUrl: "/media/a.webp" },
        { id: "b", title: "B", content: "CB", link: "https://b", imageUrl: "/media/b.webp" },
      ],
    };
    await updateHomepageBannerAdmin(payload);
    expect(fetchApi).toHaveBeenCalledTimes(1);
    const [, options] = fetchApi.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].title).toBe("A");
    expect(body.items[1].title).toBe("B");
  });
});
