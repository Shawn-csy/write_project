import Parsimmon from 'parsimmon';

const P = Parsimmon;

// Helper: Escape Regex special characters
export const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const createDynamicParsers = (configs = []) => {
    const parsers = {};
    const safeConfigs = Array.isArray(configs) ? configs : [];

    safeConfigs.forEach(config => {
        // [MODIFIED] Relaxed restriction: Allow Block markers to be parsed inline.
        // This enables "Nested Block Markers" (e.g. using a Block Enclosure inside a Prefix Rule).
        // Since doParseInline generates 'highlight' nodes, this will render them as styled spans/text
        // instead of structural Layers, which is exactly what we want for nested usage.
        
        // if (config.isBlock && config.type !== 'inline') return; 

        const type = config.type || 'inline';
        const id = config.id || `custom-${Math.random().toString(36).substr(2, 9)}`;
        
        let parser;

        if (config.matchMode === 'regex' && config.regex) {
             try {
                 const re = new RegExp(config.regex);
                 // Smart group detection: only use group 1 if parentheses are present and not escaped.
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
             
             const start = P.string(config.start);
             parser = start.then(P.regex(/.*/)).map(content => ({ 
                 type: 'highlight', 
                 id, 
                 content: content.trim() 
             }));
        } else {
             // Enclosure Mode
             const startStr = config.start || '{';
             const endStr = config.end || '}';
             
             if (!startStr || startStr.length === 0) return; // Prevent empty start

             const start = P.string(startStr);
             const end = P.string(endStr);
             
             const escapedEnd = escapeRegExp(endStr);
             // Ensure we don't catch newline if it's meant to be inline
             // (Though P.regex usually is multiline in Parsimmon? No, default is just regex exec)
             // We use dot which doesn't match newline.
             const contentRegex = new RegExp(`^(?:(?!${escapedEnd}).)*`);
             
             const safeContent = P.regex(contentRegex);

             parser = start.then(safeContent).skip(end).map(content => ({
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

// [Direction] or [sfx: ...]
export const DirectionParser = P.string('[')
  .then(P.noneOf(']').atLeast(1).map(x => x.join('')))
  .skip(P.string(']'))
  .map(content => {
      if (content.match(/^sfx[:：]/i)) {
          return { type: 'sfx', content: content.replace(/^sfx[:：]\s*/i, '').trim() };
      }
      return { type: 'direction', content: content.trim() };
  });

export const createTextParser = (configs = []) => {
    // Collect all start characters from configs to exclude them from Text
    // Only exclude '[' by default because DirectionParser is hardcoded to use it.
    const startChars = new Set(['[']); 
    const safeConfigs = Array.isArray(configs) ? configs : [];

    safeConfigs.forEach(c => {
        // Only exclude start char if this config generates an INLINE parser.
        const generatesParser = !(c.isBlock && c.type !== 'inline'); 
        
        if (generatesParser && c.start && c.start.length > 0) {
            startChars.add(c.start.charAt(0));
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
