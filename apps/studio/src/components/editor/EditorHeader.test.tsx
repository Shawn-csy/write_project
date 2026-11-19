import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorHeader } from "./EditorHeader";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";

vi.mock("../../contexts/I18nContext", () => ({
  useI18n: () => ({ t: (key: string, fallback = "") => fallback || key }),
}));
vi.mock("../header/HeaderTitleBlock", () => ({ default: () => null }));
vi.mock("../header/EditableTitle", () => ({ default: () => null }));
vi.mock("../dashboard/ScriptMetadataDialog", () => ({ ScriptMetadataDialog: () => null }));
vi.mock("../common/LanguageSwitcher", () => ({ LanguageSwitcher: () => null }));
vi.mock("../ui/MarkerThemeVisibilityControl", () => ({ MarkerThemeVisibilityControl: () => null }));

function Harness() {
  const [open, setOpen] = React.useState(false);
  const downloadOptions = [
    {
      id: "export",
      label: "Export with metadata",
      onClick: () => setOpen(true),
      renderDialog: () => (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogTitle>export dialog</DialogTitle>
            <DialogDescription>pick fields</DialogDescription>
            <button onClick={() => setOpen(false)}>close export</button>
          </DialogContent>
        </Dialog>
      ),
    },
  ];
  return (
    <EditorHeader
      readOnly={false}
      title="My Script"
      onBack={vi.fn()}
      onManualSave={vi.fn()}
      lastSaved={null}
      showRules={false}
      onToggleRules={vi.fn()}
      downloadOptions={downloadOptions}
      onToggleStats={vi.fn()}
      showPreview={false}
      onTogglePreview={vi.fn()}
      onTitleChange={vi.fn()}
      onToggleMarker={vi.fn()}
    />
  );
}

describe("EditorHeader", () => {
  it("opens a dialog from the more menu without the two focus traps recursing, and leaves the page clickable", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText("editorHeader.moreActions"));
    await user.click(await screen.findByText("Export with metadata"));
    await user.click(await screen.findByText("close export"));
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });

    expect(document.body.style.pointerEvents).not.toBe("none");
  });
});
