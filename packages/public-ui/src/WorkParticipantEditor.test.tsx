import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { WorkParticipantEditor, type WorkParticipantInput } from "./WorkParticipantEditor";

it("lets a reviewer distinguish identical names by identity and keep attribution", async () => {
  let result: WorkParticipantInput[] = [];
  function Form() {
    const [value, setValue] = useState<WorkParticipantInput[]>([{ role: "recording_studio", creditedAs: "原署名" }]);
    result = value;
    return <WorkParticipantEditor value={value} onChange={setValue} identities={[
      { id: "person-a", displayName: "同名" }, { id: "person-b", displayName: "同名" },
    ]} />;
  }
  render(<Form />);
  const user = userEvent.setup();
  expect(screen.getByText("尚未連結個人頁")).toBeTruthy();
  await user.selectOptions(screen.getByLabelText(/連結身份 1/), "person-b");
  expect(result[0]).toMatchObject({ personaId: "person-b", creditedAs: "原署名", role: "recording_studio" });
  await user.selectOptions(screen.getByLabelText(/連結身份 1/), "");
  expect(result[0].personaId).toBeNull();
});
