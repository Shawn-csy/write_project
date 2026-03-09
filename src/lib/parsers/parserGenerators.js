import Parsimmon from 'parsimmon';
import { isInlineLike } from '../markerRules.js';

const P = Parsimmon;

// Helper: Escape Regex special characters
export const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Helper: Convert ASCII Punctuation to Fullwidth (Keep alphanumeric as is)
export const toFullWidth = (str) => {
    return str.replace(/[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0xfee0))
              .replace(/ /g, '\u3000');
};

const toFullWidthAlphaNum = (char) => {
  const code = char.charCodeAt(0);
  if ((code >= 0x30 && code <= 0x39) || (code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) {
    return String.fromCharCode(code + 0xFEE0);
  }
  return char;
};

const buildFlexibleTokenPattern = (token = "") => {
  return Array.from(String(token)).map((ch) => {
    const code = ch.charCodeAt(0);
    // ASCII letters: support half/full width + upper/lower
    if ((code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) {
      const lower = ch.toLowerCase();
      const upper = ch.toUpperCase();
      const fullLower = toFullWidthAlphaNum(lower);
      const fullUpper = toFullWidthAlphaNum(upper);
      return `[${escapeRegExp(lower)}${escapeRegExp(upper)}${escapeRegExp(fullLower)}${escapeRegExp(fullUpper)}]`;
    }
    // ASCII digits: support half/full width
    if (code >= 0x30 && code <= 0x39) {
      const fullDigit = toFullWidthAlphaNum(ch);
      return `[${escapeRegExp(ch)}${escapeRegExp(fullDigit)}]`;
    }
    // ASCII punctuation/symbols that have fullwidth forms
    if (code >= 0x21 && code <= 0x7E) {
      const full = toFullWidth(ch);
      if (full !== ch) {
        return `[${escapeRegExp(ch)}${escapeRegExp(full)}]`;
      }
    }
    return escapeRegExp(ch);
  }).join("");
};

export const createDynamicParsers = (configs = []) => {
    const parsers = {};
    const safeConfigs = Array.isArray(configs) ? configs : [];
    const prefixStarts = safeConfigs
        .filter((c) => isInlineLike(c) && (c.matchMode === 'prefix' || (!c.end && c.start)) && c.start)
        .map((c) => buildFlexibleTokenPattern(c.start))
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
    const nextPrefixPattern = prefixStarts.length ? `(?:${prefixStarts.join('|')})` : null;

    safeConfigs.forEach(config => {
        if (!isInlineLike(config)) return;

        const type = config.type || 'inline';
        const id = config.id || `custom-${Math.random().toString(36).substr(2, 9)}`;
        
        let parser;

        if (config.matchMode === 'regex' && config.regex) {
             try {
                 const re = new RegExp(config.regex);
                 const hasGroup = /\([^?]/.test(config.regex);
                 parser = (hasGroup ? P.regex(re, 1) : P.regex(re)).map(content => ({ 
                     type: 'highlight', 
                     id, 
                     content: content || "" 
                 }));
             } catch (e) {
                 console.warn(`Invalid regex for marker ${config.label}:`, e);
             }
        } else if (config.matchMode === 'prefix' || (!config.end && config.start)) {
             // Prefix Mode
             if (!config.start || typeof config.start !== 'string' || config.start.length === 0) return;
             
             const startStr = config.start;
             const startPattern = buildFlexibleTokenPattern(startStr);
             const startParser = P.regex(new RegExp(startPattern, "i"));
             
             const contentRegex = nextPrefixPattern
                ? new RegExp(`^[\\s\\S]*?(?=${nextPrefixPattern}|$)`)
                : /^[\s\S]*/;

             parser = startParser.then(P.regex(contentRegex)).map(content => ({ 
                 type: 'highlight', 
                 id, 
                 content: content.trim() 
                 // Note: We don't distinguish which variance was matched, usually fine.
             }));
        } else {
             // Enclosure Mode
             const startStr = config.start || '{';
             const endStr = config.end || '}';
             
             if (!startStr || startStr.length === 0) return;

             const startPattern = buildFlexibleTokenPattern(startStr);
             const endPattern = buildFlexibleTokenPattern(endStr);
             const startParser = P.regex(new RegExp(startPattern, "i"));
             const endParser = P.regex(new RegExp(endPattern, "i"));
             
             const pattern = endPattern;
             const contentRegex = new RegExp(`^(?:(?!${pattern}).)*`, "i");
             
             const safeContent = P.regex(contentRegex);

             parser = startParser.then(safeContent).skip(endParser).map(content => ({
                 type: 'highlight',
                 id,
                 content: content.trim()
             }));
        }

        if (parser) {
            parsers[id] = parser;
        }
    });
    
    return parsers;
};

// [已移除] DirectionParser

export const createTextParser = (configs = []) => {
    // 純 Marker 模式：排除 configs 中定義的 start 字元 (含全形)
    const startChars = new Set(); 
    const safeConfigs = Array.isArray(configs) ? configs : [];

    safeConfigs.forEach(c => {
        if (isInlineLike(c) && c.start && c.start.length > 0) {
            startChars.add(c.start.charAt(0));
            // Also exclude fullwidth char
            const fullStart = toFullWidth(c.start);
            startChars.add(fullStart.charAt(0));
        }
    });
    
    const excluded = Array.from(startChars).join('');
    // Use noneOf to efficiently consume chunks of text that definitely aren't markers
    return P.noneOf(excluded).atLeast(1).map(x => ({ type: 'text', content: x.join('') }));
};

export const mergeTextNodes = (nodes) => {
    if (!nodes || nodes.length === 0) return [];
    
    const merged = [];
    let currentText = null;

    nodes.forEach(node => {
        if (node.type === 'text') {
            if (currentText) {
                currentText.content += node.content;
            } else {
                currentText = { ...node }; // Clone
            }
        } else {
            if (currentText) {
                merged.push(currentText);
                currentText = null;
            }
            merged.push(node);
        }
    });

    if (currentText) {
        merged.push(currentText);
    }

    return merged;
};
