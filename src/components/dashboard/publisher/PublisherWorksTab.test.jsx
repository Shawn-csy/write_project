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

  it("determines missing license only from metadata basic license fields", () => {
    render(
      <PublisherWorksTab
        isLoading={false}
        scripts={[
          {
            id: "legacy-only",
            title: "Legacy License",
            status: "Private",
            lastModified: Date.now(),
            content: [
              "Title: Legacy License",
              "License: CC BY 4.0",
              "LicenseTags: 授權:可商用,授權:可改作",
              "",
              "Body",
            ].join("\n"),
          },
          {
            id: "metadata-license",
            title: "Metadata License",
            status: "Private",
            lastModified: Date.now(),
            content: [
              "Title: Metadata License",
              "LicenseCommercial: allow",
              "LicenseDerivative: allow",
              "LicenseNotify: required",
              "",
              "Body",
            ].join("\n"),
          },
        ]}
        setEditingScript={vi.fn()}
        navigate={vi.fn()}
        formatDate={() => "2026-02-15"}
        onContinueEdit={vi.fn()}
      />
    );

    expect(screen.getAllByText("缺授權")).toHaveLength(1);
  });
});
