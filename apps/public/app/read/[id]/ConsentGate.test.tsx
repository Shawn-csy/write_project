/**
 * ConsentGate tests.
 *
 * Covers:
 *   - shows loading state initially
 *   - renders terms UI when version not in localStorage
 *   - skips gate when version already accepted in localStorage
 *   - fails open when config fetch fails
 *   - accept button disabled until all required checks ticked
 *   - accept button enabled when all checks ticked
 *   - clicking accept POSTs to /api/public-terms-acceptances and reveals children
 *   - stores accepted version in localStorage after accept
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ConsentGate } from "./ConsentGate";

const MOCK_CONFIG = {
  termsKey: "voice_script_reader_v3",
  version: "2026-03-04",
  title: "授權聲明",
  intro: "請確認以下條款",
  sections: [{ id: "s1", title: "條款一", body: "內容一" }],
  requiredChecks: [{ id: "final_agreement", label: "我同意" }],
};

function makeFetch(config: typeof MOCK_CONFIG | null = MOCK_CONFIG, acceptOk = true) {
  return vi.fn().mockImplementation((url: string) => {
    if (String(url).includes("public-terms-config")) {
      if (config === null) return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(config) });
    }
    if (String(url).includes("public-terms-acceptances")) {
      return Promise.resolve({ ok: acceptOk, json: () => Promise.resolve({ success: true, acceptanceId: "acc-1", acceptedAt: Date.now() }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

describe("ConsentGate", () => {
  let originalFetch: typeof global.fetch;
  let storageMock: Record<string, string>;

  beforeEach(() => {
    originalFetch = global.fetch;
    storageMock = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storageMock[k] ?? null,
      setItem: (k: string, v: string) => { storageMock[k] = v; },
      removeItem: (k: string) => { delete storageMock[k]; },
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders children when version already accepted", async () => {
    storageMock["public-reader:terms-accepted:version"] = MOCK_CONFIG.version;
    global.fetch = makeFetch();
    await act(async () => {
      render(
        <ConsentGate scriptId="s1">
          <div>script content</div>
        </ConsentGate>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("script content")).not.toBeNull();
    });
    expect(screen.queryByText("授權聲明")).toBeNull();
  });

  it("shows terms UI when version not accepted", async () => {
    global.fetch = makeFetch();
    await act(async () => {
      render(
        <ConsentGate scriptId="s1">
          <div>script content</div>
        </ConsentGate>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("授權聲明")).not.toBeNull();
    });
    expect(screen.queryByText("script content")).toBeNull();
  });

  it("fails open when config fetch fails", async () => {
    global.fetch = makeFetch(null);
    await act(async () => {
      render(
        <ConsentGate scriptId="s1">
          <div>script content</div>
        </ConsentGate>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("script content")).not.toBeNull();
    });
  });

  it("accept button disabled until all checks ticked", async () => {
    global.fetch = makeFetch();
    await act(async () => {
      render(
        <ConsentGate scriptId="s1">
          <div>script content</div>
        </ConsentGate>
      );
    });
    await waitFor(() => expect(screen.queryByText("授權聲明")).not.toBeNull());
    const btn = screen.getByRole("button", { name: "同意並進入閱讀" });
    expect(btn).toBeDisabled();
  });

  it("accept button enabled after ticking all checks", async () => {
    const user = userEvent.setup();
    global.fetch = makeFetch();
    await act(async () => {
      render(
        <ConsentGate scriptId="s1">
          <div>script content</div>
        </ConsentGate>
      );
    });
    await waitFor(() => expect(screen.queryByText("我同意")).not.toBeNull());
    await user.click(screen.getByText("我同意"));
    expect(screen.getByRole("button", { name: "同意並進入閱讀" })).not.toBeDisabled();
  });

  it("accepting reveals children and stores version", async () => {
    const user = userEvent.setup();
    const fetchMock = makeFetch();
    global.fetch = fetchMock;
    await act(async () => {
      render(
        <ConsentGate scriptId="s1">
          <div>script content</div>
        </ConsentGate>
      );
    });
    await waitFor(() => expect(screen.queryByText("我同意")).not.toBeNull());
    await user.click(screen.getByText("我同意"));
    await user.click(screen.getByRole("button", { name: "同意並進入閱讀" }));
    await waitFor(() => {
      expect(screen.queryByText("script content")).not.toBeNull();
    });
    expect(storageMock["public-reader:terms-accepted:version"]).toBe(MOCK_CONFIG.version);
  });

  it("POSTs acceptance with scriptId and acceptedChecks", async () => {
    const user = userEvent.setup();
    const fetchMock = makeFetch();
    global.fetch = fetchMock;
    await act(async () => {
      render(
        <ConsentGate scriptId="my-script-123">
          <div>script content</div>
        </ConsentGate>
      );
    });
    await waitFor(() => expect(screen.queryByText("我同意")).not.toBeNull());
    await user.click(screen.getByText("我同意"));
    await user.click(screen.getByRole("button", { name: "同意並進入閱讀" }));
    await waitFor(() => expect(screen.queryByText("script content")).not.toBeNull());

    const postCall = fetchMock.mock.calls.find(([url]: [string]) =>
      String(url).includes("public-terms-acceptances")
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(postCall![1].body as string);
    expect(body.scriptId).toBe("my-script-123");
    expect(body.acceptedChecks).toContain("final_agreement");
    expect(body.termsVersion).toBe(MOCK_CONFIG.version);
  });
});
