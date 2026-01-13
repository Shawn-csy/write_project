import React from 'react';

export const SpeechNode = ({ node, context, isDual, NodeRenderer }) => {
    const { filterCharacter, focusMode, focusEffect } = context;

    let opacity = 1;
    let display = 'block';
    
    if (focusMode && filterCharacter && filterCharacter !== '__ALL__') {
        const cleanName = node.character.replace(/\s*\(.*\)$/, '').toUpperCase();
        const isTarget = cleanName === filterCharacter;

        if (!isTarget) {
            if (focusEffect === 'hide') display = 'none';
            else opacity = 0.3; // Dim
        }
    }
    
    if (display === 'none') return null;
    
    return (
        <div className="speech-block" style={{ opacity }}>
             {node.children.map((child, i) => <NodeRenderer key={i} node={child} context={context} isDual={isDual} />)}
        </div>
    );
};
