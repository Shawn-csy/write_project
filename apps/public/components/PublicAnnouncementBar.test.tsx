import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { PublicAnnouncementBar } from "./PublicAnnouncementBar";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  window.sessionStorage.clear();
});

describe("PublicAnnouncementBar", () => {
  it("renders nothing outside the Dev site", () => {
    vi.stubEnv("NEXT_PUBLIC_DEPLOY_ENV", "production");
    const { container } = render(<PublicAnnouncementBar />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the notice on the Dev site and stays closed after dismissal", () => {
    vi.stubEnv("NEXT_PUBLIC_DEPLOY_ENV", "development");
    const first = render(<PublicAnnouncementBar />);
    expect(screen.getByRole("region", { name: "網站公告" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "關閉公告" }));
    expect(screen.queryByRole("region", { name: "網站公告" })).toBeNull();
    first.unmount();
    render(<PublicAnnouncementBar />);
    expect(screen.queryByRole("region", { name: "網站公告" })).toBeNull();
  });
});
