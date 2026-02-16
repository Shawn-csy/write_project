export const splitTitleAndBody = (preprocessedText = "") => {
    if (!preprocessedText) return { titleLines: [], bodyText: "", bodyStartLine: 1 };
    const lines = preprocessedText.split('\n');
    
    // Check if first line resembles a key:value pair
    const firstLineIsTitle = /^\s*([^:]+):/.test(lines[0] || "");
    
    if (!firstLineIsTitle) {
        return { titleLines: [], bodyText: preprocessedText, bodyStartLine: 1 };
    }

    // Find the first blank line
    const blankIdx = lines.findIndex((line) => !line.trim());
    
    if (blankIdx === -1) {
        // No blank line found: assume all title or all body?
        // If it starts with keys, likely all title.
        return { titleLines: lines, bodyText: "", bodyStartLine: lines.length + 1 };
    }

    return {
        titleLines: lines.slice(0, blankIdx),
        bodyText: lines.slice(blankIdx + 1).join('\n'), // Skip the blank line
        bodyStartLine: blankIdx + 2,
    };
};

export const extractTitleEntries = (titleLines = []) => {
    if (!titleLines.length) return [];
    const entries = [];
    let current = null;
    for (const raw of titleLines) {
        // Match leading indent, key, colon, and rest
        const match = raw.match(/^(\s*)([^:]+):(.*)$/);
        if (match) {
            const [, indent, key, rest] = match;
            const val = rest.trim();
            current = {
                key: key.trim(),
                indent: indent.length,
                values: val ? [val] : [],
            };
            entries.push(current);
        } else if (current) {
            const continuation = raw.trim();
            if (continuation) current.values.push(continuation);
        }
    }
    return entries;
};
