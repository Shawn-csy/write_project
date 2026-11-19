#!/usr/bin/env node
/** Read-only browser benchmark for the public site. Run both revisions with the same options. */
import { chromium } from "playwright";

const PROFILES = {
  local: null,
  "synthetic-slow": { latencyMs: 150, downloadBytesPerSecond: 200_000, uploadBytesPerSecond: 100_000, cpuRate: 4 },
};

function parseArgs(argv) {
  const options = { paths: [], runs: 5, settleMs: 1500, timeoutMs: 15000, profile: "local", viewport: { width: 1365, height: 900 } };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!value) throw new Error(`Missing value for ${key}`);
    if (key === "--base-url") options.baseUrl = value;
    else if (key === "--path") options.paths.push(value);
    else if (key === "--runs") options.runs = Number(value);
    else if (key === "--settle-ms") options.settleMs = Number(value);
    else if (key === "--timeout-ms") options.timeoutMs = Number(value);
    else if (key === "--profile") options.profile = value;
    else if (key === "--viewport") {
      const match = /^(\d+)x(\d+)$/.exec(value);
      if (!match) throw new Error("--viewport must be WIDTHxHEIGHT");
      options.viewport = { width: Number(match[1]), height: Number(match[2]) };
    }
    else throw new Error(`Unknown option: ${key}`);
  }
  if (!options.baseUrl || options.paths.length === 0) throw new Error("Use --base-url URL and at least one --path /path");
  const base = new URL(options.baseUrl);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.pathname !== "/" || base.search || base.hash) {
    throw new Error("--base-url must be an HTTP(S) origin without credentials or a path");
  }
  options.baseUrl = base.origin;
  for (const path of options.paths) {
    const resolved = new URL(path, base);
    if (!path.startsWith("/") || path.startsWith("//") || resolved.origin !== base.origin || resolved.hash) {
      throw new Error(`Invalid path: ${path}`);
    }
  }
  for (const [name, value] of [["runs", options.runs], ["settle-ms", options.settleMs], ["timeout-ms", options.timeoutMs]]) {
    if (!Number.isInteger(value) || value < (name === "settle-ms" ? 0 : 1)) throw new Error(`Invalid ${name}`);
  }
  if (options.runs > 30 || options.settleMs > 30000) throw new Error("Too many runs or too long a settle period");
  if (!Object.hasOwn(PROFILES, options.profile)) throw new Error("--profile must be local or synthetic-slow");
  if (options.viewport.width < 320 || options.viewport.width > 3840 || options.viewport.height < 480 || options.viewport.height > 2160) {
    throw new Error("Invalid viewport dimensions");
  }
  return options;
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

function resourcePath(url) {
  const parsed = new URL(url);
  if (parsed.pathname === "/_next/image") {
    const source = parsed.searchParams.get("url");
    if (source) {
      const nested = new URL(source, parsed);
      return `${parsed.pathname} → ${nested.origin}${nested.pathname}`;
    }
  }
  return `${parsed.origin}${parsed.pathname}`;
}

function resourceWidth(url) {
  const parsed = new URL(url);
  return parsed.pathname.startsWith("/api/public-media/") ? parsed.searchParams.get("w") : null;
}

async function measure(browser, url, options) {
  const context = await browser.newContext({ viewport: options.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const profile = PROFILES[options.profile];
  if (profile) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: profile.latencyMs,
      downloadThroughput: profile.downloadBytesPerSecond,
      uploadThroughput: profile.uploadBytesPerSecond,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpuRate });
  }
  const transferSizes = [];
  let failedRequests = 0;
  const failedResourcePaths = [];
  const badResourceStatuses = [];
  page.on("requestfinished", (request) => {
    transferSizes.push(request.sizes().then((sizes) => ({
      type: request.resourceType(),
      bytes: sizes.responseBodySize + sizes.responseHeadersSize,
      // Resource paths identify expensive requests without exposing query tokens.
      path: resourcePath(request.url()),
      width: resourceWidth(request.url()),
    })).catch(() => ({ type: request.resourceType(), bytes: 0, path: "", width: null })));
  });
  page.on("requestfailed", (request) => {
    failedRequests += 1;
    failedResourcePaths.push({ path: resourcePath(request.url()), error: request.failure()?.errorText ?? "unknown" });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) badResourceStatuses.push({
      path: resourcePath(response.url()), status: response.status(), width: resourceWidth(response.url()),
    });
  });
  await page.addInitScript(() => {
    window.__publicPerf = { lcp: 0, lcpUrl: "", lcpTag: "", cls: 0, longTasks: 0, longTaskMs: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.startTime < window.__publicPerf.lcp) continue;
          window.__publicPerf.lcp = entry.startTime;
          window.__publicPerf.lcpUrl = entry.url || "";
          window.__publicPerf.lcpTag = entry.element?.tagName || "";
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__publicPerf.cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__publicPerf.longTasks += 1;
          window.__publicPerf.longTaskMs += entry.duration;
        }
      }).observe({ type: "longtask", buffered: true });
    } catch { /* Missing browser metric support is reported as zero. */ }
  });
  try {
    const response = await page.goto(url, { waitUntil: "load", timeout: options.timeoutMs });
    await page.waitForTimeout(options.settleMs);
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const fcp = performance.getEntriesByType("paint").find((entry) => entry.name === "first-contentful-paint");
      return {
        ttfbMs: nav?.responseStart ?? 0,
        domContentLoadedMs: nav?.domContentLoadedEventEnd ?? 0,
        loadMs: nav?.loadEventEnd ?? 0,
        fcpMs: fcp?.startTime ?? 0,
        ...window.__publicPerf,
      };
    });
    const sizes = await Promise.all(transferSizes);
    const bytesByType = Object.fromEntries([...new Set(sizes.map((item) => item.type))].sort().map((type) => [
      type, sizes.filter((item) => item.type === type).reduce((sum, item) => sum + item.bytes, 0),
    ]));
    return {
      status: response?.status() ?? 0,
      ...Object.fromEntries(Object.entries(timing).filter(([key]) => key !== "lcpUrl").map(([key, value]) => [
        key,
        typeof value === "number" ? Math.round(value * 100) / 100 : value,
      ])),
      lcpResource: timing.lcpUrl ? resourcePath(timing.lcpUrl) : "",
      responseBytes: sizes.reduce((sum, item) => sum + item.bytes, 0),
      bytesByType,
      largestResources: [...sizes].sort((a, b) => b.bytes - a.bytes).slice(0, 10),
      requests: sizes.length,
      failedRequests,
      failedResourcePaths: failedResourcePaths.slice(0, 20),
      badResourceStatuses: badResourceStatuses.slice(0, 20),
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const browser = await chromium.launch({ headless: true });
  try {
    const results = [];
    for (const path of options.paths) {
      const url = options.baseUrl + path;
      const runs = [];
      for (let index = 0; index < options.runs; index += 1) runs.push(await measure(browser, url, options));
      results.push({
        path, runs,
        p50: Object.fromEntries(["ttfbMs", "fcpMs", "lcp", "loadMs", "longTaskMs", "responseBytes"].map((key) => [key, percentile(runs.map((run) => run[key]), 0.5)])),
        p95: Object.fromEntries(["ttfbMs", "fcpMs", "lcp", "loadMs", "longTaskMs", "responseBytes"].map((key) => [key, percentile(runs.map((run) => run[key]), 0.95)])),
      });
    }
    console.log(JSON.stringify({ baseUrl: options.baseUrl, viewport: `${options.viewport.width}x${options.viewport.height}`, profile: options.profile, throttle: PROFILES[options.profile], runsPerPath: options.runs, settleMs: options.settleMs, results }, null, 2));
    if (results.some((result) => result.runs.some((run) => run.status !== 200))) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
