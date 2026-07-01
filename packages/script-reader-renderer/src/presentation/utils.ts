export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const FONT_STACKS: Record<string, string> = {
  "source-han-serif": '"Source Han Serif TC", "Noto Serif TC", "Songti TC", "PMingLiU", serif',
  "taipei-sans": '"Taipei Sans TC Beta", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
  "courier-new": '"Courier New", "Noto Sans Mono CJK TC", "JetBrains Mono", Consolas, monospace',
  serif: '"Noto Serif TC", "Source Han Serif TC", "Songti TC", "PMingLiU", serif',
  sans: '"Noto Sans TC", "Taipei Sans TC Beta", "PingFang TC", "Microsoft JhengHei", Arial, sans-serif',
  mono: '"JetBrains Mono", "Noto Sans Mono CJK TC", "SFMono-Regular", Menlo, Consolas, monospace',
};

export function resolveReadingFontStack(value: unknown): string {
  const key = String(value || "").trim();
  return FONT_STACKS[key] || FONT_STACKS["source-han-serif"];
}
