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

export const createDynamicParsers = (configs = []) => {
    const parsers = {};
    const safeConfigs = Array.isArray(configs) ? configs : [];
    const prefixStarts = safeConfigs
        .filter((c) => isInlineLike(c) && (c.matchMode === 'prefix' || (!c.end && c.start)) && c.start)
        .flatMap((c) => {
            const full = toFullWidth(c.start);
            return c.start === full ? [c.start] : [c.start, full];
        })
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .map((s) => escapeRegExp(s));
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
             const fullStartStr = toFullWidth(startStr);
             
             // Support both Halfwidth and Fullwidth
             const startParser = startStr === fullStartStr 
                ? P.string(startStr)
                : P.alt(P.string(startStr), P.string(fullStartStr));
             
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

             const fullStartStr = toFullWidth(startStr);
             const fullEndStr = toFullWidth(endStr);
             
             const startParser = startStr === fullStartStr
                ? P.string(startStr)
                : P.alt(P.string(startStr), P.string(fullStartStr));
                
             const endParser = endStr === fullEndStr
                ? P.string(endStr)
                : P.alt(P.string(endStr), P.string(fullEndStr));
             
             const escapedEnd = escapeRegExp(endStr);
             const escapedFullEnd = escapeRegExp(fullEndStr);
             
             // We need to stop at either end string
             const pattern = endStr === fullEndStr 
                ? escapedEnd 
                : `${escapedEnd}|${escapedFullEnd}`;
                
             const contentRegex = new RegExp(`^(?:(?!${pattern}).)*`);
             
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
