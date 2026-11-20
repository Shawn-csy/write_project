/** The parts of a marker rule that decide which lines it touches. */
export interface MarkerMatchShape {
  id?: string;
  isBlock?: boolean;
  type?: string;
  pause?: string;
  matchMode?: string;
  start?: string;
  end?: string;
  regex?: string;
  label?: string;
}

/**
 * Lightweight line matcher for the marker test panel. It only answers
 * "which lines would this rule touch" so the editor can point at them; the
 * rendered preview itself always goes through the real parser.
 */
export function findMarkerMatchLines(text: string, config: MarkerMatchShape | null | undefined): number[] {
  if (!config) return [];
  const lines = String(text || "").split(/\r?\n/);
  const mode = config.matchMode || "enclosure";
  const start = String(config.start || "");
  const end = String(config.end || "");
  const matched: number[] = [];

  if (mode === "regex") {
    const source = String(config.regex || "");
    if (!source) return [];
    let pattern: RegExp;
    try {
      pattern = new RegExp(source);
    } catch {
      return [];
    }
    lines.forEach((line, index) => {
      if (pattern.test(line)) matched.push(index + 1);
    });
    return matched;
  }

  if (!start) return [];

  if (mode === "prefix") {
    lines.forEach((line, index) => {
      if (line.trimStart().startsWith(start)) matched.push(index + 1);
    });
    return matched;
  }

  if (mode === "range") {
    if (!end) return [];
    let depth = 0;
    lines.forEach((line, index) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith(end) && depth > 0) {
        matched.push(index + 1);
        depth -= 1;
        return;
      }
      if (trimmed.startsWith(start)) {
        depth += 1;
        matched.push(index + 1);
        return;
      }
      if (depth > 0) matched.push(index + 1);
    });
    return matched;
  }

  // enclosure
  if (!end) return [];
  lines.forEach((line, index) => {
    const open = line.indexOf(start);
    if (open >= 0 && line.indexOf(end, open + start.length) >= 0) matched.push(index + 1);
  });
  return matched;
}

/** A one-off sample snippet that exercises the given rule, for "insert example". */
export function buildMarkerSample(config: MarkerMatchShape | null | undefined, example?: {
  content: string;
  before: string;
  after: string;
  rangeBody: string;
  rangePause: string;
}): string {
  if (!config) return "";
  const mode = config.matchMode || "enclosure";
  const start = String(config.start || "");
  const end = String(config.end || "");
  const label = example?.content ?? String(config.label || "範例");
  if (mode === "prefix" && start) return `${start} ${label}`;
  if (mode === "range" && start && end) return [`${start} ${label}`, example?.rangeBody ?? "範圍內的台詞。", config.pause && `${config.pause} ${example?.rangePause ?? "淡出"}`, end].filter(Boolean).join("\n");
  if (mode === "enclosure" && start && end) return config.isBlock || config.type === "block"
    ? `${start}${label}${end}`
    : `${example?.before ?? "台詞"}${start}${label}${end}${example?.after ?? "繼續說。"}`;
  if (mode === "regex" && config.id === "rule-numbered-chapter-title") return "1. 開場";
  if (mode === "regex" && config.id === "rule-se-performer") return "我回來了。(*敲門聲)";
  return "";
}
