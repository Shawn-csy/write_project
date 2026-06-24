import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { jsonLdSafe, JsonLdScript } from "./jsonLd";

describe("jsonLdSafe", () => {
  it("escapes <", () => {
    expect(jsonLdSafe({ x: "<script>" })).not.toContain("<");
    expect(jsonLdSafe({ x: "<script>" })).toContain("\\u003cscript\\u003e");
  });

  it("escapes >", () => {
    expect(jsonLdSafe({ x: "a>b" })).toContain("a\\u003eb");
  });

  it("escapes &", () => {
    expect(jsonLdSafe({ x: "a&b" })).toContain("a\\u0026b");
  });

  it("does not double-escape valid JSON", () => {
    const input = { name: "hello world" };
    const result = jsonLdSafe(input);
    expect(result).toBe(JSON.stringify(input));
  });

  it("accepts object payload", () => {
    const result = jsonLdSafe({ "@type": "WebSite", name: "Test" });
    expect(result).toContain("WebSite");
    expect(result).toContain("Test");
  });

  it("accepts array payload", () => {
    const result = jsonLdSafe([{ "@type": "A" }, { "@type": "B" }]);
    expect(result).toContain('"@type":"A"');
    expect(result).toContain('"@type":"B"');
    expect(result.startsWith("[")).toBe(true);
  });
});

describe("JsonLdScript", () => {
  it("renders a script tag with type application/ld+json", () => {
    const { container } = render(<JsonLdScript data={{ "@type": "WebSite" }} />);
    const script = container.querySelector("script");
    expect(script).toBeTruthy();
    expect(script!.getAttribute("type")).toBe("application/ld+json");
  });

  it("content passes through jsonLdSafe", () => {
    const { container } = render(<JsonLdScript data={{ name: "<evil>" }} />);
    const script = container.querySelector("script");
    expect(script!.innerHTML).not.toContain("<evil>");
    expect(script!.innerHTML).toContain("\\u003cevil\\u003e");
  });

  it("renders array payload", () => {
    const { container } = render(<JsonLdScript data={[{ "@type": "A" }, { "@type": "B" }]} />);
    const script = container.querySelector("script");
    expect(script!.innerHTML.startsWith("[")).toBe(true);
  });
});
