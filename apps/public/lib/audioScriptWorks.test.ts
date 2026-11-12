import { expect, it } from "vitest";
import { audioScriptWorksForPersona } from "./audioScriptWorks";
import type { PublicAudioWork, PublicPersona } from "./types";

it("links only audio scripts credited to the exact author identity", () => {
  const persona = { id: "wind", displayName: "風蓮/Hong Liân" } as PublicPersona;
  const works = [
    { id: "one", credits: [{ role: "script", creditedAs: "風蓮/Hong Liân" }] },
    { id: "two", credits: [{ role: "script", creditedAs: "風蓮" }] },
    { id: "three", credits: [{ role: "voice_actor", creditedAs: "風蓮/Hong Liân" }] },
  ] as PublicAudioWork[];
  expect(audioScriptWorksForPersona(persona, works).map((work) => work.id)).toEqual(["one"]);
});
