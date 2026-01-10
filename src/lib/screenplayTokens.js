export const BLANK_LONG = "SCREENPLAY-PLACEHOLDER-BLANK-LONG";
export const BLANK_MID = "SCREENPLAY-PLACEHOLDER-BLANK-MID";
export const BLANK_SHORT = "SCREENPLAY-PLACEHOLDER-BLANK-SHORT";
export const BLANK_PURE = "SCREENPLAY-PLACEHOLDER-BLANK-PURE";

export const DIR_TOKEN = "SCREENPLAY-DIR-TOKEN::";
export const SFX_TOKEN = "SCREENPLAY-SFX-TOKEN::";
export const MARKER_TOKEN = "SCREENPLAY-MARKER-TOKEN::";
export const SECTION_TOKEN = "SCREENPLAY-SECTION-TOKEN::";
export const POST_TOKEN = "SCREENPLAY-POST-TOKEN::";

export const whitespaceLabels = {
  short: "停頓一秒",
  mid: "停頓三秒",
  long: "停頓五秒",
  pure: "",
};

export const matchWhitespaceCommand = (line = "") => {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const stripped = trimmed.replace(/^[(（]\s*/, "").replace(/\s*[)）]$/, "");
  if (stripped === "長留白") return "long";
  if (stripped === "中留白") return "mid";
  if (stripped === "短留白") return "short";
  if (stripped === "留白") return "pure";
  return null;
};

export const renderWhitespaceBlock = (kind) => {
  const label = whitespaceLabels[kind] || "";
  return `
      <div class="whitespace-block whitespace-${kind}">
        <div class="whitespace-line"></div>
        <div class="whitespace-line whitespace-label${label ? "" : " whitespace-label-empty"}">${label}</div>
        <div class="whitespace-line"></div>
      </div>
    `;
};
