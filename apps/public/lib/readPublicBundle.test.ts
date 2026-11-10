import { beforeEach, describe, expect, it, vi } from "vitest";

const readJson = vi.hoisted(() => vi.fn());
vi.mock("./liveApi", () => ({ liveApi: { readJson } }));

import { readPublicBundle } from "./readPublicBundle";

describe("readPublicBundle", () => {
  beforeEach(() => readJson.mockReset());

  it("shares concurrent reads but fetches again after they finish", async () => {
    let resolve!: (value: { data: { scripts: number[] }; source: "primary" }) => void;
    readJson.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const first = readPublicBundle<{ scripts: number[] }>();
    const second = readPublicBundle<{ scripts: number[] }>();
    expect(first).toBe(second);
    expect(readJson).toHaveBeenCalledTimes(1);

    resolve({ data: { scripts: [1] }, source: "primary" });
    expect((await first).data.scripts).toEqual([1]);
    await second;

    readJson.mockResolvedValueOnce({ data: { scripts: [2] }, source: "primary" });
    expect((await readPublicBundle<{ scripts: number[] }>()).data.scripts).toEqual([2]);
    expect(readJson).toHaveBeenCalledTimes(2);
  });

  it("keeps concurrent section projections separate from full bundle reads", async () => {
    readJson.mockResolvedValue({ data: {}, source: "primary" });
    await Promise.all([
      readPublicBundle(["audioWorks", "organizations"]),
      readPublicBundle(["audioWorks", "organizations"]),
      readPublicBundle(),
    ]);
    expect(readJson).toHaveBeenCalledTimes(2);
    expect(readJson).toHaveBeenCalledWith(
      "/api/public-bundle?sections=audioWorks,organizations", { cache: "no-store" },
    );
    expect(readJson).toHaveBeenCalledWith("/api/public-bundle", { cache: "no-store" });
  });
});
