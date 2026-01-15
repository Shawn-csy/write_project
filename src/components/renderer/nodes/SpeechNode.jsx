import React from 'react';
import { InlineRenderer } from '../InlineRenderer'; // Need to import this or just rely on child renderer filtering

export const SpeechNode = ({ node, context, isDual, NodeRenderer }) => {
    const { filterCharacter, focusMode, focusEffect, focusContentMode } = context;

    let opacity = 1;
    let display = 'block';
    
    // Check if this block belongs to the focused character
    let isTarget = false;
    if (focusMode && filterCharacter && filterCharacter !== '__ALL__') {
        const cleanName = node.character.replace(/\s*\(.*\)$/, '').toUpperCase();
        isTarget = cleanName === filterCharacter;

        if (!isTarget) {
            if (focusEffect === 'hide') display = 'none';
            else opacity = 0.3; // Dim non-target
        }
    }

    if (display === 'none') return null;
    
    // If focused and content mode is 'dialogue', filtering applies to children
    const hideMeta = isTarget && focusContentMode === 'dialogue';

    return (
        <div className="speech-block" style={{ opacity }}>
             {/* Character Name */}
             {!hideMeta && (
                 <NodeRenderer 
                    node={{ type: 'character', text: node.character }} 
                    context={context} 
                    isDual={isDual} 
                 />
             )}
             
             {/* Children: Dialogue and Parentheticals */}
             {node.children.map((child, i) => {
                 // specific filtering for children
                 if (hideMeta && child.type === 'parenthetical') return null;
                 // Note: Previously SpeechNode just mapped children. 
                 // We need to ensure we don't double render character if it's not in children (it usually isn't in AST children of Speech, but text prop of Speech node)
                 // Wait, looking at screenPlayAST.js: Speech node has children [Parenthetical, Dialogue]. 
                 // CodeMirror parser/AST builder usually puts Character name on the Speech Node itself.
                 
                 return <NodeRenderer key={i} node={child} context={context} isDual={isDual} />;
             })}
        </div>
    );
};

