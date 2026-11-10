import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomepageActivityBanner } from "./HomepageActivityBanner";

describe("HomepageActivityBanner", () => {
  it("takes no space when there is no published activity", () => {
    const { container } = render(<HomepageActivityBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("links directly to the featured activity", () => {
    render(<HomepageActivityBanner activities={[{ id: "1", slug: "秋日活動", title: "秋日配音", summary: "邀請投稿", coverUrl: "", sortOrder: 0 }]} />);
    expect(screen.getByRole("link", { name: /秋日配音/ }).getAttribute("href"))
      .toBe("/activities?event=%E7%A7%8B%E6%97%A5%E6%B4%BB%E5%8B%95");
  });

  it("shows the uploaded activity image when available", () => {
    const { container } = render(<HomepageActivityBanner activities={[{ id: "1", slug: "autumn", title: "秋日配音", summary: "", coverUrl: "https://example.com/autumn.jpg", sortOrder: 0 }]} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://example.com/autumn.jpg");
  });

  it("lets visitors reach every published activity from the same banner slot", () => {
    render(<HomepageActivityBanner activities={[
      { id: "1", slug: "autumn", title: "秋日配音", summary: "", coverUrl: "", sortOrder: 0 },
      { id: "2", slug: "winter", title: "冬日配音", summary: "", coverUrl: "", sortOrder: 1 },
    ]} />);
    expect(screen.getByRole("link", { name: /秋日配音/ }).getAttribute("href")).toBe("/activities?event=autumn");
    fireEvent.click(screen.getByRole("button", { name: "下一個活動" }));
    expect(screen.getByRole("link", { name: /冬日配音/ }).getAttribute("href")).toBe("/activities?event=winter");
    expect(screen.getByText("2 / 2")).toBeTruthy();
  });
});
