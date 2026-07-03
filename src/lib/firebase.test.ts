import { beforeEach, describe, expect, it, vi } from "vitest";

const initializeApp = vi.fn(() => ({ name: "app" }));
const getAuth = vi.fn(() => ({ currentUser: null }));
const isSupported = vi.fn(() => Promise.resolve(true));
const getAnalytics = vi.fn(() => ({ name: "analytics" }));

vi.mock("firebase/app", () => ({
  initializeApp,
}));

vi.mock("firebase/auth", () => ({
  getAuth,
}));

vi.mock("firebase/analytics", () => ({
  isSupported,
  getAnalytics,
  logEvent: vi.fn(),
}));

describe("firebase lazy loading", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    (window as typeof window & { __ENV__?: Record<string, string> }).__ENV__ = {
      VITE_FIREBASE_MEASUREMENT_ID: "G-TEST",
    };
  });

  it("initializes analytics without loading auth", async () => {
    const { initAnalytics } = await import("./firebase");

    await expect(initAnalytics()).resolves.toEqual({ name: "analytics" });
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(isSupported).toHaveBeenCalledTimes(1);
    expect(getAnalytics).toHaveBeenCalledWith({ name: "app" });
    expect(getAuth).not.toHaveBeenCalled();
  });

  it("loads auth only when explicitly requested", async () => {
    const { loadFirebaseAuth } = await import("./firebase");

    const result = await loadFirebaseAuth();
    expect(result.auth).toEqual({ currentUser: null });
    expect(getAuth).toHaveBeenCalledWith({ name: "app" });
  });
});
