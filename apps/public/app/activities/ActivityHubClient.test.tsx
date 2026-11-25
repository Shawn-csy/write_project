import { render, screen, waitFor } from "@testing-library/react";
import { readPublicBundle } from "@/lib/readPublicBundle";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ActivityHubClient } from "./ActivityHubClient";

vi.mock("@/lib/readPublicBundle", () => ({
  readPublicBundle: vi.fn().mockResolvedValue({ data: {
    activityPages: [{
      id: "activity", slug: "activity", title: "測試活動", status: "published", sortOrder: 0,
      acceptingSubmissions: true, scriptIds: [], externalScriptIds: [],
    }],
  } }),
}));

it("activity submission closes on Escape and returns focus to the button that opened it", async () => {
  const user = userEvent.setup();
  render(<ActivityHubClient />);

  const trigger = await screen.findByRole("button", { name: "投稿 Demo" });
  await user.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "投稿 Demo" });
  expect(dialog.contains(document.activeElement)).toBe(true);
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(trigger).toHaveFocus());
});

it("loads only the activity index when there are no public activities", async () => {
  const read = vi.mocked(readPublicBundle);
  read.mockClear().mockResolvedValueOnce({ data: { activityPages: [] }, source: "primary" });
  render(<ActivityHubClient />);

  expect(await screen.findByText("目前沒有公開活動")).toBeInTheDocument();
  expect(read.mock.calls).toEqual([[["activityPages"]]]);
});

it("uses an empty server activity index without another browser request", () => {
  const read = vi.mocked(readPublicBundle);
  read.mockClear();
  render(<ActivityHubClient initialPages={[]} />);

  expect(screen.getByText("目前沒有公開活動")).toBeInTheDocument();
  expect(read).not.toHaveBeenCalled();
});
