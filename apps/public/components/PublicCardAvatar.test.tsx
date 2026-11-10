import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { publicCardAvatarRenderer } from "./PublicCardAvatar";

describe("publicCardAvatarRenderer", () => {
  it("requests small media proxy variants for a 16px badge", () => {
    const { container } = render(publicCardAvatarRenderer({ src: "/media/author.jpg", crop: null, organization: false }));
    const image = container.querySelector("img")!;
    expect(image.getAttribute("src")).toMatch(/^\/api\/public-media\/.*\?w=48$/);
    expect(image).not.toHaveAttribute("srcset");
    expect(image).toHaveAttribute("fetchpriority", "low");
  });
});
