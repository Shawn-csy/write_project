/**
 * Helper to parse Fountain metadata
 * @param {string} content - Raw Fountain script content
 * @returns {object} - Key-value pair of metadata
 */
export const extractMetadata = (content) => {
    if (!content) return {};
    const meta = {};
    const lines = content.split('\n');
    let readingMeta = true;
    for (let line of lines) {
        line = line.trim();
        if (!readingMeta) break;
        if (line === '') continue; 
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
            const key = match[1].toLowerCase().replace(' ', '');
            meta[key] = match[2];
        } else {
            readingMeta = false; 
        }
    }
    return meta;
};
