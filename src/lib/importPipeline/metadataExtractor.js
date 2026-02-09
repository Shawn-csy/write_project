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
    'CV': 'CV', // Custom key
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
    
    // Configurable Sections (Preserve as keys instead of ignoring)
    '作品資訊': 'Info', 
    '作品介紹': 'Info',
    '人物設定': 'Characters',
    '標記說明': 'Markers',
    '演繹指示': 'Instructions',
    '使用規章': 'License',
};

const STOP_HEADERS = new Set([
    '標記說明',
    '劇情開始'
]);

const SECTION_HEADERS = new Set([
    '作品資訊',
    '作品介紹',
    '人物設定',
    '標記說明',
    '演繹指示',
    '章節目錄',
    '故事背景'
]);

const isBlank = (line) => !line || line === '<blank>' || line.trim() === '';

const normalizeLine = (line) => line.trim();

const isStopHeader = (line) => STOP_HEADERS.has(line);

const isSectionHeader = (line) => SECTION_HEADERS.has(line);

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

export function extractMetadata(text) {
    const lines = text.split('\n');
    const metadata = {};
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
                // Skip
            } else if (mappedKey) {
                seenAnyKey = true;
                if (metadata[mappedKey]) {
                    metadata[mappedKey] += `; ${value}`;
                } else {
                    metadata[mappedKey] = value;
                }
            } else {
                seenAnyKey = true;
                metadata[rawKey] = value;
            }
            continue;
        }

        // Section headers: skip, but keep scanning
        if (isSectionHeader(line)) {
            seenAnyKey = true;
            continue;
        }

        // Key-only line: value in following non-blank lines
        if (isKnownKey(line)) {
            const mappedKey = mapKey(line);
            if (mappedKey && mappedKey !== '_IGNORE') {
                seenAnyKey = true;
                let j = i + 1;
                while (j < limit && isBlank(normalizeLine(lines[j]))) j++;
                const valueLines = [];
                while (j < limit) {
                    const nextLine = normalizeLine(lines[j]);
                    if (isBlank(nextLine)) break;
                    if (isStopHeader(nextLine)) break;
                    if (isSectionHeader(nextLine)) break;
                    if (isKeyValueLine(nextLine)) break;
                    if (isKnownKey(nextLine)) break;
                    valueLines.push(nextLine);
                    j++;
                }
                if (valueLines.length > 0) {
                    const combined = valueLines.join(' ').trim();
                    if (metadata[mappedKey]) {
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
        if (!metadata['Title'] && !seenAnyKey && line.length <= 60) {
            metadata['Title'] = line;
            continue;
        }
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
    
    return {
        metadata,
        // bodyText: ...
    };
}

function mapKey(key) {
    // Normalize key
    const nKey = key.replace(/\s/g, ''); // Remove spaces for checking
    if (KNOWN_KEYS[key]) return KNOWN_KEYS[key];
    if (KNOWN_KEYS[nKey]) return KNOWN_KEYS[nKey];
    
    // Fuzzy matching or return original
    return key; // Default to keeping custom key
}
