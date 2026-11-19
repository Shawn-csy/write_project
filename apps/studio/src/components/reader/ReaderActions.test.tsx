import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReaderActions } from "./ReaderActions";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";

vi.mock("../../contexts/I18nContext", () => ({
  useI18n: () => ({ t: (key: string, fallback = "") => fallback || key }),
}));

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
  return <ReaderActions downloadOptions={downloadOptions as never} />;
}

describe("ReaderActions", () => {
  it("opens a dialog from the more menu without the two focus traps recursing, and leaves the page clickable", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText("readerActions.more"));
    await user.click(await screen.findByText("Export with metadata"));
    await user.click(await screen.findByText("close export"));
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });

    expect(document.body.style.pointerEvents).not.toBe("none");
  });
});
