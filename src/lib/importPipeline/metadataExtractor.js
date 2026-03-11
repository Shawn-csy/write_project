/**
 * Metadata Extractor
 * 負責從文本開頭自動識別 Metadata (Title, Author, Credit, etc.)
 */

export const KNOWN_KEYS = {
    // Standard Fountain
    'Title': 'Title',
    'Credit': 'Credit',
    'Author': 'Author',
    'Authors': 'Authors',
    'Source': 'Source',
    'Draft date': 'Draft date',
    'Contact': 'Contact',
    'Copyright': 'Copyright',
    
    // Chinese variations (Mapping)
    '標題': 'Title',
    '劇本': 'Title', // Could be Title or Script Content? Context matters.
    '作品資訊': '_IGNORE', // Header line
    '作者': 'Author',
    '台本師': 'Author',
    '寫手': 'Author',
    '來源': 'Source',
    '日期': 'Draft date',
    '聯絡': 'Contact',
    'CV': 'CV',
    '角色': '_IGNORE', // Usually starts character list
    '人物': '_IGNORE',
    '大綱': '_IGNORE',
    '簡介': 'Description',
    '作品描述': 'Description',
    '作品簡述': 'Description',
    '作品分級': 'Rating',
    '分級': 'Rating',
    '時長': 'Duration',
    '適合標籤': 'Tags',
    '標籤': 'Tags',
    'TAG': 'Tags',
    'Tag': 'Tags',
    '角色設定': 'RoleSetting',
    '人物設定': 'RoleSetting',
    '角色資料': 'RoleSetting',
    '角色名單': 'RoleSetting',
    '環境': 'EnvironmentInfo',
    '環境資訊': 'EnvironmentInfo',
    '背景資訊': 'EnvironmentInfo',
    '故事背景': 'EnvironmentInfo',
    '狀況': 'SituationInfo',
    '狀況資訊': 'SituationInfo',
    '情境': 'SituationInfo',
    '現況': 'SituationInfo',
    '章節': 'ChapterSettings',
    '章節資訊': 'ChapterSettings',
    '章節目錄': 'ChapterSettings',
    'Chapter': 'ChapterSettings',
    'Chapters': 'ChapterSettings',
    
    // Section-like keys
    '作品資訊': 'Info',
    '作品介紹': 'Info',
    '人物設定': 'RoleSetting',
    '角色設定': 'RoleSetting',
    '標記說明': 'Markers',
    '演繹指示': 'PerformanceInstruction',
    '使用規章': 'License',
};

const COMMON_KEYS = new Set([
    "Title",
    "Author",
    "Draft date",
    "Description",
    "Tags",
    "Rating",
    "Duration",
    "Source",
    "Contact",
    "Copyright",
    "RoleSetting",
    "PerformanceInstruction",
    "EnvironmentInfo",
    "SituationInfo",
    "ChapterSettings",
    "License",
    "CV",
]);

const STOP_HEADERS = new Set([
    '標記說明',
    '劇情開始'
]);

const SECTION_HEADERS = new Set([
    '作品資訊',
    '作品介紹',
    '人物設定',
    '角色設定',
    '角色資料',
    '角色名單',
    '章節',
    '章節資訊',
    '章節目錄',
    'Chapter',
    'Chapters',
    '標記說明',
    '演繹指示',
    '章節目錄',
    '故事背景'
]);
const SECTION_HEADER_RE = /^(作品資訊|作品介紹|人物設定\d*|角色設定\d*|角色資料\d*|角色名單\d*|章節目錄|章節資訊|章節|chapters?|標記說明|演繹指示|使用規章|故事背景|劇情開始)$/i;
const SUBSECTION_HEADER_RE = /^(基本資料|性格(?:、設定)?|外表|演繹指示|狀況|環境|台詞)$/i;

const isBlank = (line) => !line || line === '<blank>' || line.trim() === '';

const normalizeLine = (line) => line.trim();

const isStopHeader = (line) => STOP_HEADERS.has(line);

const isSectionHeader = (line) => SECTION_HEADERS.has(line) || SECTION_HEADER_RE.test(String(line || "").trim());

const isKnownKey = (line) => {
    const nKey = line.replace(/\s/g, '');
    return Object.prototype.hasOwnProperty.call(KNOWN_KEYS, line) ||
        Object.prototype.hasOwnProperty.call(KNOWN_KEYS, nKey);
};

const isKeyValueLine = (line) => {
    return /^([^:：]+?)[:：]\s*(.+)$/.test(line) ||
        /^【(.+?)】\s*(.*)$/.test(line) ||
        /^\[(.+?)\]\s*(.*)$/.test(line);
};
const isValueBoundaryLine = (line) => {
    const normalized = normalizeLine(line || "");
    if (!normalized) return false;
    return isStopHeader(normalized) ||
        isSectionHeader(normalized) ||
        SUBSECTION_HEADER_RE.test(normalized) ||
        isKnownKey(normalized);
};

const isSceneOrChapterLine = (line) => {
    const trimmed = String(line || "").trim();
    if (!trimmed) return false;
    return /^\d+\.\s+.+$/.test(trimmed) ||
        /^第[一二三四五六七八九十百千\d]+[章節幕場].*$/.test(trimmed) ||
        /^(INT|EXT)\./i.test(trimmed);
};

const isLikelyScriptContentLine = (line) => {
    const trimmed = String(line || "").trim();
    if (!trimmed) return false;
    if (/^(#|\/\/|@)/.test(trimmed)) return true;
    if (/^\(.+\)$/.test(trimmed)) return true;
    if (isSceneOrChapterLine(trimmed)) return true;
    if (/^(INT|EXT)\./i.test(trimmed)) return true;
    return false;
};

const isFallbackTitleCandidate = (line) => {
    const trimmed = String(line || "").trim();
    if (!trimmed) return false;
    if (trimmed.length > 60) return false;
    if (isLikelyScriptContentLine(trimmed)) return false;
    if (isKeyValueLine(trimmed)) return false;
    if (isKnownKey(trimmed)) return false;
    if (isSectionHeader(trimmed)) return false;
    return true;
};

const normalizeRoleName = (name = "") => {
    return String(name || "")
        .replace(/^[\-*•\d\.\)\(、\s]+/, "")
        .replace(/\s+$/, "")
        .trim();
};

const parseRoleSection = (lines, startIndex, limit) => {
    const items = [];
    const consumed = [];
    let i = startIndex;
    while (i < limit) {
        const current = normalizeLine(lines[i] || "");
        if (isBlank(current)) {
            if (consumed.length > 0) break;
            i += 1;
            continue;
        }
        if (isStopHeader(current) || isSectionHeader(current) || isKnownKey(current) || isSceneOrChapterLine(current) || SUBSECTION_HEADER_RE.test(current)) {
            break;
        }
        if (isKeyValueLine(current)) {
            const match = current.match(/^([^:：]+?)[:：]\s*(.+)$/) ||
                current.match(/^【(.+?)】\s*(.*)$/) ||
                current.match(/^\[(.+?)\]\s*(.*)$/);
            if (!match) break;
            const rawName = normalizeRoleName(match[1]);
            const mappedRoleKey = mapKey(rawName);
            if (mappedRoleKey && mappedRoleKey !== rawName && mappedRoleKey !== "RoleSetting") {
                break;
            }
            const rawText = String(match[2] || "").trim();
            if (rawName) {
                items.push({
                    name: rawName,
                    text: rawText,
                });
                consumed.push(i);
                i += 1;
                continue;
            }
            break;
        }
        const listMatch = current.match(/^[-*•\d\.\)\(、\s]*([^\-—:：]+?)\s*[-—:：]\s*(.+)$/);
        if (listMatch) {
            const rawName = normalizeRoleName(listMatch[1]);
            const rawText = String(listMatch[2] || "").trim();
            if (rawName) {
                items.push({
                    name: rawName,
                    text: rawText,
                });
                consumed.push(i);
                i += 1;
                continue;
            }
        }
        break;
    }
    return {
        items,
        consumed,
    };
};

export function extractMetadata(text) {
    const lines = text.split('\n');
    const metadata = {};
    const parsedLineIndexes = new Set();
    const limit = Math.min(lines.length, 120); // Scan a bit deeper
    let seenAnyKey = false;

    for (let i = 0; i < limit; i++) {
        const rawLine = lines[i];
        const line = normalizeLine(rawLine);
        if (isBlank(line)) continue;
        if (isStopHeader(line)) break;

        let rawKey, value;

        // 1. Check for Key: Value (English : or Chinese ：)
        const matchColon = line.match(/^([^:：]+?)[:：]\s*(.+)$/);
        // 2. Check for 【Key】Value
        const matchBracket = line.match(/^【(.+?)】\s*(.*)$/);
        // 3. Check for [Key] Value
        const matchSquare = line.match(/^\[(.+?)\]\s*(.*)$/);

        if (matchColon) {
            rawKey = matchColon[1].trim();
            value = matchColon[2].trim();
        } else if (matchBracket) {
            rawKey = matchBracket[1].trim();
            value = matchBracket[2].trim();
        } else if (matchSquare) {
            rawKey = matchSquare[1].trim();
            value = matchSquare[2].trim();
        }

        if (rawKey) {
            const mappedKey = mapKey(rawKey);
            if (mappedKey === '_IGNORE') {
                parsedLineIndexes.add(i);
                seenAnyKey = true;
            } else if (mappedKey && COMMON_KEYS.has(mappedKey)) {
                parsedLineIndexes.add(i);
                seenAnyKey = true;
                if (metadata[mappedKey]) {
                    metadata[mappedKey] += `; ${value}`;
                } else {
                    metadata[mappedKey] = value;
                }
            } else {
                // Unknown key-value most likely belongs to body content; stop scanning.
                break;
            }
            continue;
        }

        // Section headers: skip, but keep scanning
        if (isSectionHeader(line)) {
            seenAnyKey = true;
            parsedLineIndexes.add(i);
            const mapped = mapKey(line);
            if (mapped === "RoleSetting") {
                const sectionParsed = parseRoleSection(lines, i + 1, limit);
                if (sectionParsed.items.length > 0) {
                    metadata.RoleSetting = JSON.stringify({
                        mode: "multi",
                        items: sectionParsed.items,
                    });
                    sectionParsed.consumed.forEach((idx) => parsedLineIndexes.add(idx));
                    i = Math.max(i, (sectionParsed.consumed[sectionParsed.consumed.length - 1] ?? i));
                }
            } else if (mapped === "ChapterSettings") {
                let j = i + 1;
                const chapterLines = [];
                while (j < limit) {
                    const nextLine = normalizeLine(lines[j] || "");
                    if (isBlank(nextLine)) {
                        if (chapterLines.length > 0) break;
                        j += 1;
                        continue;
                    }
                    if (isStopHeader(nextLine) || isSectionHeader(nextLine) || isKnownKey(nextLine)) break;
                    if (!isSceneOrChapterLine(nextLine)) break;
                    chapterLines.push(nextLine);
                    parsedLineIndexes.add(j);
                    j += 1;
                }
                if (chapterLines.length > 0) {
                    metadata.ChapterSettings = JSON.stringify({
                        mode: "chapter_multi",
                        items: chapterLines.map((line) => ({
                            chapter: line,
                            environment: "",
                            situation: "",
                        })),
                    });
                    i = Math.max(i, j - 1);
                }
            }
            continue;
        }

        // Key-only line: value in following non-blank lines
        if (isKnownKey(line)) {
            parsedLineIndexes.add(i);
            const mappedKey = mapKey(line);
            if (mappedKey && mappedKey !== '_IGNORE' && COMMON_KEYS.has(mappedKey)) {
                seenAnyKey = true;
                if (mappedKey === "RoleSetting") {
                    const sectionParsed = parseRoleSection(lines, i + 1, limit);
                    if (sectionParsed.items.length > 0) {
                        metadata.RoleSetting = JSON.stringify({
                            mode: "multi",
                            items: sectionParsed.items,
                        });
                        sectionParsed.consumed.forEach((idx) => parsedLineIndexes.add(idx));
                        i = Math.max(i, (sectionParsed.consumed[sectionParsed.consumed.length - 1] ?? i));
                    }
                    continue;
                }
                if (mappedKey === "ChapterSettings") {
                    let j = i + 1;
                    const chapterLines = [];
                    while (j < limit) {
                        const nextLine = normalizeLine(lines[j] || "");
                        if (isBlank(nextLine)) {
                            if (chapterLines.length > 0) break;
                            j += 1;
                            continue;
                        }
                        if (isStopHeader(nextLine) || isSectionHeader(nextLine) || isKnownKey(nextLine)) break;
                        if (!isSceneOrChapterLine(nextLine)) break;
                        chapterLines.push(nextLine);
                        parsedLineIndexes.add(j);
                        j += 1;
                    }
                    if (chapterLines.length > 0) {
                        metadata.ChapterSettings = JSON.stringify({
                            mode: "chapter_multi",
                            items: chapterLines.map((lineText) => ({
                                chapter: lineText,
                                environment: "",
                                situation: "",
                            })),
                        });
                        i = Math.max(i, j - 1);
                    }
                    continue;
                }
                let j = i + 1;
                while (j < limit && isBlank(normalizeLine(lines[j]))) j++;
                const valueLines = [];
                while (j < limit) {
                    const nextLine = normalizeLine(lines[j]);
                    if (isBlank(nextLine)) break;
                    if (isValueBoundaryLine(nextLine)) break;
                    if (isKeyValueLine(nextLine)) break;
                    valueLines.push(nextLine);
                    parsedLineIndexes.add(j);
                    if (mappedKey === "Tags") break;
                    j++;
                }
                if (valueLines.length > 0) {
                    const combined = valueLines.join(' ').trim();
                    if (mappedKey === "RoleSetting" || mappedKey === "ChapterSettings") {
                        metadata[mappedKey] = combined;
                    } else if (metadata[mappedKey]) {
                        metadata[mappedKey] += `; ${combined}`;
                    } else {
                        metadata[mappedKey] = combined;
                    }
                }
                i = Math.max(i, j - 1);
            }
            continue;
        }

        // Fallback: treat first meaningful line as Title
        if (!metadata['Title'] && !seenAnyKey && isFallbackTitleCandidate(line)) {
            metadata['Title'] = line;
            parsedLineIndexes.add(i);
            continue;
        }

        // Once metadata block has started, the first non-metadata line marks body start.
        if (seenAnyKey) break;

        // No metadata context and first meaningful line is script-like body content.
        if (isLikelyScriptContentLine(line)) break;

        // Conservative fallback: stop at unknown lines instead of scanning deep into body.
        break;
    }
        
    // TODO: robust stopping condition.
    // For now, we process top lines.
    
    // Current simple logic: We extract what we can, but we return the ORIGINAL text?
    // Or we strip the metadata?
    // Usually we want to strip it if we successfully extracted it, to avoid duplication.
    // But safely stripping is hard without 100% confidence.
    // For "Import", we might just Extract the values to pre-fill the form, 
    // AND keep the text as is? 
    // Providing "Option to Strip" or just letting Parser handle valid keys.
    
    const parsedIndices = Array.from(parsedLineIndexes).sort((a, b) => a - b);
    let strippedText = text;
    if (parsedIndices.length > 0) {
        const cutoff = parsedIndices[parsedIndices.length - 1];
        strippedText = lines.slice(cutoff + 1).join('\n').replace(/^\s*\n+/, '').trimStart();
    }

    // Canonicalize chapter-related metadata to ChapterSettings only.
    const env = String(metadata.EnvironmentInfo || "").trim();
    const sit = String(metadata.SituationInfo || "").trim();
    if (!metadata.ChapterSettings && (env || sit)) {
        metadata.ChapterSettings = JSON.stringify({
            mode: "chapter_multi",
            items: [{
                chapter: "",
                environment: env,
                situation: sit,
            }],
        });
    } else if (metadata.ChapterSettings && (env || sit)) {
        try {
            const parsedChapter = JSON.parse(String(metadata.ChapterSettings || ""));
            if (parsedChapter?.mode === "chapter_multi" && Array.isArray(parsedChapter.items) && parsedChapter.items.length > 0) {
                const first = parsedChapter.items[0] || {};
                parsedChapter.items[0] = {
                    chapter: String(first.chapter || ""),
                    environment: String(first.environment || env),
                    situation: String(first.situation || sit),
                };
                metadata.ChapterSettings = JSON.stringify(parsedChapter);
            }
        } catch {
            // keep original ChapterSettings
        }
    }
    delete metadata.EnvironmentInfo;
    delete metadata.SituationInfo;

    return {
        metadata,
        parsedLineIndexes: parsedIndices,
        strippedText,
    };
}

function mapKey(key) {
    // Normalize key
    const nKey = key.replace(/\s/g, ''); // Remove spaces for checking
    if (KNOWN_KEYS[key]) return KNOWN_KEYS[key];
    if (KNOWN_KEYS[nKey]) return KNOWN_KEYS[nKey];
    return null;
}
