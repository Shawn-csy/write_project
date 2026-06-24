import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequireAuth } from "./RequireAuth";

const mockLocation = { pathname: "/workspace" };

vi.mock("react-router-dom", () => ({
  Navigate: ({ to, state }) => (
    <div data-testid="navigate" data-to={to} data-from={state?.from?.pathname ?? ""} />
  ),
  useLocation: () => mockLocation,
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../../contexts/AuthContext";

describe("RequireAuth", () => {
  it("renders children when user is authenticated", () => {
    useAuth.mockReturnValue({ currentUser: { uid: "u1" }, loading: false });
    render(<RequireAuth><div>protected content</div></RequireAuth>);
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  it("shows loading spinner while auth state is resolving", () => {
    useAuth.mockReturnValue({ currentUser: null, loading: true });
    const { container } = render(<RequireAuth><div>protected</div></RequireAuth>);
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects to /login when user is not authenticated and loading is done", () => {
    useAuth.mockReturnValue({ currentUser: null, loading: false });
    render(<RequireAuth><div>protected</div></RequireAuth>);
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/login");
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-from", "/workspace");
  });
});
