export const READING_FONT_OPTIONS = [
  {
    value: "source-han-serif",
    label: "思源宋體",
    stack: '"Source Han Serif TC", "Noto Serif TC", "Songti TC", "PMingLiU", serif',
  },
  {
    value: "taipei-sans",
    label: "台北黑體",
    stack: '"Taipei Sans TC Beta", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
  },
  {
    value: "courier-new",
    label: "Courier New",
    stack: '"Courier New", "Noto Sans Mono CJK TC", "JetBrains Mono", Consolas, monospace',
  },
  {
    value: "serif",
    label: "Noto Serif",
    stack: '"Noto Serif TC", "Source Han Serif TC", "Songti TC", "PMingLiU", serif',
  },
  {
    value: "sans",
    label: "Noto Sans",
    stack: '"Noto Sans TC", "Taipei Sans TC Beta", "PingFang TC", "Microsoft JhengHei", Arial, sans-serif',
  },
  {
    value: "mono",
    label: "JetBrains Mono",
    stack: '"JetBrains Mono", "Noto Sans Mono CJK TC", "SFMono-Regular", Menlo, Consolas, monospace',
  },
];

export const DEFAULT_READING_FONT = READING_FONT_OPTIONS[0].value;

export const normalizeReadingFont = (value) => {
  const key = String(value || "").trim();
  if (READING_FONT_OPTIONS.some((item) => item.value === key)) return key;
  return DEFAULT_READING_FONT;
};

export const resolveReadingFontStack = (value) => {
  const normalized = normalizeReadingFont(value);
  const matched = READING_FONT_OPTIONS.find((item) => item.value === normalized);
  return matched?.stack || READING_FONT_OPTIONS[0].stack;
};

export const UI_FONT_OPTIONS = [
  {
    value: "system-sans",
    label: "System Sans",
    stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
  },
  {
    value: "taipei-sans",
    label: "台北黑體",
    stack: '"Taipei Sans TC Beta", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
  },
  {
    value: "source-han-serif",
    label: "思源宋體",
    stack: '"Source Han Serif TC", "Noto Serif TC", "Songti TC", "PMingLiU", serif',
  },
  {
    value: "courier-new",
    label: "Courier New",
    stack: '"Courier New", "Noto Sans Mono CJK TC", "JetBrains Mono", Consolas, monospace',
  },
];

export const DEFAULT_UI_FONT = UI_FONT_OPTIONS[0].value;

export const normalizeUiFont = (value) => {
  const key = String(value || "").trim();
  if (UI_FONT_OPTIONS.some((item) => item.value === key)) return key;
  return DEFAULT_UI_FONT;
};

export const resolveUiFontStack = (value) => {
  const normalized = normalizeUiFont(value);
  const matched = UI_FONT_OPTIONS.find((item) => item.value === normalized);
  return matched?.stack || UI_FONT_OPTIONS[0].stack;
};
