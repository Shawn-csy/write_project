import { expect, it } from "vitest";
import { audioScriptWorksForPersona } from "./audioScriptWorks";
import type { PublicAudioWork, PublicPersona } from "./types";

it("uses confirmed work IDs after a rename and never guesses from identical names", () => {
  const persona = { id: "wind", displayName: "新名稱", workParticipations: [
    { id: "one", audioWorkId: "one", creditRole: "scriptwriter" },
    { id: "three", audioWorkId: "three", creditRole: "voice_actor" },
  ] } as PublicPersona;
  const works = [
    { id: "one", credits: [{ role: "script", creditedAs: "舊署名" }] },
    { id: "two", credits: [{ role: "script", creditedAs: "新名稱" }] },
    { id: "three", credits: [{ role: "voice_actor", creditedAs: "新名稱" }] },
  ] as PublicAudioWork[];
  expect(audioScriptWorksForPersona(persona, works).map((work) => work.id)).toEqual(["one"]);
  expect(audioScriptWorksForPersona({ id: "other", displayName: "舊署名" }, works)).toEqual([]);
});
