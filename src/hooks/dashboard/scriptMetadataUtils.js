export const normalizeOrgIds = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const resolveProfileOrgIds = (profile) => {
  const fromIds = normalizeOrgIds(profile?.organizationIds);
  const fromSingle = profile?.organizationId ? [profile.organizationId] : [];
  return Array.from(new Set([...fromIds, ...fromSingle].filter(Boolean)));
};

export const ensureList = (val) => {
  if (!val) return [];
  let parsed = val;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [parsed];
    }
  }

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [parsed];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => {
      if (typeof item === "string" && item.trim().startsWith("[") && item.trim().endsWith("]")) {
        try {
          const inner = JSON.parse(item);
          if (Array.isArray(inner)) return inner;
        } catch {
          return item;
        }
      }
      return item;
    });
  }

  return [];
};

export const RESERVED_METADATA_KEYS = new Set([
  "title",
  "credit",
  "author",
  "authors",
  "source",
  "draftdate",
  "date",
  "contact",
  "copyright",
  "notes",
  "description",
  "synopsis",
  "summary",
  "outline",
  "rolesetting",
  "backgroundinfo",
  "performanceinstruction",
  "openingintro",
  "chaptersettings",
  "chapterinfo",
  "environmentinfo",
  "situationinfo",
  "activityname",
  "activitybanner",
  "activitycontent",
  "activitydemourl",
  "activityworkurl",
  "eventname",
  "eventbanner",
  "eventcontent",
  "eventdemolink",
  "eventworklink",
  "setting",
  "settingintro",
  "background",
  "backgroundintro",
  "authordisplaymode",
  "cover",
  "coverurl",
  "audience",
  "contentrating",
  "rating",
  "disablecopy",
  "marker_legend",
  "show_legend",
  "license",
  "licenseurl",
  "licenseterms",
  "licensespecialterms",
  "licensecommercial",
  "licensederivative",
  "licensenotify",
  "licensetags",
  "series",
  "seriesname",
  "seriesorder",
]);

export const buildCustomFieldsFromRawEntries = (rawEntries = []) => {
  return (rawEntries || [])
    .map(({ key, value }, idx) => {
      const type = key.startsWith("_sep_") ? "divider" : "text";
      return { id: `${Date.now()}-${idx}`, key, value, type };
    })
    .filter((entry) => {
      if (entry.type === "divider") return true;
      const norm = String(entry.key || "").toLowerCase().replace(/\s/g, "");
      return !RESERVED_METADATA_KEYS.has(norm);
    });
};
