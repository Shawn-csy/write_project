import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScriptMetadataBootstrap } from "./useScriptMetadataBootstrap";

vi.mock("../../lib/api/personas", () => ({
  getPersonas: vi.fn(),
}));

vi.mock("../../lib/api/organizations", () => ({
  getOrganizations: vi.fn(),
  getOrganization: vi.fn(),
}));

vi.mock("../../lib/api/user", () => ({
  getUserProfile: vi.fn(),
}));

vi.mock("../../services/settingsApi", () => ({
  fetchUserThemes: vi.fn(),
}));

vi.mock("../../lib/orgAffiliation", () => ({
  buildAffiliatedOrganizations: vi.fn(),
}));

import { getPersonas } from "../../lib/api/personas";
import { getOrganizations } from "../../lib/api/organizations";
import { fetchUserThemes } from "../../services/settingsApi";
import { buildAffiliatedOrganizations } from "../../lib/orgAffiliation";

describe("useScriptMetadataBootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPersonas.mockResolvedValue([]);
    getOrganizations.mockResolvedValue([]);
    fetchUserThemes.mockResolvedValue([]);
    buildAffiliatedOrganizations.mockResolvedValue([]);
  });

  it("bootstraps only once during a single open session", async () => {
    const loadTags = vi.fn();
    const setPersonas = vi.fn();
    const setOrgs = vi.fn();
    const setMarkerThemes = vi.fn();
    const setShowPersonaSetupDialog = vi.fn();
    const t = vi.fn((k) => k);

    const { rerender } = renderHook(
      ({ open, currentProfile }) =>
        useScriptMetadataBootstrap({
          open,
          currentUser: { uid: "u1" },
          currentProfile,
          t,
          loadTags,
          setPersonas,
          setOrgs,
          setMarkerThemes,
          setShowPersonaSetupDialog,
        }),
      {
        initialProps: {
          open: true,
          currentProfile: { id: "p1" },
        },
      },
    );

    await waitFor(() => {
      expect(getPersonas).toHaveBeenCalledTimes(1);
      expect(getOrganizations).toHaveBeenCalledTimes(1);
      expect(fetchUserThemes).toHaveBeenCalledTimes(1);
    });

    rerender({ open: true, currentProfile: { id: "p1", updatedAt: Date.now() } });
    rerender({ open: true, currentProfile: { id: "p1", foo: "bar" } });

    await waitFor(() => {
      expect(getPersonas).toHaveBeenCalledTimes(1);
      expect(getOrganizations).toHaveBeenCalledTimes(1);
      expect(fetchUserThemes).toHaveBeenCalledTimes(1);
    });

    rerender({ open: false, currentProfile: { id: "p1" } });
    rerender({ open: true, currentProfile: { id: "p1" } });

    await waitFor(() => {
      expect(getPersonas).toHaveBeenCalledTimes(2);
      expect(getOrganizations).toHaveBeenCalledTimes(2);
      expect(fetchUserThemes).toHaveBeenCalledTimes(2);
    });
  });
});
