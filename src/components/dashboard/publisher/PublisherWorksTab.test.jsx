import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { PublisherWorksTab } from "./PublisherWorksTab";

describe("PublisherWorksTab", () => {
  it("calls onContinueEdit when clicking continue writing", () => {
    const onContinueEdit = vi.fn();

    render(
      <PublisherWorksTab
        isLoading={false}
        scripts={[
          {
            id: "s1",
            title: "Script A",
            status: "Private",
            lastModified: Date.now(),
          },
        ]}
        setEditingScript={vi.fn()}
        navigate={vi.fn()}
        formatDate={() => "2026-02-15"}
        onContinueEdit={onContinueEdit}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /繼續寫作/i }));

    expect(onContinueEdit).toHaveBeenCalledTimes(1);
    expect(onContinueEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s1", title: "Script A" })
    );
  });
});

