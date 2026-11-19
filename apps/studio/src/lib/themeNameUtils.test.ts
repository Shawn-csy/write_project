import { describe, it, expect } from "vitest";
import { normalizeThemeName, isDefaultLikeTheme } from "./themeNameUtils";

describe("normalizeThemeName", () => {
  it("lowercases input", () => {
    expect(normalizeThemeName("DEFAULT")).toBe("default");
  });

  it("strips whitespace", () => {
    expect(normalizeThemeName("My Theme")).toBe("mytheme");
  });

  it("strips parentheses and brackets", () => {
    expect(normalizeThemeName("Default (Theme)")).toBe("defaulttheme");
    expect(normalizeThemeName("Theme [A]")).toBe("themea");
    expect(normalizeThemeName("Theme {B}")).toBe("themeb");
  });

  it("strips hyphens and underscores", () => {
    expect(normalizeThemeName("my-theme_name")).toBe("mythemename");
  });

  it("preserves CJK characters", () => {
    expect(normalizeThemeName("預設主題")).toBe("預設主題");
  });

  it("strips full-width parentheses", () => {
    expect(normalizeThemeName("預設（主題）")).toBe("預設主題");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeThemeName("")).toBe("");
  });

  it("uses empty string as default parameter", () => {
    expect(normalizeThemeName()).toBe("");
  });
});

describe("isDefaultLikeTheme", () => {
  it("returns true for theme with id 'default'", () => {
    expect(isDefaultLikeTheme({ id: "default", name: "Foo" })).toBe(true);
  });

  it("returns false for id 'default' when includeDefaultId is false", () => {
    expect(
      isDefaultLikeTheme({ id: "default", name: "Foo" }, { includeDefaultId: false })
    ).toBe(false);
  });

  it("returns true for theme name containing 'default' (case-insensitive)", () => {
    expect(isDefaultLikeTheme({ id: "abc", name: "Default Theme" })).toBe(true);
    expect(isDefaultLikeTheme({ id: "abc", name: "MY DEFAULT" })).toBe(true);
  });

  it("returns true for theme name containing '預設'", () => {
    expect(isDefaultLikeTheme({ id: "abc", name: "預設主題 (Default)" })).toBe(true);
    expect(isDefaultLikeTheme({ id: "abc", name: "預設" })).toBe(true);
  });

  it("returns false for non-default theme names", () => {
    expect(isDefaultLikeTheme({ id: "custom", name: "My Custom Theme" })).toBe(false);
    expect(isDefaultLikeTheme({ id: "abc", name: "Action Style" })).toBe(false);
  });

  it("returns false for null input", () => {
    expect(isDefaultLikeTheme(null)).toBe(false);
    expect(isDefaultLikeTheme(undefined)).toBe(false);
  });

  it("handles theme with no name", () => {
    expect(isDefaultLikeTheme({ id: "custom" })).toBe(false);
  });
});
