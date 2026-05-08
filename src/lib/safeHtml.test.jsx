import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { renderSafeHtml } from "./safeHtml";

const mount = (nodes) => render(<>{nodes}</>);

describe("renderSafeHtml", () => {
  it("returns null for empty input", () => {
    expect(renderSafeHtml("")).toBeNull();
    expect(renderSafeHtml(null)).toBeNull();
    expect(renderSafeHtml(undefined)).toBeNull();
  });

  it("renders allowed tags as React elements", () => {
    const { container } = mount(renderSafeHtml("<p>hello</p>"));
    expect(container.querySelector("p")).toBeInTheDocument();
    expect(container.querySelector("p").textContent).toBe("hello");
  });

  it("strips disallowed tags — no script or style elements rendered", () => {
    const nodes = renderSafeHtml('<p>safe</p><style>body{color:red}</style>');
    const { container } = mount(nodes);
    expect(container.querySelector("style")).toBeNull();
    expect(container.querySelector("p")).toBeInTheDocument();
  });

  it("strips img tags (XSS vector)", () => {
    const nodes = renderSafeHtml('<img src=x onerror="alert(1)">safe text');
    const { container } = mount(nodes);
    expect(container.querySelector("img")).toBeNull();
    // text content of img is empty, so 'safe text' comes from text node
    expect(container.textContent).toContain("safe text");
  });

  it("does not include event handler attributes", () => {
    const nodes = renderSafeHtml('<p onclick="alert(1)">click me</p>');
    const { container } = mount(nodes);
    const p = container.querySelector("p");
    expect(p).toBeInTheDocument();
    expect(p.getAttribute("onclick")).toBeNull();
  });

  it("allows whitelisted classes and strips non-whitelisted ones", () => {
    const nodes = renderSafeHtml('<p class="bold evil-class italic">text</p>');
    const { container } = mount(nodes);
    const p = container.querySelector("p");
    expect(p.className).toContain("bold");
    expect(p.className).toContain("italic");
    expect(p.className).not.toContain("evil-class");
  });

  it("strips all classes when none are whitelisted", () => {
    const nodes = renderSafeHtml('<p class="dangerous custom">text</p>');
    const { container } = mount(nodes);
    const p = container.querySelector("p");
    expect(p.className).toBe("");
  });

  it("allows margin-left style and strips other styles", () => {
    const nodes = renderSafeHtml('<p style="margin-left: 2rem; color: red">text</p>');
    const { container } = mount(nodes);
    const p = container.querySelector("p");
    expect(p.style.marginLeft).toBe("2rem");
    expect(p.style.color).toBe("");
  });

  it("handles elements with no style attribute", () => {
    const nodes = renderSafeHtml("<p>no style</p>");
    const { container } = mount(nodes);
    expect(container.querySelector("p").style.marginLeft).toBe("");
  });

  it("renders nested allowed elements", () => {
    const nodes = renderSafeHtml('<div class="title-page"><h1>Title</h1><p class="title-field">Field</p></div>');
    const { container } = mount(nodes);
    expect(container.querySelector("div.title-page")).toBeInTheDocument();
    expect(container.querySelector("h1").textContent).toBe("Title");
    expect(container.querySelector("p.title-field")).toBeInTheDocument();
  });

  it("handles plain text nodes", () => {
    const nodes = renderSafeHtml("just text");
    const { container } = mount(nodes);
    expect(container.textContent).toContain("just text");
  });

  it("renders span and strong tags", () => {
    const nodes = renderSafeHtml('<span class="bold">bold</span> and <strong>strong</strong>');
    const { container } = mount(nodes);
    expect(container.querySelector("span.bold")).toBeInTheDocument();
    expect(container.querySelector("strong")).toBeInTheDocument();
  });
});
