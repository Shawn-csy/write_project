import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HybridDashboard from "./HybridDashboard";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: { uid: "u1" } }),
}));

vi.mock("../../contexts/I18nContext", () => ({
  useI18n: () => ({ t: (key: string, fallback = "") => fallback || key }),
}));

vi.mock("../common/LanguageSwitcher", () => ({
  LanguageSwitcher: () => null,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

// Stands in for WriteTab: like useWriteTabState, it opens the create Dialog
// synchronously from the "write-tab-action" window event.
vi.mock("./WriteTab", () => ({
  WriteTab: function FakeWriteTab() {
    const [open, setOpen] = React.useState(false);
    React.useEffect(() => {
      const handler = (event: Event) => {
        if ((event as CustomEvent<{ type?: string }>).detail?.type === "create-folder") setOpen(true);
      };
      window.addEventListener("write-tab-action", handler);
      return () => window.removeEventListener("write-tab-action", handler);
    }, []);
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>create folder</DialogTitle>
          <DialogDescription>name it</DialogDescription>
          <button onClick={() => setOpen(false)}>close create</button>
        </DialogContent>
      </Dialog>
    );
  },
}));

describe("HybridDashboard create menu", () => {
  it("opens the folder dialog from the topbar menu without the two focus traps recursing, and leaves the page clickable", async () => {
    const user = userEvent.setup();
    render(
      <HybridDashboard
        isSidebarOpen
        setSidebarOpen={vi.fn()}
        onSelectCloudScript={vi.fn()}
        openMobileMenu={vi.fn()}
      />
    );

    await user.click(screen.getByTitle("scriptToolbar.moreCreateOptions"));
    await user.click(await screen.findByText("scriptToolbar.folder"));
    await user.click(await screen.findByText("close create"));
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });

    expect(document.body.style.pointerEvents).not.toBe("none");
  });
});
