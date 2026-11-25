import { describe, expect, it } from "vitest";
import { publicScriptAttribution } from "./publicScriptAttribution";
import type { PublicScript } from "./types";

describe("public script attribution", () => {
  const script = {
    id: "script", title: "台本",
    persona: { id: "writer", displayName: "作者", avatar: "/media/writer.png" },
    owner: { id: "owner", displayName: "帳號別名" },
  } as PublicScript;

  it("uses the public persona and avatar for the normal author link", () => {
    expect(publicScriptAttribution(script)).toEqual({
      authorName: "作者", authorHref: "/author/writer", authorAvatarUrl: "/media/writer.png",
    });
  });

  it("keeps custom and owner credits associated with their actual displayed name", () => {
    expect(publicScriptAttribution({ ...script, authorOverrideName: "委託署名" })).toEqual({ authorName: "委託署名" });
    expect(publicScriptAttribution({ ...script, authorDisplayMode: "owner" })).toMatchObject({
      authorName: "帳號別名", authorHref: undefined,
    });
  });
});
