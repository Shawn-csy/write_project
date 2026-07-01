import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "./LoginPage";

const navigate = vi.fn();
let mockLocationState: unknown = null;

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ state: mockLocationState }),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../contexts/AuthContext";

describe("LoginPage", () => {
  beforeEach(() => {
    navigate.mockReset();
    mockLocationState = null;
  });

  it("redirects authenticated users to the requested workspace URL", async () => {
    mockLocationState = {
      from: { pathname: "/edit/script-1", search: "?mode=read", hash: "#scene-2" },
    };
    useAuth.mockReturnValue({
      currentUser: { uid: "u1" },
      login: vi.fn(),
      loading: false,
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/edit/script-1?mode=read#scene-2", { replace: true });
    });
  });

  it("logs in and returns signed-out users to the requested workspace URL", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    mockLocationState = {
      from: { pathname: "/dashboard", search: "?tab=write", hash: "" },
    };
    useAuth.mockReturnValue({
      currentUser: null,
      login,
      loading: false,
    });

    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: "使用 Google 帳號登入" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith("/dashboard?tab=write", { replace: true });
    });
  });
});
