import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicScriptInfoOverlay } from "./PublicScriptInfoOverlay";

vi.mock("../ui/AuthorBadge", () => ({
  AuthorBadge: ({ author }) => <span data-testid="author-badge">{author?.displayName}</span>,
}));

describe("PublicScriptInfoOverlay – licenseSpecialTerms", () => {
  it("renders special terms inside the info card when present", () => {
    render(
      <PublicScriptInfoOverlay
        title="Test"
        licenseSpecialTerms={["署名", "非商用"]}
      />
    );

    expect(screen.getByText("附加條款")).toBeInTheDocument();
    expect(screen.getByText("署名")).toBeInTheDocument();
    expect(screen.getByText("非商用")).toBeInTheDocument();
  });

  it("does not render the special terms section when array is empty", () => {
    render(
      <PublicScriptInfoOverlay title="Test" licenseSpecialTerms={[]} />
    );

    expect(screen.queryByText("附加條款")).not.toBeInTheDocument();
  });

  it("does not render the special terms section when prop is omitted", () => {
    render(<PublicScriptInfoOverlay title="Test" />);

    expect(screen.queryByText("附加條款")).not.toBeInTheDocument();
  });

  it("renders the info card when only licenseSpecialTerms is present (no prefaceItems)", () => {
    render(
      <PublicScriptInfoOverlay
        title="Test"
        licenseSpecialTerms={["只有附加條款"]}
        prefaceItems={[]}
        demoLinks={[]}
      />
    );

    expect(screen.getByText("附加條款")).toBeInTheDocument();
    expect(screen.getByText("只有附加條款")).toBeInTheDocument();
  });

  it("renders multiple terms as separate list items", () => {
    const terms = ["條款A", "條款B", "條款C"];
    render(<PublicScriptInfoOverlay title="Test" licenseSpecialTerms={terms} />);

    terms.forEach((term) => {
      expect(screen.getByText(term)).toBeInTheDocument();
    });
  });
});

describe("PublicScriptInfoOverlay – usage badges", () => {
  it("renders commercial badge when commercialUse is set", () => {
    render(
      <PublicScriptInfoOverlay
        title="Test"
        commercialUse="allow"
        derivativeUse="disallow"
        notifyOnModify="required"
      />
    );

    expect(screen.getByText(/商業使用.+可/)).toBeInTheDocument();
    expect(screen.getByText(/改作許可.+不可/)).toBeInTheDocument();
    expect(screen.getByText(/修改須通知作者/)).toBeInTheDocument();
  });

  it("renders no usage badges when all license fields are empty", () => {
    render(<PublicScriptInfoOverlay title="Test" />);

    expect(screen.queryByText(/商業使用/)).not.toBeInTheDocument();
    expect(screen.queryByText(/改作許可/)).not.toBeInTheDocument();
  });

  it("renders derivative badge with caution style for 'limited'", () => {
    render(
      <PublicScriptInfoOverlay title="Test" derivativeUse="limited" />
    );

    expect(screen.getByText(/改作許可.+需同意/)).toBeInTheDocument();
  });
});

describe("PublicScriptInfoOverlay – shared preface projection", () => {
  it("uses rawValue to preserve rich character cards when value is already formatted", () => {
    render(
      <PublicScriptInfoOverlay
        title="Test"
        prefaceItems={[
          {
            id: "roleSetting",
            title: "角色設定",
            value: "ＣＣ：冷靜",
            rawValue: JSON.stringify({ mode: "multi", items: [{ name: "ＣＣ", text: "冷靜" }] }),
          },
          {
            id: "performanceInstruction",
            title: "演繹指示",
            value: "ＣＣ：低聲",
            rawValue: JSON.stringify({ mode: "multi", items: [{ name: "ＣＣ", text: "低聲" }] }),
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "展開完整前置資訊" }));
    expect(screen.getByText("角色 1")).toBeInTheDocument();
    expect(screen.getByText("ＣＣ")).toBeInTheDocument();
    expect(screen.getByText("冷靜")).toBeInTheDocument();
    expect(screen.getByText("低聲")).toBeInTheDocument();
  });

  it("uses rawValue to preserve rich chapter cards when value is already formatted", () => {
    render(
      <PublicScriptInfoOverlay
        title="Test"
        prefaceItems={[
          {
            id: "chapterSettings",
            title: "章節",
            value: "第一章（環境：車站；狀況：告別）",
            rawValue: JSON.stringify({
              mode: "chapter_multi",
              items: [{ chapter: "第一章", environment: "車站", situation: "告別" }],
            }),
          },
        ]}
      />
    );

    expect(screen.getByText("第一章")).toBeInTheDocument();
    expect(screen.getByText("環境")).toBeInTheDocument();
    expect(screen.getByText("車站")).toBeInTheDocument();
    expect(screen.getByText("狀況")).toBeInTheDocument();
    expect(screen.getByText("告別")).toBeInTheDocument();
  });
});
