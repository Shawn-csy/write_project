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

export function deriveUsageRights(licenseRaw, termsRaw) {
  const { isCc, cc0, hasNc, normalized: license } = parseCcFlags(licenseRaw);
  const terms = String(termsRaw || "").toLowerCase();

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
