import { describe, it, expect } from "vitest";
import { ADMIN_GROUPS, ADMIN_TABS, adminTabSearch, groupOfTab, resolveAdminTab, tabsForGroup } from "./superAdminNav";
import zhTW from "../i18n/locales/zh-TW";
import en from "../i18n/locales/en";
import ja from "../i18n/locales/ja";

const get = (obj: any, path: string) => path.split(".").reduce((o, k) => o?.[k], obj);

describe("superAdminNav", () => {
  it("has 6 groups and every tab belongs to one", () => {
    expect(ADMIN_GROUPS).toHaveLength(6);
    for (const tab of ADMIN_TABS) expect(ADMIN_GROUPS.some((g) => g.key === tab.group)).toBe(true);
    for (const g of ADMIN_GROUPS) expect(tabsForGroup(g.key).length).toBeGreaterThan(0);
  });

  it.each([
    ["", "applications"],
    ["?section=applications", "applications"],
    ["?section=claims", "applications"],
    ["?section=review", "applications"],
    ["?section=activity-submissions", "campaigns"],
    ["?section=activity-review", "campaigns"],
    ["?section=marketing", "homepage"],
    ["?section=homepage", "homepage"],
    ["?section=activities", "activities"],
    ["?section=external&resource=studios", "external-scripts"],
    ["?section=external&resource=author-pages", "external-author-pages"],
    ["?section=directory", "personas"],
    ["?section=directory&catalog=users", "users"],
    ["?section=catalog", "scripts"],
    ["?section=settings", "settings"],
    ["?section=signatures", "signatures"],
    ["?section=voice-actors", "voice-actors"],
    ["?section=bogus", "applications"],
  ])("resolves %s -> %s", (search, tab) => {
    expect(resolveAdminTab(search)).toBe(tab);
  });

  it("canonical URLs round-trip for every tab", () => {
    for (const tab of ADMIN_TABS) expect(resolveAdminTab(adminTabSearch(tab.key))).toBe(tab.key);
    expect(groupOfTab("orgs")).toBe("directory");
  });

  it("i18n keys exist in all locales", () => {
    const keys = [...ADMIN_GROUPS.map((g) => g.labelKey), ...ADMIN_TABS.map((t) => t.labelKey), "adminConsole.title", "adminConsole.empty", "adminConsole.showing", "adminConsole.pendingCount"];
    for (const locale of [zhTW, en, ja]) for (const k of keys) expect(typeof get(locale, k), k).toBe("string");
  });
});
