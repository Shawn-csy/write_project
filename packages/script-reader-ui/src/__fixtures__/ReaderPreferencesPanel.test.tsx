/**
 * ReaderPreferencesPanel interaction tests.
 *
 * Covers:
 *   - trigger button renders and toggles panel open/closed
 *   - theme buttons call setTheme
 *   - font family buttons call setFontFamily
 *   - font size + button calls setFontSize with next size
 *   - font size − button calls setFontSize with previous size
 *   - font size − disabled when at minimum
 *   - font size + disabled when at maximum
 *   - line height button calls setLineHeight
 *   - reset button calls reset
 *   - panel closed by default
 *   - Esc / outside click close through Radix Popover
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReaderPreferencesPanel } from "../ReaderPreferencesPanel";
import type { ReaderPreferencesState } from "../readerPreferences";
import { DEFAULT_READER_PREFERENCES, READER_FONT_SIZES } from "../readerPreferences";

function makePrefs(overrides: Partial<ReaderPreferencesState> = {}): ReaderPreferencesState {
  return {
    preferences: { ...DEFAULT_READER_PREFERENCES },
    setTheme: vi.fn(),
    setFontSize: vi.fn(),
    setLineHeight: vi.fn(),
    setFontFamily: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

describe("ReaderPreferencesPanel", () => {
  it("renders trigger button", () => {
    render(<ReaderPreferencesPanel preferences={makePrefs()} />);
    expect(screen.getByRole("button", { name: /閱讀設定/i })).toBeInTheDocument();
  });

  it("panel hidden by default", () => {
    render(<ReaderPreferencesPanel preferences={makePrefs()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("clicking trigger opens panel", async () => {
    const user = userEvent.setup();
    render(<ReaderPreferencesPanel preferences={makePrefs()} />);
    await user.click(screen.getByRole("button", { name: /閱讀設定/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clicking trigger again closes panel", async () => {
    const user = userEvent.setup();
    render(<ReaderPreferencesPanel preferences={makePrefs()} />);
    await user.click(screen.getByRole("button", { name: /閱讀設定/i }));
    await user.click(screen.getByRole("button", { name: /閱讀設定/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("theme button calls setTheme", async () => {
    const user = userEvent.setup();
    const prefs = makePrefs();
    render(<ReaderPreferencesPanel preferences={prefs} />);
    await user.click(screen.getByRole("button", { name: /閱讀設定/i }));
    await user.click(screen.getByRole("button", { name: "深色" }));
    expect(prefs.setTheme).toHaveBeenCalledWith("dark");
  });

  it("font family button calls setFontFamily", async () => {
    const user = userEvent.setup();
    const prefs = makePrefs();
    render(<ReaderPreferencesPanel preferences={prefs} />);
    await user.click(screen.getByRole("button", { name: /閱讀設定/i }));
    await user.click(screen.getByRole("button", { name: "襯線" }));
    expect(prefs.setFontFamily).toHaveBeenCalledWith("serif");
  });

  it("font size + button calls setFontSize with next size", async () => {
    const user = userEvent.setup();
    const prefs = makePrefs();
    // Default fontSize is 16 (index 2 in [12,14,16,18,20,24])
    render(<ReaderPreferencesPanel preferences={prefs} />);
    await user.click(screen.getByRole("button", { name: /閱讀設定/i }));
    await user.click(screen.getByRole("button", { name: "放大字級" }));
    expect(prefs.setFontSize).toHaveBeenCalledWith(18);
  });

  it("font size − button calls setFontSize with previous size", async () => {
    const user = userEvent.setup();
    const prefs = makePrefs();
    render(<ReaderPreferencesPanel preferences={prefs} />);
    await user.click(screen.getByRole("button", { name: /閱讀設定/i }));
    await user.click(screen.getByRole("button", { name: "縮小字級" }));
    expect(prefs.setFontSize).toHaveBeenCalledWith(14);
  });

  it("font size − disabled at minimum", async () => {
    const user = userEvent.setup();
    const prefs = makePrefs({
      preferences: { ...DEFAULT_READER_PREFERENCES, fontSize: READER_FONT_SIZES[0] },
    });
    render(<ReaderPreferencesPanel preferences={prefs} />);
    await user.click(screen.getByRole("button", { name: /閱讀設定/i }));
    expect(screen.getByRole("button", { name: "縮小字級" })).toBeDisabled();
  });

  it("font size + disabled at maximum", async () => {
    const user = userEvent.setup();
    const prefs = makePrefs({
      preferences: { ...DEFAULT_READER_PREFERENCES, fontSize: READER_FONT_SIZES[READER_FONT_SIZES.length - 1] },
    });
    render(<ReaderPreferencesPanel preferences={prefs} />);
    await user.click(screen.getByRole("button", { name: /閱讀設定/i }));
    expect(screen.getByRole("button", { name: "放大字級" })).toBeDisabled();
  });

  it("line height button calls setLineHeight", async () => {
    const user = userEvent.setup();
    const prefs = makePrefs();
    render(<ReaderPreferencesPanel preferences={prefs} />);
    await user.click(screen.getByRole("button", { name: /閱讀設定/i }));
    await user.click(screen.getByRole("button", { name: "2" }));
    expect(prefs.setLineHeight).toHaveBeenCalledWith(2);
  });

  it("reset button calls reset", async () => {
    const user = userEvent.setup();
    const prefs = makePrefs();
    render(<ReaderPreferencesPanel preferences={prefs} />);
    await user.click(screen.getByRole("button", { name: /閱讀設定/i }));
    await user.click(screen.getByRole("button", { name: "恢復預設" }));
    expect(prefs.reset).toHaveBeenCalled();
  });

  it("Escape closes the panel", async () => {
    const user = userEvent.setup();
    render(<ReaderPreferencesPanel preferences={makePrefs()} />);
    await user.click(screen.getByRole("button", { name: /閱讀設定/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("outside click closes the panel", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">outside</button>
        <ReaderPreferencesPanel preferences={makePrefs()} />
      </>
    );
    await user.click(screen.getByRole("button", { name: /閱讀設定/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
