import { lookup } from "node:dns/promises";
import { request as httpRequest, type RequestOptions } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";

const UPSTREAM_TIMEOUT_MS = 10_000;
const MAX_REMOTE_REDIRECTS = 3;

type ResolvedAddress = { address: string; family: 4 | 6 };
type RemoteFetchDependencies = {
  resolve: (hostname: string) => Promise<ResolvedAddress[] | null>;
  request: (url: URL, addresses: ResolvedAddress[]) => Promise<Response>;
};

function ipv4IsPrivate(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2) || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function ipv6Bytes(address: string): number[] | null {
  let normalized = address.toLowerCase();
  if (normalized.includes(".")) {
    const separator = normalized.lastIndexOf(":");
    if (separator < 0) return null;
    const ipv4 = normalized.slice(separator + 1);
    const octets = ipv4.split(".").map(Number);
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
    const firstWord = ((octets[0] << 8) | octets[1]).toString(16);
    const secondWord = ((octets[2] << 8) | octets[3]).toString(16);
    normalized = `${normalized.slice(0, separator)}:${firstWord}:${secondWord}`;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  const words = [...left, ...Array(Math.max(missing, 0)).fill("0"), ...right].map((word) => Number.parseInt(word, 16));
  if (words.length !== 8 || words.some((word) => !Number.isInteger(word) || word < 0 || word > 0xffff)) return null;
  return words.flatMap((word) => [word >> 8, word & 0xff]);
}

/** Identifies private and special-use addresses, including URL-canonical IPv4-mapped IPv6 forms. */
export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase();
  const family = isIP(ip);
  if (family === 4) return ipv4IsPrivate(ip);
  if (family !== 6) return true;

  const bytes = ipv6Bytes(ip);
  if (!bytes) return true;
  const allZero = bytes.every((byte) => byte === 0);
  const loopback = allZero || (bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1);
  if (loopback) return true;

  // Unique local (fc00::/7), link local (fe80::/10), deprecated site local (fec0::/10), and multicast (ff00::/8).
  if (
    (bytes[0] & 0xfe) === 0xfc ||
    (bytes[0] === 0xfe && ((bytes[1] & 0xc0) === 0x80 || (bytes[1] & 0xc0) === 0xc0)) ||
    bytes[0] === 0xff
  ) return true;

  const mappedV4 = bytes.slice(0, 10).every((byte) => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  if (mappedV4) return ipv4IsPrivate(bytes.slice(12).join("."));

  // Deprecated IPv4-compatible addresses have ambiguous routing; reject them.
  if (bytes.slice(0, 12).every((byte) => byte === 0)) return true;

  // Tunnel/translation ranges can carry an otherwise private IPv4 destination.
  const sixToFour = bytes[0] === 0x20 && bytes[1] === 0x02;
  if (sixToFour) return true;
  const teredo = bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0 && bytes[3] === 0;
  if (teredo) return true;
  const wellKnownNat64 =
    bytes[0] === 0x00 &&
    bytes[1] === 0x64 &&
    bytes[2] === 0xff &&
    bytes[3] === 0x9b &&
    bytes.slice(4, 12).every((byte) => byte === 0);
  if (wellKnownNat64) return ipv4IsPrivate(bytes.slice(12).join("."));
  const localNat64 = bytes.slice(0, 6).join(",") === [0x00, 0x64, 0xff, 0x9b, 0x00, 0x01].join(",");
  if (localNat64) return true;

  // Documentation and protocol-assignment ranges are not usable public image hosts.
  const documentation = bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8;
  const benchmarking = bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x02;
  return documentation || benchmarking || (bytes[0] & 0xe0) !== 0x20;
}

function stripBrackets(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "");
}

function isDisallowedRemoteHost(hostname: string): boolean {
  const host = stripBrackets(hostname).toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  return isIP(host) !== 0 && isPrivateAddress(host);
}

async function resolvePublicAddresses(hostname: string): Promise<ResolvedAddress[] | null> {
  const host = stripBrackets(hostname);
  const family = isIP(host);
  if (family !== 0) {
    if (isPrivateAddress(host)) return null;
    return [{ address: host, family: family as 4 | 6 }];
  }

  try {
    const records = await lookup(host, { all: true, verbatim: true });
    if (!records.length || records.some((record) => isPrivateAddress(record.address))) return null;
    return records.map((record) => ({ address: record.address, family: record.family as 4 | 6 }));
  } catch {
    return null;
  }
}

function createPinnedLookup(addresses: ResolvedAddress[]): NonNullable<RequestOptions["lookup"]> {
  return (_hostname, options, callback) => {
    if (options.all) {
      callback(null, addresses.map(({ address, family }) => ({ address, family })));
      return;
    }
    const selected = addresses[0];
    if (!selected) {
      callback(Object.assign(new Error("No vetted address"), { code: "ENOTFOUND" }), "", 0);
      return;
    }
    callback(null, selected.address, selected.family);
  };
}

async function requestPinnedRemoteImage(url: URL, addresses: ResolvedAddress[]): Promise<Response> {
  const makeRequest = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise<Response>((resolve, reject) => {
    const request = makeRequest(
      url,
      {
        lookup: createPinnedLookup(addresses),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      },
      (incoming) => {
        const headers = new Headers();
        for (const name of ["content-type", "content-length", "location"] as const) {
          const value = incoming.headers[name] as string | string[] | undefined;
          if (typeof value === "string") headers.set(name, value);
          else if (Array.isArray(value)) headers.set(name, value.join(", "));
        }

        const status = incoming.statusCode || 502;
        const hasNoBody = status === 204 || status === 205 || status === 304;
        const body = hasNoBody ? null : Readable.toWeb(incoming) as ReadableStream<Uint8Array>;
        if (hasNoBody) incoming.resume();
        resolve(new Response(body, { status, headers }));
      },
    );
    request.once("error", reject);
    request.end();
  });
}

const defaultDependencies: RemoteFetchDependencies = {
  resolve: resolvePublicAddresses,
  request: requestPinnedRemoteImage,
};

/** Fetches a remote image, pinning each request to the exact public DNS answers that were validated. */
export async function fetchRemoteImage(
  start: URL,
  dependencies: RemoteFetchDependencies = defaultDependencies,
): Promise<Response | null> {
  let current = start;
  for (let hop = 0; hop <= MAX_REMOTE_REDIRECTS; hop += 1) {
    if (
      !(current.protocol === "http:" || current.protocol === "https:") ||
      current.username ||
      current.password ||
      isDisallowedRemoteHost(current.hostname)
    ) {
      return null;
    }

    const addresses = await dependencies.resolve(current.hostname);
    if (!addresses?.length || addresses.some(({ address }) => isPrivateAddress(address))) return null;
    const response = await dependencies.request(current, addresses);
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel().catch(() => undefined);
      try {
        current = new URL(location, current);
      } catch {
        return null;
      }
      continue;
    }
    return response;
  }
  return null;
}
