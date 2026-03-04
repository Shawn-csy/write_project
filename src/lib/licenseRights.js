function hasAny(text, patterns) {
  return patterns.some((p) => text.includes(p));
}

function normalizeLicense(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isCcLicense(license) {
  return /\bcc\b/.test(license) || license.includes("creative commons");
}

function isCcNonCommercial(license) {
  return (
    /\bnc\b/.test(license) ||
    license.includes("non commercial") ||
    license.includes("noncommercial")
  );
}

function parseCcFlags(licenseRaw) {
  const license = normalizeLicense(licenseRaw);
  const cc0 = license.includes("cc0");
  const isCc = isCcLicense(license) || cc0;
  const hasBy = /\bby\b/.test(license);
  const hasNc = isCcNonCommercial(license);
  const hasNd = /\bnd\b/.test(license) || license.includes("no derivatives");
  const hasSa = /\bsa\b/.test(license) || license.includes("share alike") || license.includes("sharealike");
  return { isCc, cc0, hasBy, hasNc, hasNd, hasSa, normalized: license };
}

function hasAffirmativeCommercial(text) {
  if (/(?<!不)可商用/.test(text)) return true;
  return hasAny(text, [
    "可用於商業",
    "允許商用",
    "商業使用可",
    "commercial use allowed",
    "allow commercial",
    "commercial allowed",
  ]);
}

function hasAffirmativeFree(text) {
  if (/(?<!不)可免費使用/.test(text)) return true;
  if (/(?<!不)免費使用/.test(text)) return true;
  return hasAny(text, [
    "免授權費",
    "free to use",
    "royalty free",
    "no fee",
  ]);
}

function normalizeCommercialChoice(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw) return "";
  if (["allow", "yes", "true", "可商用", "允許", "commercial"].includes(raw)) return "allow";
  if (["disallow", "no", "false", "不可商用", "禁止", "non-commercial", "noncommercial"].includes(raw)) return "disallow";
  return "";
}

function normalizeDerivativeChoice(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw) return "";
  if (["allow", "yes", "true", "可改作", "允許", "derivative"].includes(raw)) return "allow";
  if (["disallow", "no", "false", "不可改作", "禁止", "nd", "no-derivatives"].includes(raw)) return "disallow";
  if (["limited", "limited-allow", "限定改作", "限縮改作", "有條件改作"].includes(raw)) return "limited";
  return "";
}

function normalizeNotifyChoice(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw) return "";
  if (["true", "yes", "required", "需要", "需告知", "must-notify"].includes(raw)) return "required";
  if (["false", "no", "optional", "不需要", "無需告知", "no-notify"].includes(raw)) return "not_required";
  return "";
}

export function deriveUsageRights(licenseRaw, termsRaw, commercialRaw = "") {
  const { isCc, cc0, hasNc, normalized: license } = parseCcFlags(licenseRaw);
  const terms = String(termsRaw || "").toLowerCase();
  const normalizedCommercial = normalizeCommercialChoice(commercialRaw);

  const termDenyCommercial = hasAny(terms, [
    "禁止商用",
    "不可商用",
    "不得商業",
    "非商業",
    "僅供非商業",
    "no commercial use",
    "non-commercial only",
    "non commercial only",
  ]);
  const termAllowCommercial = hasAffirmativeCommercial(terms);

  const termDenyFree = hasAny(terms, [
    "不可免費使用",
    "需付費",
    "付費授權",
    "商用另議",
    "需取得授權後付費",
    "paid license",
    "license fee required",
    "not free",
  ]);
  const termAllowFree = hasAffirmativeFree(terms);

  let allowCommercial = null;
  let isFreeToUse = null;

  if (normalizedCommercial === "allow") allowCommercial = true;
  else if (normalizedCommercial === "disallow") allowCommercial = false;

  // Custom terms override
  if (termAllowCommercial && !termDenyCommercial) allowCommercial = true;
  else if (termDenyCommercial && !termAllowCommercial) allowCommercial = false;

  if (termAllowFree && !termDenyFree) isFreeToUse = true;
  else if (termDenyFree && !termAllowFree) isFreeToUse = false;

  // Fallback to CC mapping when terms do not override
  if (allowCommercial === null) {
    if (isCc && hasNc) allowCommercial = false;
    else if (cc0) allowCommercial = true;
    else if (isCc) allowCommercial = true;
    else if (license.includes("all rights reserved")) allowCommercial = false;
  }

  if (isFreeToUse === null) {
    if (isCc || cc0) isFreeToUse = true;
    else if (license.includes("all rights reserved")) isFreeToUse = false;
  }

  return { allowCommercial, isFreeToUse };
}

export function deriveCcLicenseTags(licenseRaw) {
  const { isCc, cc0, hasBy, hasNc, hasNd, hasSa } = parseCcFlags(licenseRaw);
  if (!isCc) return [];

  const attributionTag = cc0 || !hasBy ? "授權:免署名" : "授權:需署名";
  const commercialTag = hasNc ? "授權:非商用" : "授權:可商用";
  const derivativeTag = hasNd
    ? "授權:禁止改作"
    : hasSa
      ? "授權:改作需同授權"
      : "授權:可改作";

  return [attributionTag, commercialTag, derivativeTag];
}

export function deriveSimpleLicenseTags({
  commercialUse = "",
  derivativeUse = "",
  notifyOnModify = "",
} = {}) {
  const commercial = normalizeCommercialChoice(commercialUse);
  const derivative = normalizeDerivativeChoice(derivativeUse);
  const notify = normalizeNotifyChoice(notifyOnModify);
  const tags = [];
  if (commercial === "allow") tags.push("授權:可商用");
  if (commercial === "disallow") tags.push("授權:不可商用");
  if (derivative === "allow") tags.push("授權:可改作");
  if (derivative === "disallow") tags.push("授權:不可改作");
  if (derivative === "limited") tags.push("授權:限定改作");
  if (notify === "required") tags.push("授權:修改需告知");
  if (notify === "not_required") tags.push("授權:修改免告知");
  return tags;
}

export function parseBasicLicenseFromMeta(meta = {}) {
  const commercialUse = normalizeCommercialChoice(meta.licensecommercial || meta.licenseCommercial);
  const derivativeUse = normalizeDerivativeChoice(meta.licensederivative || meta.licenseDerivative);
  const notifyOnModify = normalizeNotifyChoice(meta.licensenotify || meta.licenseNotify);
  return { commercialUse, derivativeUse, notifyOnModify };
}
