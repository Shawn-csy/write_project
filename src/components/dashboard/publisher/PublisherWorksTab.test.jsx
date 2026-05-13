import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PublisherWorksTab } from "./PublisherWorksTab";

vi.mock("../../../contexts/I18nContext", () => ({
  useI18n: () => ({
    t: (key) => ({
      "publisherWorksTab.filterAll": "全部",
      "publisherWorksTab.filterPublic": "已公開",
      "publisherWorksTab.filterPrivate": "未公開",
      "publisherWorksTab.continueWriting": "繼續寫作",
      "publisherWorksTab.editInfo": "編輯資訊",
      "publisherWorksTab.viewPublicPage": "查看公開頁",
      "publisherWorksTab.noCover": "無封面",
      "publisherWorksTab.updatedAt": "更新",
      "publisherWorksTab.loadMore": "載入更多",
      "publisherWorksTab.emptyAll": "尚未有任何作品",
      "publisherWorksTab.emptyPublic": "尚未有公開作品",
      "publisherWorksTab.emptyPrivate": "尚未有未公開作品",
    })[key] ?? key,
  }),
}));

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

  it("treats scripts without top-level license fields as missing license", () => {
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

    expect(screen.getAllByText("缺授權")).toHaveLength(2);
  });

  it("treats persona default license as valid when script metadata has no license fields", () => {
    render(
      <PublisherWorksTab
        isLoading={false}
        personas={[
          {
            id: "p1",
            defaultLicenseCommercial: "allow",
            defaultLicenseDerivative: "allow",
            defaultLicenseNotify: "required",
          },
        ]}
        scripts={[
          {
            id: "persona-default-license",
            personaId: "p1",
            title: "Persona Default License",
            status: "Private",
            lastModified: Date.now(),
            content: [
              "Title: Persona Default License",
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

    expect(screen.queryByText("缺授權")).not.toBeInTheDocument();
  });
});
