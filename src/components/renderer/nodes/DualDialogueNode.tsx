import React from 'react';

interface DualDialogueNodeData {
    children?: unknown[];
}

interface DualDialogueNodeProps {
    node: DualDialogueNodeData;
    context: unknown;
    NodeRenderer: React.ComponentType<{ node: any; context: any; isDual?: boolean }>;
}

export const DualDialogueNode = ({ node, context, NodeRenderer }: DualDialogueNodeProps): React.JSX.Element => {
    return (
        <div className="dual-dialogue flex flex-row items-start justify-center gap-4 my-6 w-full mx-auto relative group">
            <div className="absolute top-2 bottom-2 left-1/2 w-px bg-border/30 -translate-x-1/2 hidden group-hover:block sm:block"></div>
            
            {(node.children || []).map((child: unknown, i: number) => (
                <div key={i} className="flex-1 min-w-0 z-10">
                    <NodeRenderer node={child} context={context} isDual={true} />
                </div>
            ))}
        </div>
    );
};
