import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { PublicAudioWorkSubmissionInbox } from "./PublicAudioWorkSubmissionInbox";

const mocks = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn() }));
vi.mock("../../lib/api/admin", () => ({
  getPublicAudioWorkSubmissionsAdmin: mocks.list,
  updatePublicAudioWorkSubmissionAdmin: mocks.update,
  getAllOrganizationsAdmin: async () => [{ id: "org", name: "社團" }],
  getAllPersonasAdmin: async () => [{ id: "record-person", displayName: "錄音者新名" }],
}));
vi.mock("../../lib/api/organizations", () => ({ createOrganization: vi.fn() }));
vi.mock("../../lib/adminNotifications", () => ({ notifyAdminQueueUpdated: vi.fn() }));

it("reviews every role through one roster and sends confirmed IDs with original names", async () => {
  const item = { id: "w", title: "作品", url: "https://example.com/work", organizationId: "org", status: "approved", createdAt: 1,
    participants: [{ role: "recording_studio", personaId: null, creditedAs: "舊署名", sourceUrl: "https://example.com/source" }], unresolvedParticipantCount: 1 };
  mocks.list.mockResolvedValue({ total: 1, items: [item] });
  mocks.update.mockResolvedValue({ ...item, participants: [{ ...item.participants[0], personaId: "record-person" }], unresolvedParticipantCount: 0 });
  const user = userEvent.setup();
  render(<PublicAudioWorkSubmissionInbox />);
  await screen.findByText("作品");
  await user.click(screen.getByText(/參與作品職務/));
  await user.selectOptions(screen.getByLabelText(/連結身份 1/), "record-person");
  await user.click(screen.getByRole("button", { name: "儲存參與職務" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("w", "approved", "org", undefined, "paid", [
    { ...item.participants[0], personaId: "record-person" },
  ]));
  await user.click(screen.getByLabelText("只顯示尚未連結身份的作品"));
  await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ unresolvedOnly: true })));
});
