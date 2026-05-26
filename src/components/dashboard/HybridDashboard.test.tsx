import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HybridDashboard from "./HybridDashboard";

const mockNavigate = vi.fn();

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: { uid: "u1" } }),
}));

vi.mock("../../contexts/I18nContext", () => ({
  useI18n: () => ({
    t: (key, fallback = "") => fallback || key,
  }),
}));

vi.mock("../common/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <div data-testid="lang-switcher" />,
}));

vi.mock("../ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }) => <>{children}</>,
  DropdownMenuContent: ({ children }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children, onClick, ...props }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("./WriteTab", () => ({
  WriteTab: () => <div data-testid="write-tab" />,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("HybridDashboard", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("dispatches write-tab actions from create/import/guide controls", () => {
    const received = [];
    const listener = (event) => {
      received.push(event.detail?.type);
    };
    window.addEventListener("write-tab-action", listener);

    render(
      <HybridDashboard
        isSidebarOpen={true}
        setSidebarOpen={vi.fn()}
        onSelectCloudScript={vi.fn()}
        openMobileMenu={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle("scriptToolbar.newScript"));
    fireEvent.click(screen.getByText("scriptToolbar.import"));
    fireEvent.click(screen.getByText("scriptToolbar.guide"));

    window.removeEventListener("write-tab-action", listener);
    expect(received).toEqual(["create-script", "import-script", "open-guide"]);
  });

  it("navigates to public gallery from topbar more menu", () => {
    render(
      <HybridDashboard
        isSidebarOpen={true}
        setSidebarOpen={vi.fn()}
        onSelectCloudScript={vi.fn()}
        openMobileMenu={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("公開台本"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
