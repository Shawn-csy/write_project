import Parsimmon from 'parsimmon';

const P = Parsimmon;

// Helper: Escape Regex special characters
export const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const createDynamicParsers = (configs = []) => {
    const parsers = {};

    configs.forEach(config => {
        // Only generate parsers for inline markers or block markers that have inline representation
        if (config.isBlock && config.type !== 'inline') return;

        const type = config.type || 'inline';
        const id = config.id || `custom-${Math.random().toString(36).substr(2, 9)}`;
        
        let parser;

        if (config.matchMode === 'regex' && config.regex) {
             try {
                 const re = new RegExp(config.regex);
                 parser = P.regex(re, 1).map(content => ({ type: 'highlight', id, content }));
             } catch (e) {
                 console.warn(`Invalid regex for marker ${config.label}:`, e);
             }
        } else if (config.matchMode === 'prefix' || (!config.end && config.start)) {
             // Prefix Mode: e.g. | Text
             const start = P.string(config.start);
             // Use regex to consume the rest of the node content
             parser = start.then(P.regex(/.*/)).map(content => ({ 
                 type: 'highlight', 
                 id, 
                 content: content.trim() 
             }));
        } else {
             // Enclosure Mode: e.g. { content }
             const startStr = config.start || '{';
             const endStr = config.end || '}';
             
             const start = P.string(startStr);
             const end = P.string(endStr);
             
             // Robust content parser using Regex lookahead
             // Matches any sequence of characters that does not start with endStr
             const escapedEnd = escapeRegExp(endStr);
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
    configs.forEach(c => {
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
