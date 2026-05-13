/** 核心 domain types — lib 層和 hooks 層共用 */

export interface MarkerConfig {
  id: string;
  type?: string;
  matchMode?: "prefix" | "range" | "block" | "inline" | "virtual" | string;
  isBlock?: boolean;
  start?: string;
  end?: string;
  style?: Record<string, string>;
  priority?: number;
  caseInsensitive?: boolean;
  regex?: string;
  label?: string;
  [key: string]: unknown;
}

export interface CustomMetadataEntry {
  key: string;
  value: string;
  type?: "text" | "divider";
}

/** screenplayAST 解析後的場景 */
export interface ParsedScene {
  id: string;
  label?: string;
  index?: number;
  header?: string;
  lineNumber?: number;
  [key: string]: unknown;
}

export interface ParsedTitleEntry {
  key: string;
  value?: string;
  indent?: number;
  values?: string[];
}

/** screenplayAST 回傳的完整 AST */
export interface ScriptAst {
  children?: AstNode[];
  [key: string]: unknown;
}

/** AST 節點 */
export interface AstNode {
  type: string;
  text?: string;
  raw?: string;
  lineStart?: number;
  lineEnd?: number;
  children?: AstNode[];
  inline?: unknown[];
  [key: string]: unknown;
}
