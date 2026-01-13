import { parseInline } from '../parsers/inlineParser.js';

export const slugifyScene = (text = "", idx = 0) => {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return base || `scene-${idx + 1}`;
};

const doParseInline = (txt, configs) => parseInline(txt, configs);

export const processAction = (token, state, blockMarkers, activeConfigs) => {
    const { current, stack, children, pushNode } = state;
    const lines = token.text.split('\n');
    let contentBuffer = [];

    const flushBuffer = () => {
        if (contentBuffer.length === 0) return;
        const text = contentBuffer.join('\n');
        const node = { 
            type: 'action', 
            text: text, 
            inline: doParseInline(text, activeConfigs)
        };
        children().push(node);
        contentBuffer = [];
    };

    lines.forEach(rawLine => {
        const text = rawLine.trim();

        // Marker Detection
        let isMarker = false;
        
        for (const config of blockMarkers) {
            // 1. Enclosure Match
            const enclosureMatch = text.match(config.enclosureRegex);

            if (enclosureMatch) {
                flushBuffer();
                isMarker = true;

                // Smart Toggle
                if (config.smartToggle) {
                    if (current().type === 'speech') stack.pop();

                    const parent = current();
                    const isSameLayer = parent.type === 'layer' && parent.layerType === config.id;

                    if (isSameLayer) {
                        stack.pop(); // Close
                    } else {
                        // Open
                        const content = enclosureMatch[1].trim();
                        const layer = { 
                            type: 'layer', 
                            layerType: config.id, 
                            markerType: config.type,
                            children: [], 
                            label: content 
                        };
                        children().push(layer);
                        stack.push(layer);
                    }
                } else {
                    // Standard Enclosure
                    const content = enclosureMatch[1].trim();
                    const layer = { 
                        type: 'layer', 
                        layerType: config.id, 
                        markerType: config.type,
                        children: [
                            { 
                                type: 'action', 
                                text: content, 
                                inline: doParseInline(content, activeConfigs) 
                            }
                        ] 
                    };
                    children().push(layer);
                }
                break; 
            }

            const startMatch = text.match(config.startRegex);
            const endMatch = text.match(config.endRegex);
            const isStart = !!startMatch;
            const isEnd = !!endMatch;

            if (isStart || isEnd) {
                flushBuffer();
                isMarker = true;
                
                let label = null;
                if (isStart) {
                   label = text.slice(config.start.length).trim();
                }
                
                let endLabel = null;
                if (isEnd) {
                   endLabel = text.slice(config.end.length).trim();
                }

                if (config.start === config.end) {
                   // Generic Toggle
                    const parent = current();
                    const isSameLayer = parent.type === 'layer' && parent.layerType === config.id;
                    if (isSameLayer) {
                        if (endLabel) parent.endLabel = endLabel;
                        stack.pop();
                    } else {
                        const layer = { type: 'layer', layerType: config.id, markerType: config.type, children: [], label };
                        children().push(layer);
                        stack.push(layer);
                    }
                } else {
                    if (isStart) {
                        const layer = { type: 'layer', layerType: config.id, markerType: config.type, children: [], label };
                        children().push(layer);
                        stack.push(layer);
                    } else if (isEnd) {
                        if (current().type === 'speech') stack.pop();
                        
                        const parent = current();
                        if (parent.type === 'layer' && parent.layerType === config.id) {
                            if (endLabel) parent.endLabel = endLabel;
                            stack.pop();
                        }
                    }
                }
                break;
            }
        }

        if (isMarker) return;
        contentBuffer.push(rawLine);
    });
    
    flushBuffer();
};

export const processCharacter = (token, state, activeConfigs) => {
    const { current, stack, children } = state;
    const isDual = token.text.trim().endsWith('^') || token.dual;
    const characterName = token.text.trim().replace(/\^$/, '').trim();

    const speech = {
        type: 'speech',
        character: characterName, 
        dual: isDual ? 'right' : undefined,
        children: []
    };
    
    if (isDual) {
        const siblings = children();
        let prevIdx = siblings.length - 1;
        let prev = null;
        while (prevIdx >= 0) {
            const node = siblings[prevIdx];
            const isWhitespace = node.type === 'whitespace';
            const isEmptyAction = node.type === 'action' && (!node.text || !node.text.trim());
            
            if (!isWhitespace && !isEmptyAction) {
                prev = node;
                break;
            }
            prevIdx--;
        }

        if (prev && prev.type === 'speech') {
            const dualContainer = {
                type: 'dual_dialogue',
                children: [prev, speech]
            };
            siblings[prevIdx] = dualContainer;
            if (prevIdx < siblings.length - 1) {
                siblings.splice(prevIdx + 1, siblings.length - 1 - prevIdx);
            }
            stack.push(speech);
            return;
        } else if (prev && prev.type === 'dual_dialogue') {
             prev.children.push(speech);
             stack.push(speech);
             return;
        }
    }

    const node = { ...token, text: characterName, inline: doParseInline(characterName, activeConfigs) };
    speech.children.push(node);
    children().push(speech);
    stack.push(speech);
};

export const processDialogue = (token, state, blockMarkers, activeConfigs) => {
    const { current, stack } = state;
    
    // Check for Block End Markers swallowed by dialogue
    const parent = current();
    const isLayer = parent.type === 'layer';
    
    if (isLayer) {
        const config = blockMarkers.find(c => c.id === parent.layerType);
        if (config && config.endRegex) {
             const lines = token.text.split('\n');
             const dialogueBuffer = [];
             let consumed = false;
             
             for (let i = 0; i < lines.length; i++) {
                 const line = lines[i];
                 const endMatch = line.trim().match(config.endRegex);
                 
                 if (endMatch) {
                     if (dialogueBuffer.length > 0) {
                         const text = dialogueBuffer.join('\n');
                         current().children.push({
                             ...token,
                             text: text,
                             inline: doParseInline(text, activeConfigs)
                         });
                     }
                     
                     let endLabel = null;
                     if (config.end) {
                         endLabel = line.trim().slice(config.end.length).trim();
                     }
                     if (endLabel) parent.endLabel = endLabel;
                     stack.pop(); 
                     consumed = true;
                     break; 
                 } else {
                     dialogueBuffer.push(line);
                 }
             }
             if (consumed) return;
        }
    }
    
    current().children.push({ 
        ...token, 
        inline: doParseInline(token.text, activeConfigs) 
    });
};

export const processSceneHeading = (token, state, activeConfigs) => {
    const { dup, children } = state;
    const label = token.text.trim();
    const base = slugifyScene(label, state.sceneIdx);
    const count = dup.get(base) || 0;
    const id = count > 0 ? `${base}-${count + 1}` : base;
    dup.set(base, count + 1);
    
    const node = {
        ...token,
        id,
        inline: doParseInline(token.text, activeConfigs)
    };
    
    children().push(node);
    state.sceneIdx++;
};
