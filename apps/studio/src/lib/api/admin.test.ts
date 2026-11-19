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
        {
          id: "a",
          eyebrow: "品牌介紹",
          title: "A",
          content: "CA",
          link: "https://a",
          imageUrl: "/media/a.webp",
          imageAlt: "Banner A",
          imageCrop: { cx: 0.1, cy: -0.2, zoom: 1.1 },
          imageMobileCrop: { cx: -0.3, cy: 0.2, zoom: 1.2 },
          imageDesktopCrop: { cx: 0.2, cy: 0.1, zoom: 1.3 },
          imageUltraWideCrop: { cx: 0, cy: -0.1, zoom: 1.4 },
          imageBackgroundMode: "blur-fill",
        },
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
    expect(body.items[0]).toMatchObject({
      eyebrow: "品牌介紹",
      imageAlt: "Banner A",
      imageCrop: { cx: 0.1, cy: -0.2, zoom: 1.1 },
      imageMobileCrop: { cx: -0.3, cy: 0.2, zoom: 1.2 },
      imageDesktopCrop: { cx: 0.2, cy: 0.1, zoom: 1.3 },
      imageUltraWideCrop: { cx: 0, cy: -0.1, zoom: 1.4 },
      imageBackgroundMode: "blur-fill",
    });
    expect(body.items[1].title).toBe("B");
  });
});
