export const DEFAULT_MARKER_RULES_NAME = "談聲聆格式";

export const DEFAULT_MARKER_RULES = [
  {
    id: "rule-numbered-chapter-title",
    label: "章節標題 (01. ...)",
    type: "block",
    isBlock: true,
    parseAs: "scene_heading",
    matchMode: "regex",
    regex: "^\\s*(\\d{1,3})[\\.．、]\\s*(.+)$",
    mapFields: {
      text: "$0",
      number: "$1",
      title: "$2",
    },
    mapCasts: {
      number: "int",
    },
    priority: 995,
    style: {
      color: "#1E3A8A",
      backgroundColor: "#DBEAFE",
      fontWeight: "bold",
      letterSpacing: "0.02em",
    },
  },
  {
    id: "rule-se-performer",
    label: "聲優效果音 (*...)",
    type: "inline",
    matchMode: "enclosure",
    start: "(*",
    end: ")",
    priority: 990,
    style: {
      color: "#E91E63",
      backgroundColor: "#FCE4EC",
      fontWeight: "bold",
    },
  },
  {
    id: "rule-tone-general",
    label: "一般語氣/動作指示",
    type: "inline",
    matchMode: "enclosure",
    start: "(",
    end: ")",
    priority: 980,
    style: { color: "#666666", fontStyle: "italic" },
    renderer: { template: "({{content}})" },
  },
  {
    id: "rule-post-effect",
    label: "後製效果 【...】",
    type: "inline",
    matchMode: "enclosure",
    start: "【",
    end: "】",
    priority: 970,
    style: {
      color: "#D32F2F",
      textDecoration: "underline",
      fontWeight: "bold",
    },
  },
  {
    id: "rule-se-single",
    label: "單獨效果音",
    type: "inline",
    matchMode: "prefix",
    start: "#SE",
    isBlock: false,
    priority: 960,
    style: {
      color: "var(--marker-color-pastel-rose)",
      backgroundColor: "transparent",
      fontWeight: "normal",
    },
    showEndLabel: false,
    renderer: { template: "({{content}})" },
  },
  {
    id: "rule-position",
    label: "位置指示",
    start: "@",
    matchMode: "prefix",
    priority: 950,
    style: {
      color: "#000000",
      backgroundColor: "#999999",
      fontWeight: "bold",
    },
    renderer: { template: "@{{content}}" },
  },
  {
    id: "se-continuous",
    label: "持續音效 (SE)",
    type: "block",
    matchMode: "range",
    start: ">>SE",
    end: "<<SE",
    isBlock: true,
    priority: 940,
    style: {
      color: "var(--marker-color-emerald)",
      fontWeight: "bold",
      borderLeft: "2px solid currentColor",
      paddingLeft: "8px",
    },
    pause: "><SE",
    showDelimiters: false,
    renderer: { template: "" },
    pauseLabel: "中途指示",
  },
  {
    id: "rule-bg-start",
    label: "背景音 //BG",
    type: "block",
    matchMode: "prefix",
    start: "//BG",
    isBlock: true,
    priority: 930,
    style: {
      color: "#333333",
      backgroundColor: "#e1efd9",
      fontStyle: "italic",
    },
    renderer: { template: "({{content}})" },
  },
  {
    id: "character",
    label: "角色",
    start: "#C",
    isBlock: true,
    matchMode: "prefix",
    type: "block",
    parseAs: "character",
    mapFields: {
      text: "$text",
    },
    mapCasts: {
      text: "trim_colon_suffix",
    },
    style: {
      color: "#D32F2F",
      fontWeight: "bold",
    },
  },
  {
    id: "action",
    label: "內文 (Action)",
    start: "",
    end: "",
    isBlock: true,
    matchMode: "none",
    type: "block",
    priority: 100,
    style: {
      textAlign: "left",
      color: "#000000",
      lineHeight: "1.85",
      letterSpacing: "0.01em",
      fontFamily: "'Noto Serif TC', 'PingFang TC', 'Microsoft JhengHei', serif",
    },
  },
];

export const getDefaultMarkerRules = () =>
  JSON.parse(JSON.stringify(DEFAULT_MARKER_RULES));

export const defaultMarkerConfigs = getDefaultMarkerRules();

// Backward compatibility aliases (can be removed after all call sites migrate)
export const LOCKED_IMPORT_FORMAT_NAME = DEFAULT_MARKER_RULES_NAME;
export const LOCKED_IMPORT_RULES = DEFAULT_MARKER_RULES;
export const getLockedImportRules = getDefaultMarkerRules;
