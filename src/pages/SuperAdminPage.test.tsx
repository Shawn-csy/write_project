import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import SuperAdminPage from "./SuperAdminPage";

vi.mock("../hooks/useAdminPageState", () => ({
  useAdminPageState: () => ({
    profile: { isAdmin: true }, currentUser: { displayName: "Root", uid: "u1" }, t: (k: string) => k,
    users: [], orgs: [], scripts: [], personas: [], authorPersonas: [],
    filteredScripts: [], filteredOrgs: [], filteredPersonas: [], filteredUsers: [],
    isLoading: false, listQuery: "", scriptFilter: "", scriptStatusFilter: "all", orgFilter: "", personaFilter: "", userFilter: "", newOrgName: "",
    setScriptFilter: vi.fn(), setScriptStatusFilter: vi.fn(), setOrgFilter: vi.fn(), setPersonaFilter: vi.fn(), setUserFilter: vi.fn(), setNewOrgName: vi.fn(),
    loadAllData: vi.fn(), getOwnerLabel: () => "", showTransferModal: false, showScriptSettingsModal: false,
  }),
}));
vi.mock("../lib/api/admin", () => ({
  getExternalAuthorProfileSubmissionsAdmin: vi.fn().mockResolvedValue({ total: 2 }),
  getPublicDemoSubmissionsAdmin: vi.fn().mockResolvedValue({ total: 0 }),
  getPublicFeedbackAdmin: vi.fn().mockResolvedValue({ total: 0 }),
  getVoiceActorProfileSubmissionsAdmin: vi.fn().mockResolvedValue({ total: 0 }),
}));
vi.mock("../components/studio/StudioShellContext", () => ({ useStudioShell: () => ({ openMobileMenu: vi.fn() }) }));
vi.mock("../components/dashboard/ScriptMetadataDialog", () => ({ ScriptMetadataDialog: () => null }));
for (const name of [
  "AdminUserManagementCard", "TermsAcceptanceTable", "HomepageBannerSection", "ExternalPublicScriptSection", "ExternalAuthorPagesSection",
  "ActivityPagesAdminSection", "ActivitySubmissionsAdminSection", "VoiceActorManagementSection", "PublicFeedbackInbox", "PublicDemoSubmissionInbox",
  "PublicDemoManagement", "VoiceActorProfileReviewInbox", "ExternalAuthorProfileReviewInbox", "AdminTransferModal",
]) {
  vi.doMock(`../components/admin/${name}`, () => ({ [name]: () => <div data-testid={name} /> }));
}

function Loc() { const l = useLocation(); return <div data-testid="loc">{l.search}</div>; }

describe("SuperAdminPage", () => {
  it("renders 6 groups, no placeholder text, and rewrites legacy links", async () => {
    const { container } = render(<MemoryRouter initialEntries={["/superadmin?section=claims"]}><SuperAdminPage /><Loc /></MemoryRouter>);
    expect(screen.getAllByRole("tab")).toHaveLength(6);
    expect(container.textContent).not.toMatch(/尚未啟用|尚未接入/);
    expect(await screen.findByTestId("loc")).toHaveTextContent("?section=applications");
  });

  it("legacy studios link lands on external scripts", async () => {
    render(<MemoryRouter initialEntries={["/superadmin?section=external&resource=studios"]}><SuperAdminPage /><Loc /></MemoryRouter>);
    expect(await screen.findByTestId("loc")).toHaveTextContent("resource=scripts");
  });
});
