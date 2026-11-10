import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardCoverPriority, CardMediaImage, CardMediaRegion } from "./CardMediaVisibility";

describe("CardMediaRegion", () => {
  afterEach(() => vi.unstubAllGlobals());

  const cards = (
    <CardMediaRegion defer>
      <a href="/read/example">作品名稱</a>
      <CardMediaImage src="/media/cover.jpg" alt="封面" preset="script-cover" />
    </CardMediaRegion>
  );

  it("keeps card links but omits offscreen image requests from server HTML", () => {
    const html = renderToString(cards);
    expect(html).toContain("/read/example");
    expect(html).toContain("作品名稱");
    expect(html).not.toContain("<img");
  });

  it("loads images once the region enters the viewport", () => {
    let notify!: (entries: IntersectionObserverEntry[]) => void;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: typeof notify) { notify = callback; }
      observe = observe;
      disconnect = disconnect;
    });
    const { container } = render(cards);
    expect(container.querySelector("img")).toBeNull();
    expect(observe).toHaveBeenCalledTimes(1);
    act(() => notify([{ isIntersecting: true } as IntersectionObserverEntry]));
    expect(container.querySelector("img")).not.toBeNull();
    expect(disconnect).toHaveBeenCalled();
  });
});

describe("CardCoverPriority", () => {
  it("starts first-fold covers early without elevating avatars", () => {
    const { getByAltText } = render(
      <CardCoverPriority eager>
        <CardMediaImage src="/media/cover.jpg" alt="封面" preset="script-cover" />
        <CardMediaImage src="/media/avatar.jpg" alt="頭像" preset="avatar" fetchPriority="low" />
      </CardCoverPriority>,
    );
    const cover = getByAltText("封面") as HTMLImageElement;
    const avatar = getByAltText("頭像") as HTMLImageElement;
    expect(cover.getAttribute("loading")).toBe("eager");
    expect(cover.getAttribute("fetchpriority")).toBe("high");
    expect(cover.getAttribute("srcset")).toContain("w=360");
    expect(avatar.getAttribute("loading")).toBe("lazy");
    expect(avatar.getAttribute("fetchpriority")).toBe("low");
  });
});
