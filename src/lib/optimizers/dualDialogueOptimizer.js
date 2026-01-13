/**
 * Post-Process: optimizeDualDialogue
 * Traverse AST to merge 'dual' layers with previous 'speech' nodes
 * similar to how parsing-time merge works, but for explicit blocks.
 */
export const processDualLayers = (node) => {
    if (!node.children || node.children.length === 0) return;

    const children = node.children;
    // Iterate backwards safely
    for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        
        // Process children first (bottom-up)
        processDualLayers(child);
        
        // Re-process 'dual' layers to ensure they contain Speech nodes
        // If fountain-js parsed them as Action due to lack of newlines, we fix it here.
        // Support both config.type === 'dual' AND legacy ID check for robustness
        const isDualType = child.type === 'layer' && (child.markerType === 'dual' || child.layerType === 'dual');

        if (isDualType) {
            const newChildren = [];
            let currentSpeech = null;
            
            child.children.forEach(sub => {
                // Heuristic: If Action, and uppercase, treat as Character?
                // Or if Action and followed by Action?
                // Let's assume user writes: Name \n Dialogue
                if (sub.type === 'action') {
                    const text = sub.text || '';
                    const lines = text.split('\n');
                    
                    lines.forEach(line => {
                        const trimmed = line.trim();
                        if (!trimmed) return;
                        
                        // Simple Upper Case Check for Character
                        const isUpper = /^[A-Z0-9\u4e00-\u9fa5\s\(\)\.-]+$/.test(trimmed) && trimmed.length < 20; 
                        // Note: Chinese characters are "uppercase" in regex sense? No.
                        // But usually names are short.
                        
                        if (isUpper || trimmed.startsWith('@')) {
                            // New Character
                            const name = trimmed.replace(/^@/, '');
                            currentSpeech = {
                                type: 'speech',
                                character: name,
                                children: []
                            };
                            newChildren.push(currentSpeech);
                        } else {
                            // Dialogue
                            if (currentSpeech) {
                                currentSpeech.children.push({
                                    type: 'dialogue',
                                    text: trimmed,
                                    inline: [{ type: 'text', content: trimmed }]
                                });
                            } else {
                                // Orphan text? Maybe just action.
                                // Treat as action inside dual?
                                newChildren.push({ ...sub, text: line, inline: [{ type: 'text', content: line }] });
                            }
                        }
                    });
                } else if (sub.type === 'speech') {
                     newChildren.push(sub);
                     currentSpeech = sub;
                } else {
                     newChildren.push(sub);
                }
            });
            
            // Update children of the layer
            child.children = newChildren;
        }

        // Check for Dual Layer Merge Logic
        if (isDualType) {
             // Find previous non-whitespace sibling
             let prevIdx = i - 1;
             let prev = null;
             while (prevIdx >= 0) {
                 const sib = children[prevIdx];
                 const isWhitespace = sib.type === 'whitespace';
                 const isEmptyAction = sib.type === 'action' && (!sib.text || !sib.text.trim());
                 
                 if (!isWhitespace && !isEmptyAction) {
                     prev = sib;
                     break;
                 }
                 prevIdx--;
             }
             
             // If previous is Speech -> MERGE (Implicit Mode: Name ^)
             if (prev && prev.type === 'speech') {
                 // Filter valid children to strict speech/content content
                 const validChildren = child.children.filter(c => {
                     // Exclude fountain-js structural tokens
                     if (c.type.endsWith('_begin') || c.type.endsWith('_end')) return false;
                     if (c.type === 'whitespace') return false;
                     if (c.type === 'action' && (!c.text || !c.text.trim())) return false;
                     return true;
                 });

                 const dualContainer = {
                     type: 'dual_dialogue',
                     children: [prev, ...validChildren] 
                 };
                 children[prevIdx] = dualContainer;
                 children.splice(i, 1); 
                 if (prevIdx < i - 1) children.splice(prevIdx + 1, i - 1 - prevIdx);
                 i = prevIdx;

             } else if (prev && prev.type === 'dual_dialogue') {
                 // Add to existing
                 const validChildren = child.children.filter(c => {
                     if (c.type.endsWith('_begin') || c.type.endsWith('_end')) return false;
                     if (c.type === 'whitespace') return false;
                     if (c.type === 'action' && (!c.text || !c.text.trim())) return false;
                     return true;
                 });
                 
                 prev.children.push(...validChildren);
                 children.splice(i, 1);
                 if (prevIdx < i - 1) children.splice(prevIdx + 1, i - 1 - prevIdx);
                 i = prevIdx;
             } else {
                 // No previous speech? IT IS A STANDALONE BLOCK.
                 // Filter children
                 const validChildren = child.children.filter(c => {
                     if (c.type.endsWith('_begin') || c.type.endsWith('_end')) return false;
                     if (c.type === 'whitespace') return false;
                     if (c.type === 'action' && (!c.text || !c.text.trim())) return false;
                     return true;
                 });

                 if (validChildren.length > 0) {
                     const dualContainer = {
                         type: 'dual_dialogue',
                         children: validChildren
                     };
                     children[i] = dualContainer;
                 } else {
                    // Empty dual block? Just remove layer
                    children.splice(i, 1);
                 }
             }
        }
    }
};
