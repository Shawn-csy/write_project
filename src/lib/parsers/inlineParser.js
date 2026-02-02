import Parsimmon from 'parsimmon';
import { createDynamicParsers, createTextParser, mergeTextNodes } from './parserGenerators.js';

const P = Parsimmon;

/**
 * 純 Marker 模式的 Inline 解析器
 * 所有解析規則都來自 markerConfigs（雲端設定）
 */
export const parseInline = (text, configs = []) => {
    if (!text) return [];

    // 1. Build Dynamic Parsers from configs
    const safeConfigs = Array.isArray(configs) ? configs : [];
    const sortedConfigs = [...safeConfigs].sort((a, b) => {
        // Priority check: Higher number = higher priority
        const pA = a.priority || 0;
        const pB = b.priority || 0;
        if (pA !== pB) return pB - pA;

        // Tie-breaker: Regex is usually more specific than Enclosure
        if (a.matchMode === 'regex' && b.matchMode !== 'regex') return -1;
        if (a.matchMode !== 'regex' && b.matchMode === 'regex') return 1;
        
        return 0;
    });

    const dynamicParsers = [];
    const customParsers = createDynamicParsers(sortedConfigs);
    Object.values(customParsers).forEach(p => dynamicParsers.push(p));
    
    // 2. Build Dynamic Text Parser
    const DynamicText = createTextParser(safeConfigs);

    // 3. Assemble All Parsers (純 Marker 模式：無硬編碼 fallback)
    const AllParsers = [
        ...dynamicParsers,
        DynamicText,
        // Fallback: consume any unmatched char as plain text
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
