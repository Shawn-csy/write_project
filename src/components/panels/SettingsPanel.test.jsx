import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsPanel from "./SettingsPanel";
import { useAuth } from "../../contexts/AuthContext";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
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
  it("shows only display tab for unauthenticated users", () => {
    useAuth.mockReturnValue({ currentUser: null });
    renderWithRouter(<SettingsPanel onClose={() => {}} />);

    expect(screen.getByRole("button", { name: "外觀與閱讀" })).toBeDefined();
    expect(screen.queryByText("自訂標記")).toBeNull();
    expect(screen.queryByText("身份設定")).toBeNull();
    expect(screen.getByTestId("appearance-settings")).toBeDefined();
  });

  it("shows all tabs for authenticated users", () => {
    useAuth.mockReturnValue({ currentUser: { id: "u1" }, profile: { isAdmin: true } });
    renderWithRouter(<SettingsPanel onClose={() => {}} />);

    expect(screen.getByRole("button", { name: "平台管理" })).toBeDefined();
    expect(screen.getByRole("button", { name: "外觀與閱讀" })).toBeDefined();
    expect(screen.getByRole("button", { name: "媒體庫" })).toBeDefined();
    expect(screen.getByRole("button", { name: "自訂標記" })).toBeDefined();
    expect(screen.getByRole("button", { name: "身份設定" })).toBeDefined();
  });

  it("uses activeTab and onTabChange callback when controlled", () => {
    useAuth.mockReturnValue({ currentUser: { id: "u1" }, profile: { isAdmin: true } });
    const onTabChange = vi.fn();
    renderWithRouter(
      <SettingsPanel
        onClose={() => {}}
        activeTab="markers"
        onTabChange={onTabChange}
      />
    );

    expect(screen.getByTestId("marker-settings")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "身份設定" }));
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
