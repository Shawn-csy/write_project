import React from 'react';
import { InlineRenderer } from '../InlineRenderer'; // Need to import this or just rely on child renderer filtering

export const SpeechNode = ({ node, context, isDual, NodeRenderer }) => {
    // Non-marker visual controls are disabled.
    const hideMeta = false;

    return (
        <div className="speech-block">
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
