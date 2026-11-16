import React, { Suspense } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseGalleryUrlState } from "@write/public-ui";

vi.mock("next/dynamic", () => ({ default: (load: () => Promise<React.ComponentType>) => {
  const Component = React.lazy(async () => ({ default: await load() }));
  return (props: object) => <Suspense fallback={null}><Component {...props} /></Suspense>;
} }));
vi.mock("./GalleryClient", () => ({ GalleryClient: () => <div>Modern presentation</div> }));
vi.mock("@/components/legacy-homepage/apps/public/app/GalleryClient", () => ({ GalleryClient: () => <div>Legacy presentation</div> }));
import { HomepageVersionSwitch } from "./HomepageVersionSwitch";
const props = { initialScripts: [], initialExternalPublicScripts: [], initialUrlState: parseGalleryUrlState("") };

beforeEach(() => localStorage.clear());
afterEach(cleanup);
describe("homepage presentation choice", () => {
  it("switches both ways and remembers the choice across visits", async () => {
    const first = render(<HomepageVersionSwitch {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "切換回舊版首頁" }));
    expect(await screen.findByText("Legacy presentation")).toBeTruthy();
    expect(document.documentElement.dataset.homepageVersion).toBe("legacy");
    first.unmount();
    expect(document.documentElement.dataset.homepageVersion).toBeUndefined();
    render(<HomepageVersionSwitch {...props} />);
    expect(await screen.findByText("Legacy presentation")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "切換到新版首頁" }));
    expect(screen.getByText("Modern presentation")).toBeTruthy();
    expect(localStorage.getItem("public-homepage:version")).toBe("modern");
  });
  it("still switches when browser storage is unavailable", async () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw Error("disabled"); });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("disabled"); });
    try {
      render(<HomepageVersionSwitch {...props} />);
      fireEvent.click(screen.getByRole("button", { name: "切換回舊版首頁" }));
      expect(await screen.findByText("Legacy presentation")).toBeTruthy();
    } finally { get.mockRestore(); set.mockRestore(); }
  });
});
