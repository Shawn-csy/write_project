
import { describe, it } from 'vitest';
import assert from 'node:assert';
import { MarkerStatsMetric } from './MarkerStatsMetric.js';

describe('MarkerStatsMetric Advanced Duration Parsing & Config', () => {
    it('should parse standard ?format with default config', () => {
        const metric = new MarkerStatsMetric();
        const duration = metric._parseDurationFromText('Wait ?5s');
        assert.strictEqual(duration, 5);
    });

    it('should support custom keywords from statsConfig', () => {
        const metric = new MarkerStatsMetric();
        const config = {
            customKeywords: [
                { factor: 10, keywords: ["decasecond", "ds"] } // 1 ds = 10s
            ]
        };
        const duration = metric._parseDurationFromText('Wait ?2ds', config);
        assert.strictEqual(duration, 20);
    });

    it('should support Chinese units via default config', () => {
        const metric = new MarkerStatsMetric();
        assert.strictEqual(metric._parseDurationFromText('<約 1.5 分>'), 90);
    });
    
    it('should exclude nested duration if config enabled', () => {
        const metric = new MarkerStatsMetric();
        const config = { excludeNestedDuration: true };
        const context = { markerConfigs: [], statsConfig: config };

        // Simulate traversing a range that HAS duration
        // We provide a startNode with text so standard _getRecursiveText works
        const rangeNode = { 
            type: 'range', 
            layerType: 'req', 
            startNode: { lineStart: 1, text: "?10s" }, 
            rangeRole: 'start' 
        };
        
        // 1. Enter Range
        metric.onNode(rangeNode, context); 
        
        assert.strictEqual(metric.customDurationSeconds, 10);
        assert.strictEqual(metric.durationOverrideStack[0], true);

        // 2. Process Child with Duration
        const childNode = { type: 'sfx', text: 'Boom ?5s' };
        metric.onNode(childNode, context);

        // Should NOT add 5s because we range has duration and exclusion is ON
        assert.strictEqual(metric.customDurationSeconds, 10);

        // 3. Exit Range
        metric.onExitNode(rangeNode, context);
        assert.strictEqual(metric.durationOverrideStack.length, 0);
        
        // 4. Process another node outside
        const outsideNode = { type: 'sfx', text: 'End ?2s' };
        metric.onNode(outsideNode, context);
        
        // 10 + 2 = 12
        assert.strictEqual(metric.customDurationSeconds, 12);
    });

    it('should NOT exclude nested duration if config disabled', () => {
         const metric = new MarkerStatsMetric();
        const config = { excludeNestedDuration: false };
        const context = { markerConfigs: [], statsConfig: config };

        const rangeNode = { 
            type: 'range', 
            layerType: 'req', 
            startNode: { lineStart: 1, text: "?10s" }, 
            rangeRole: 'start' 
        };
        
        metric.onNode(rangeNode, context); 
        
        assert.strictEqual(metric.customDurationSeconds, 10);

        // Process Child with Duration
        const childNode = { type: 'sfx', text: 'Boom ?5s' };
        metric.onNode(childNode, context);

        // Should ADD 5s -> 15
        assert.strictEqual(metric.customDurationSeconds, 15);
    });
});
