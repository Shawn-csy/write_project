
import { describe, it, expect } from 'vitest';
import { buildAST } from './directASTBuilder.js';

describe('DirectASTBuilder Edge Cases', () => {

    describe('Nested Ranges', () => {
        const nestedConfigs = [
            { id: 'L1', start: '((', end: '))', matchMode: 'range', isBlock: true },
            { id: 'L2', start: '[[', end: ']]', matchMode: 'range', isBlock: true },
            { id: 'L3', start: '{{', end: '}}', matchMode: 'range', isBlock: true }
        ];

        it('should handle 3 levels of nesting', () => {
            const input = `
(( Start L1
  [[ Start L2
    {{ Start L3
      Deep Content
    }} End L3
  ]] End L2
)) End L1`;
            
            const ast = buildAST(input, nestedConfigs);
            const l1 = ast.children.find(n => n.type === 'range' && n.rangeGroupId === 'L1');
            expect(l1).toBeDefined();
            
            const l2 = l1.children.find(n => n.type === 'range' && n.rangeGroupId === 'L2');
            expect(l2).toBeDefined();
            
            const l3 = l2.children.find(n => n.type === 'range' && n.rangeGroupId === 'L3');
            expect(l3).toBeDefined();
            
            expect(l3.children.some(n => n.text && n.text.includes('Deep Content'))).toBe(true);
        });

        it('should handle mixed nesting order if logically valid', () => {
             // In DirectASTBuilder, nesting is strictly stack-based. 
             // If we open L1 then L2, closing L1 first should ideally close L2 implicitly or error, 
             // depending on implementation. Let's test the current behavior.
             // Current impl: "resume" toggles. "start/end" are separate? 
             // Actually currently `matchMode: 'range'` uses start/end pairs. 
             // If we close parent before child, child is usually orphaned or closed.
             const input = `
(( Start L1
  [[ Start L2
    Content
)) End L1
  ]] End L2 (Ignored or text)`;

             const ast = buildAST(input, nestedConfigs);
             const l1 = ast.children.find(n => n.type === 'range' && n.rangeGroupId === 'L1');
             // L2 should be inside L1
             const l2 = l1.children.find(n => n.type === 'range' && n.rangeGroupId === 'L2');
             expect(l2).toBeDefined();
             // L2 is likely NOT closed explicitly inside L1, so it might extend to end of L1
             // The "]] End L2" outside might be treated as action or invalid resume
        });
    });

    describe('Overlapping Ranges (Interleaved)', () => {
        const overlapConfigs = [
            { id: 'A', start: '<A>', end: '</A>', matchMode: 'range', isBlock: true },
            { id: 'B', start: '<B>', end: '</B>', matchMode: 'range', isBlock: true }
        ];

        it('should handle interleaved ranges (HTML-like error capability)', () => {
            // <A> ... <B> ... </A> ... </B>
            // Pure stack logic: </A> closes A. B is inside A. So B must close before A?
            // Or does </A> close B implicitly?
            // Let's verify standard behavior:
            const input = `
<A> Start A
  <B> Start B
  Mixed Content
</A> End A
</B> End B (Orphaned?)`;

            const ast = buildAST(input, overlapConfigs);
            const rangeA = ast.children.find(n => n.type === 'range' && n.rangeGroupId === 'A');
            expect(rangeA).toBeDefined();
            
            // B started inside A
            const rangeB = rangeA.children.find(n => n.type === 'range' && n.rangeGroupId === 'B');
            expect(rangeB).toBeDefined();
            
            // "Mixed Content" should be in B
            expect(rangeB.children.some(n => n.text && n.text.includes('Mixed Content'))).toBe(true);
            
            // </A> closes A. Since B was open, B is likely implicitly closed or just A closes.
            // Expected: A contains B. B ends at </A> (effectively).
            
            // The </B> outside is likely parsed as text or invalid end
            const orphanEnd = ast.children.find(n => n.text && n.text.includes('</B>'));
            // Depending on parser, might be action
        });
    });

    describe('Marker Conflicts', () => {
        const conflictConfigs = [
            { id: 'short', start: '>>', matchMode: 'prefix', isBlock: true },
            { id: 'long', start: '>>>', matchMode: 'prefix', isBlock: true }
        ];

        it('should prefer longer marker match', () => {
            const input = '>>> Long Match';
            const ast = buildAST(input, conflictConfigs);
            const layer = ast.children.find(n => n.type === 'layer');
            expect(layer.layerType).toBe('long');
        });
        
        it('should fallback to shorter if longer doesn\'t match fully', () => {
            const input = '>> Short Match';
            const ast = buildAST(input, conflictConfigs);
            const layer = ast.children.find(n => n.type === 'layer');
            expect(layer.layerType).toBe('short');
        });
    });
});
