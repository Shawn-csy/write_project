import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ getHomepageBannerAdmin: vi.fn(), getDemoBannerAdmin: vi.fn(), getAudioWorkBannerAdmin: vi.fn(), updateHomepageBannerAdmin: vi.fn(), updateDemoBannerAdmin: vi.fn(), updateAudioWorkBannerAdmin: vi.fn() }));
vi.mock("../../lib/api/admin", () => api);
vi.mock("../ui/MediaPicker", () => ({ MediaPicker: () => null }));
vi.mock("../../lib/mediaLibrary", () => ({ MEDIA_FILE_ACCEPT: "image/*", optimizeImageForUpload: vi.fn() }));
vi.mock("../../lib/api/media", () => ({ uploadMediaObject: vi.fn() }));
import { HomepageBannerSection } from "./HomepageBannerSection";

describe("banner management", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("previews complete 3:1 artwork and saves legacy crops without requiring Hero settings", async () => {
    const item = { id: "legacy", title: "Legacy", imageUrl: "/media/a.webp", imageCrop: { zoom: 3 }, startDate: "2026-11-01" };
    api.getHomepageBannerAdmin.mockResolvedValue({ items: [item] });
    api.updateHomepageBannerAdmin.mockResolvedValue({ items: [item] });
    render(<HomepageBannerSection />);
    await screen.findByDisplayValue("Legacy");
    expect(screen.getByTestId("banner-preview").className).toContain("aspect-[3/1]");
    expect(screen.getByRole("img").className).toContain("object-contain");
    expect(screen.queryByText("顯示模式")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "儲存 Banner" }));
    await waitFor(() => expect(api.updateHomepageBannerAdmin).toHaveBeenCalledWith({ items: [item] }));
  });
  it("previews brand copy as a full 3:1 card beside the ad settings", async () => {
    api.getHomepageBannerAdmin.mockResolvedValue({ items: [{ id: "brand-intro", title: "Brand", eyebrow: "Platform", content: "Line one\nLine two" }] });
    render(<HomepageBannerSection />);
    await screen.findByDisplayValue("Brand");
    expect(screen.getByTestId("brand-preview").className).toContain("aspect-[3/1]");
    expect(screen.getByTestId("brand-preview").textContent).toContain("Platform");
    expect(screen.getByTestId("brand-preview").querySelector("p.whitespace-pre-line")).toBeTruthy();
  });
  it("clears old scope data and disables save when a new placement fails loading", async () => {
    api.getHomepageBannerAdmin.mockResolvedValue({ items: [{ id: "h", title: "Home" }] });
    api.getDemoBannerAdmin.mockRejectedValue(new Error("Offline"));
    const { rerender } = render(<HomepageBannerSection />);
    await screen.findByDisplayValue("Home");
    rerender(<HomepageBannerSection scope="demos" />);
    await screen.findByRole("alert");
    expect(screen.queryByDisplayValue("Home")).toBeNull();
    expect(screen.getByRole("button", { name: "儲存 Banner" })).toBeDisabled();
    expect(api.updateDemoBannerAdmin).not.toHaveBeenCalled();
  });
});
