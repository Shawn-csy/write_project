/**
 * Navigation model for the super-admin console: 6 top-level groups, each with
 * 1+ tabs. URLs stay `?section=...` based so older links keep working;
 * `resolveAdminLocation` maps every legacy value onto the new structure.
 */
export type AdminGroupKey = "review" | "activities" | "content" | "external" | "directory" | "platform";

export type AdminTabKey =
  | "applications" | "submissions" | "voice-actor-profiles" | "external-author-profiles"
  | "campaigns" | "activities"
  | "homepage" | "demos"
  | "external-scripts" | "external-author-pages"
  | "voice-actors" | "scripts" | "orgs" | "personas" | "users"
  | "settings" | "signatures";

export interface AdminTabDef {
  key: AdminTabKey;
  group: AdminGroupKey;
  /** i18n key under adminConsole.tabs */
  labelKey: string;
}

export const ADMIN_GROUPS: ReadonlyArray<{ key: AdminGroupKey; labelKey: string }> = [
  { key: "review", labelKey: "adminConsole.groups.review" },
  { key: "activities", labelKey: "adminConsole.groups.activities" },
  { key: "content", labelKey: "adminConsole.groups.content" },
  { key: "external", labelKey: "adminConsole.groups.external" },
  { key: "directory", labelKey: "adminConsole.groups.directory" },
  { key: "platform", labelKey: "adminConsole.groups.platform" },
];

export const ADMIN_TABS: ReadonlyArray<AdminTabDef> = [
  { key: "applications", group: "review", labelKey: "adminConsole.tabs.applications" },
  { key: "submissions", group: "review", labelKey: "adminConsole.tabs.submissions" },
  { key: "voice-actor-profiles", group: "review", labelKey: "adminConsole.tabs.voiceActorProfiles" },
  { key: "external-author-profiles", group: "review", labelKey: "adminConsole.tabs.externalAuthorProfiles" },
  { key: "campaigns", group: "activities", labelKey: "adminConsole.tabs.campaigns" },
  { key: "activities", group: "activities", labelKey: "adminConsole.tabs.activityPages" },
  { key: "homepage", group: "content", labelKey: "adminConsole.tabs.homepage" },
  { key: "demos", group: "content", labelKey: "adminConsole.tabs.demos" },
  { key: "external-scripts", group: "external", labelKey: "adminConsole.tabs.externalScripts" },
  { key: "external-author-pages", group: "external", labelKey: "adminConsole.tabs.externalAuthorPages" },
  { key: "voice-actors", group: "directory", labelKey: "adminConsole.tabs.voiceActors" },
  { key: "scripts", group: "directory", labelKey: "adminConsole.tabs.scripts" },
  { key: "orgs", group: "directory", labelKey: "adminConsole.tabs.orgs" },
  { key: "personas", group: "directory", labelKey: "adminConsole.tabs.personas" },
  { key: "users", group: "directory", labelKey: "adminConsole.tabs.users" },
  { key: "settings", group: "platform", labelKey: "adminConsole.tabs.admins" },
  { key: "signatures", group: "platform", labelKey: "adminConsole.tabs.signatures" },
];

const DIRECTORY_TABS: AdminTabKey[] = ["scripts", "orgs", "personas", "users"];
const RESOURCE_TABS: Record<string, AdminTabKey> = {
  scripts: "external-scripts",
  "author-pages": "external-author-pages",
  // The "studios" source was never connected; old links land on scripts.
  studios: "external-scripts",
};

export function tabsForGroup(group: AdminGroupKey): AdminTabDef[] {
  return ADMIN_TABS.filter((tab) => tab.group === group);
}

export function groupOfTab(tab: AdminTabKey): AdminGroupKey {
  return ADMIN_TABS.find((def) => def.key === tab)?.group ?? "review";
}

/** Maps any (legacy or current) query string onto one tab. */
export function resolveAdminTab(search: string): AdminTabKey {
  const params = new URLSearchParams(search);
  const section = params.get("section") || "";
  switch (section) {
    case "directory":
    case "catalog": {
      const catalog = params.get("catalog") as AdminTabKey | null;
      if (catalog && DIRECTORY_TABS.includes(catalog)) return catalog;
      return section === "directory" ? "personas" : "scripts";
    }
    case "external":
      return RESOURCE_TABS[params.get("resource") || ""] ?? "external-scripts";
    case "marketing":
    case "homepage":
      return "homepage";
    case "activity-review":
    case "activity-submissions": // placeholder page was removed
      return "campaigns";
    case "claims": // placeholder page was removed
    case "review":
      return "applications";
    default:
      return ADMIN_TABS.some((tab) => tab.key === section) ? (section as AdminTabKey) : "applications";
  }
}

/** Canonical URL query for a tab. */
export function adminTabSearch(tab: AdminTabKey): string {
  const next = new URLSearchParams();
  if (DIRECTORY_TABS.includes(tab)) {
    next.set("section", "directory");
    next.set("catalog", tab);
  } else if (tab === "external-scripts" || tab === "external-author-pages") {
    next.set("section", "external");
    next.set("resource", tab === "external-scripts" ? "scripts" : "author-pages");
  } else {
    next.set("section", tab);
  }
  return `?${next.toString()}`;
}
