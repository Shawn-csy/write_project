import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsPanel from "./SettingsPanel";
import { useAuth } from "../../contexts/AuthContext";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../contexts/I18nContext", () => ({
  useI18n: () => ({
    t: (key) => ({
      "settings.title": "設定",
      "settings.display": "外觀與閱讀",
      "settings.transfer": "平台管理",
      "settings.media": "媒體庫",
      "settings.markers": "自訂標記",
      "settings.profile": "身份設定",
      "common.close": "關閉",
    })[key] ?? key,
  }),
}));

vi.mock("../settings/AppearanceSettings", () => ({
  AppearanceSettings: () => <div data-testid="appearance-settings">Appearance</div>,
}));

vi.mock("../settings/ProfileSettings", () => ({
  ProfileSettings: () => <div data-testid="profile-settings">Profile</div>,
}));

vi.mock("../settings/MarkerSettings", () => ({
  MarkerSettings: () => <div data-testid="marker-settings">Marker</div>,
}));

vi.mock("../settings/MediaLibrarySettings", () => ({
  MediaLibrarySettings: () => <div data-testid="media-library-settings">Media</div>,
}));

vi.mock("../../pages/SuperAdminPage", () => ({
  default: () => <div data-testid="super-admin-page">SuperAdmin</div>,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("SettingsPanel", () => {
  // Tab buttons render in both the mobile bar and the desktop sidebar, so use getAllByRole.
  it("shows only display tab for unauthenticated users", async () => {
    useAuth.mockReturnValue({ currentUser: null });
    renderWithRouter(<SettingsPanel onClose={() => {}} />);

    expect(screen.getAllByRole("button", { name: "外觀與閱讀" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("自訂標記")).toBeNull();
    expect(screen.queryByText("身份設定")).toBeNull();
    // Tab content is lazy-loaded, wait for the Suspense resolve.
    expect(await screen.findByTestId("appearance-settings")).toBeDefined();
  });

  it("shows all tabs for authenticated users", () => {
    useAuth.mockReturnValue({ currentUser: { id: "u1" }, profile: { isAdmin: true } });
    renderWithRouter(<SettingsPanel onClose={() => {}} />);

    expect(screen.getAllByRole("button", { name: "平台管理" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "外觀與閱讀" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "媒體庫" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "自訂標記" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "身份設定" }).length).toBeGreaterThan(0);
  });

  it("uses activeTab and onTabChange callback when controlled", async () => {
    useAuth.mockReturnValue({ currentUser: { id: "u1" }, profile: { isAdmin: true } });
    const onTabChange = vi.fn();
    renderWithRouter(
      <SettingsPanel
        onClose={() => {}}
        activeTab="markers"
        onTabChange={onTabChange}
      />
    );

    expect(await screen.findByTestId("marker-settings")).toBeDefined();

    fireEvent.click(screen.getAllByRole("button", { name: "身份設定" })[0]);
    expect(onTabChange).toHaveBeenCalledWith("profile");
  });

  it("calls onClose when close button is clicked", () => {
    useAuth.mockReturnValue({ currentUser: { id: "u1" }, profile: { isAdmin: true } });
    const onClose = vi.fn();
    renderWithRouter(<SettingsPanel onClose={onClose} />);
    fireEvent.click(screen.getByTitle("關閉"));
    expect(onClose).toHaveBeenCalled();
  });
});
