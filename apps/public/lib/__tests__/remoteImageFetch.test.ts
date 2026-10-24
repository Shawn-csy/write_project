import { describe, expect, it, vi } from "vitest";
import { fetchRemoteImage, isPrivateAddress } from "../remoteImageFetch";

describe("isPrivateAddress", () => {
  it.each([
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:169.254.169.254",
    "::ffff:a9fe:a9fe",
    "::ffff:10.0.0.5",
  ])("blocks IPv4-mapped private address %s", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it("allows an IPv4-mapped public address", () => {
    expect(isPrivateAddress("::ffff:808:808")).toBe(false);
  });
});

describe("fetchRemoteImage", () => {
  it("passes only the validated DNS answers to the request transport on every redirect hop", async () => {
    const firstAddress = { address: "93.184.216.34", family: 4 as const };
    const secondAddress = { address: "1.1.1.1", family: 4 as const };
    const resolve = vi.fn(async (hostname: string) => (hostname === "images.example" ? [firstAddress] : [secondAddress]));
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://cdn.example/a.png" } }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } }));

    const response = await fetchRemoteImage(new URL("https://images.example/a.png"), { resolve, request });

    expect(response?.status).toBe(200);
    expect(resolve.mock.calls.map(([hostname]) => hostname)).toEqual(["images.example", "cdn.example"]);
    expect(request.mock.calls).toEqual([
      [new URL("https://images.example/a.png"), [firstAddress]],
      [new URL("https://cdn.example/a.png"), [secondAddress]],
    ]);
  });

  it("rejects the entire DNS answer set if any answer is private", async () => {
    const request = vi.fn();
    const resolve = vi.fn(async () => [
      { address: "93.184.216.34", family: 4 as const },
      { address: "::ffff:a9fe:a9fe", family: 6 as const },
    ]);

    const response = await fetchRemoteImage(new URL("https://mixed.example/a.png"), { resolve, request });

    expect(response).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it("does not request a private redirect target", async () => {
    const resolve = vi.fn(async () => [{ address: "93.184.216.34", family: 4 as const }]);
    const request = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location: "http://169.254.169.254/latest/meta-data" },
    }));

    const response = await fetchRemoteImage(new URL("https://images.example/a.png"), { resolve, request });

    expect(response).toBeNull();
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("rejects a URL-canonical mapped private IPv6 host before DNS or transport", async () => {
    const resolve = vi.fn();
    const request = vi.fn();

    const response = await fetchRemoteImage(new URL("http://[::ffff:127.0.0.1]/a.png"), { resolve, request });

    expect(response).toBeNull();
    expect(resolve).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
});
