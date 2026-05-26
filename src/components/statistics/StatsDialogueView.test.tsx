import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatsDialogueView } from "./StatsDialogueView";

vi.mock("@/contexts/I18nContext", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe("StatsDialogueView", () => {
  it("passes line metadata when clicking a clean dialogue row", () => {
    const onLocate = vi.fn();
    const payload = { text: "Hello world", line: 42 };

    render(
      <StatsDialogueView
        dialogueLines={[payload]}
        getCleanText={(text) => text}
        onLocate={onLocate}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Hello world" }));
    expect(onLocate).toHaveBeenCalledWith(payload);
  });
});
