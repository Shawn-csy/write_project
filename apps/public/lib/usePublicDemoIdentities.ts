"use client";

import { useEffect, useMemo, useState } from "react";
import { readPublicBundle } from "./readPublicBundle";
import type { PublicPersona } from "./types";

export function usePublicDemoIdentities(
  demos: readonly { voiceActorIds?: readonly string[]; manualVoiceActors?: readonly { personaId?: string }[] }[],
  known?: PublicPersona,
): ReadonlyMap<string, PublicPersona> {
  const needsLookup = demos.some((demo) => demo.voiceActorIds?.some((id) => id !== known?.id)
    || demo.manualVoiceActors?.some((actor) => actor.personaId && actor.personaId !== known?.id));
  const [people, setPeople] = useState<PublicPersona[]>([]);

  useEffect(() => {
    if (!needsLookup) return;
    let active = true;
    void readPublicBundle<{ personas?: PublicPersona[] }>(["personas"])
      .then(({ data }) => { if (active) setPeople(data.personas || []); })
      .catch(() => { /* Unlinked source names remain visible if the directory is unavailable. */ });
    return () => { active = false; };
  }, [needsLookup]);

  return useMemo(() => {
    const index = new Map(people.map((person) => [person.id, person]));
    if (known) index.set(known.id, known);
    return index;
  }, [known, people]);
}
