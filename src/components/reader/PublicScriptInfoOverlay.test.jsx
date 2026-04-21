import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicScriptInfoOverlay } from "./PublicScriptInfoOverlay";

vi.mock("../ui/AuthorBadge", () => ({
  AuthorBadge: ({ author }) => <span data-testid="author-badge">{author?.displayName}</span>,
}));

vi.mock("../ui/badge", () => ({
  Badge: ({ children, style }) => (
    <span data-testid="badge" style={style}>{children}</span>
  ),
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

    const badges = screen.getAllByTestId("badge");
    const labels = badges.map((b) => b.textContent);
    expect(labels.some((l) => l.includes("商業使用") && l.includes("可"))).toBe(true);
    expect(labels.some((l) => l.includes("改作許可") && l.includes("不可"))).toBe(true);
    expect(labels.some((l) => l.includes("修改須通知作者"))).toBe(true);
  });

  it("renders no usage badges when all license fields are empty", () => {
    render(<PublicScriptInfoOverlay title="Test" />);

    expect(screen.queryAllByTestId("badge")).toHaveLength(0);
  });

  it("renders derivative badge with caution style for 'limited'", () => {
    render(
      <PublicScriptInfoOverlay title="Test" derivativeUse="limited" />
    );

    const badges = screen.getAllByTestId("badge");
    const derivativeBadge = badges.find((b) => b.textContent.includes("改作許可"));
    expect(derivativeBadge?.textContent).toContain("需同意");
  });
});
