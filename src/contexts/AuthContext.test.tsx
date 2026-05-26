import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

// ------ Firebase mocks ------
let authStateCallback = null;

vi.mock("../lib/firebase", () => ({
  auth: { currentUser: null },
  googleProvider: {},
  initAnalytics: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  signInWithPopup: vi.fn().mockResolvedValue({ user: { uid: "u1" } }),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn((auth, cb) => {
    authStateCallback = cb;
    return vi.fn(); // unsubscribe
  }),
}));

vi.mock("../lib/api/user", () => ({
  getUserProfile: vi.fn().mockResolvedValue(null),
  updateUserProfile: vi.fn().mockResolvedValue({}),
}));

// ------ helper ------
function TestConsumer() {
  const { currentUser, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{currentUser ? `user:${currentUser.uid}` : "no-user"}</div>;
}

const wrap = () => render(<AuthProvider><TestConsumer /></AuthProvider>);

describe("AuthContext", () => {
  beforeEach(() => {
    authStateCallback = null;
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    wrap();
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("resolves to no-user when auth fires with null", async () => {
    wrap();
    await act(async () => { authStateCallback(null); });
    expect(screen.getByText("no-user")).toBeInTheDocument();
  });

  it("resolves to user when auth fires with a user object", async () => {
    wrap();
    await act(async () => { authStateCallback({ uid: "abc123", email: "a@b.com", displayName: "A", photoURL: "" }); });
    await waitFor(() => expect(screen.getByText("user:abc123")).toBeInTheDocument());
  });

  it("exposes login and logout functions", () => {
    function ActionsConsumer() {
      const { login, logout } = useAuth();
      return (
        <>
          <button onClick={login}>login</button>
          <button onClick={logout}>logout</button>
        </>
      );
    }
    render(<AuthProvider><ActionsConsumer /></AuthProvider>);
    expect(screen.getByText("login")).toBeInTheDocument();
    expect(screen.getByText("logout")).toBeInTheDocument();
  });

  it("saveProfile merges updates into profile state", async () => {
    const { updateUserProfile } = await import("../lib/api/user");
    updateUserProfile.mockResolvedValue({ displayName: "New Name" });

    function SaveConsumer() {
      const { saveProfile, profile } = useAuth();
      return (
        <>
          <button onClick={() => saveProfile({ displayName: "New Name" })}>save</button>
          <div>{profile?.displayName || "none"}</div>
        </>
      );
    }

    render(<AuthProvider><SaveConsumer /></AuthProvider>);
    await act(async () => { authStateCallback({ uid: "u1", email: "a@b.com", displayName: "Old", photoURL: "" }); });

    const btn = screen.getByText("save");
    await act(async () => { btn.click(); });
    await waitFor(() => expect(screen.getByText("New Name")).toBeInTheDocument());
  });
});
