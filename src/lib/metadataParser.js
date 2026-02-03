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
    return meta;
};

/**
 * Extract metadata with original keys preserved.
 * @param {string} content
 * @returns {{ meta: object, rawEntries: Array<{ key: string, value: string }> }}
 */
export const extractMetadataWithRaw = (content) => {
    if (!content) return { meta: {}, rawEntries: [] };
    const meta = {};
    const rawEntries = [];
    const lines = content.split('\n');
    let readingMeta = true;
    for (let line of lines) {
        const rawLine = line;
        line = line.trim();
        if (!readingMeta) break;
        if (line === '') continue;
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
            const rawKey = match[1].trim();
            const value = match[2];
            const key = rawKey.toLowerCase().replace(' ', '');
            meta[key] = value;
            rawEntries.push({ key: rawKey, value });
        } else {
            readingMeta = false;
        }
    }
    return { meta, rawEntries };
};

/**
 * Updates or adds metadata to Fountain content
 * @param {string} content - Original script content
 * @param {object} updates - Key-value pairs to update (e.g. { title: "New", author: "Me" })
 * @returns {string} - New content with updated headers
 */
export const rewriteMetadata = (content, updates) => {
    if (!content) content = "";
    
    // Normalize updates keys to lower case without spaces, but keep values
    // Actually we want to preserve the standard keys casing for output if possible.
    // Standard keys: Title, Credit, Author/Authors, Source, Draft date, Contact, Copyright
    
    const StandardKeys = {
        title: "Title",
        credit: "Credit",
        author: "Author",
        authors: "Authors",
        source: "Source",
        notes: "Notes",
        draftdate: "Draft date",
        date: "Date",
        contact: "Contact",
        copyright: "Copyright"
    };

    const lines = content.split('\n');
    const newHeaders = { ...updates }; // Copy updates
    
    // 1. Identify existing metadata lines range
    let endOfMeta = 0;
    const existingKeys = new Set();
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') {
             // If we hit an empty line after finding some keys, or at start?
             // Fountain allows empty lines in header? "The first blank line indicates the end of the title page."
             if (i === 0) continue; // Leading blank lines?
             endOfMeta = i; 
             break;
        }
        
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
            // It's a metadata line
            const key = match[1].toLowerCase().replace(/\s/g, '');
            // If we are updating this key, ignore the old line (we will rebuild)
            // But actually we might correct the key format.
            existingKeys.add(key);
            endOfMeta = i + 1; // Assume meta continues
        } else {
            // Non-meta line implies end of header
            endOfMeta = i;
            break;
        }
    }

    // 2. Filter out keys we are updating from the original lines in the header block
    // Actually simplest way is to reconstruction the whole header block.
    // But we want to preserve unknown keys?
    // Let's parse existing headers first.
    
    const finalMeta = {};
    const keyMap = {}; // normalized -> original display key
    
    // Parse existing again
    for(let i=0; i<endOfMeta; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
            const rawKey = match[1];
            const normKey = rawKey.toLowerCase().replace(/\s/g, '');
            keyMap[normKey] = rawKey;
            finalMeta[normKey] = match[2];
        }
    }
    
    // Apply updates
    Object.keys(updates).forEach(k => {
        const normKey = k.toLowerCase().replace(/\s/g, '');
        if (updates[k] === null || updates[k] === undefined || updates[k] === "") {
             delete finalMeta[normKey]; // Remove if empty?
        } else {
             finalMeta[normKey] = updates[k];
             // If it's a standard key, ensure nice formatting for the key name
             if (StandardKeys[normKey]) {
                 keyMap[normKey] = StandardKeys[normKey];
             } else if (!keyMap[normKey]) {
                 // Capitalize first letter if new custom key
                 keyMap[normKey] = k.charAt(0).toUpperCase() + k.slice(1);
             }
        }
    });

    // Rebuild Header
    const headerLines = [];
    // Order: Title, Credit, Author, Source, Date, Contact... rest
    const Order = ['title', 'credit', 'author', 'authors', 'source', 'draftdate', 'date', 'contact', 'copyright'];
    
    // Added sorted keys
    const metaKeys = Object.keys(finalMeta);
    
    Order.forEach(k => {
        if (finalMeta[k]) {
            headerLines.push(`${keyMap[k] || StandardKeys[k]}: ${finalMeta[k]}`);
            // Remove from list so we don't add again
            const idx = metaKeys.indexOf(k);
            if (idx > -1) metaKeys.splice(idx, 1);
        }
    });
    
    // Add remaining
    metaKeys.forEach(k => {
        headerLines.push(`${keyMap[k] || k}: ${finalMeta[k]}`);
    });
    
    // Construct new content
    const body = lines.slice(endOfMeta).join('\n').trimStart(); // Content after header, trim leading newline
    return headerLines.join('\n') + "\n\n" + body;
};
