import Parsimmon from 'parsimmon';
import { createDynamicParsers, createTextParser, DirectionParser, mergeTextNodes } from './parserGenerators.js';

const P = Parsimmon;

export const parseInline = (text, configs = []) => {
    if (!text) return [];

    // 1. Build Dynamic Parsers
    // Prioritize by explicit 'priority' field (descending), then by functionality (Regex > others)
    const sortedConfigs = [...configs].sort((a, b) => {
        // Priority check: Higher number = higher priority
        const pA = a.priority || 0;
        const pB = b.priority || 0;
        if (pA !== pB) return pB - pA; // Descending

        // Tie-breaker: Regex is usually more specific than Enclosure
        if (a.matchMode === 'regex' && b.matchMode !== 'regex') return -1;
        if (a.matchMode !== 'regex' && b.matchMode === 'regex') return 1;
        
        return 0;
    });

    const dynamicParsers = [];
    const customParsers = createDynamicParsers(sortedConfigs);
    Object.values(customParsers).forEach(p => dynamicParsers.push(p));
    
    // 2. Build Dynamic Text Parser
    // It must exclude start chars of all markers to give them a chance to parse
    const DynamicText = createTextParser(configs);

    // 3. Assemble All Parsers
    const AllParsers = [
        ...dynamicParsers, // Custom configs should take precedence over standard DirectionParser
        DirectionParser, // Keep Direction as fallback if no custom rule matches
        DynamicText,
        // Fallback: If a char is excluded from Text (e.g. '[') but fails to match its specific parser 
        // (e.g. malformed direction), we must consume it as plain text to avoid infinite loops or empty results.
        P.any.map(c => ({ type: 'text', content: c }))
    ];

    const Parser = P.alt(...AllParsers).many();

    try {
        const result = Parser.parse(text).value;
        return mergeTextNodes(result);
    } catch (e) {
        console.error("Parse Error", e);
        return [{ type: 'text', content: text }];
    }
};
