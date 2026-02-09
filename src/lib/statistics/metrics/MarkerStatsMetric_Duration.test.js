
import { describe, it } from 'vitest';
import assert from 'node:assert';
import { MarkerStatsMetric } from './MarkerStatsMetric.js';

describe('MarkerStatsMetric Duration Parsing', () => {
    it('should parse seconds identifiers correctly', () => {
        const metric = new MarkerStatsMetric();
        const duration = metric._parseDurationFromText('Wait ?5s for effect');
        assert.strictEqual(duration, 5);
    });

    it('should parse chinese seconds', () => {
        const metric = new MarkerStatsMetric();
        const duration = metric._parseDurationFromText('等待 ?10秒 效果');
        assert.strictEqual(duration, 10);
    });

    it('should parse minutes', () => {
        const metric = new MarkerStatsMetric();
        const duration = metric._parseDurationFromText('Long pause ?2min here');
        assert.strictEqual(duration, 120);
    });
    
    it('should parse chinese minutes', () => {
        const metric = new MarkerStatsMetric();
        const duration = metric._parseDurationFromText('休息 ?1.5分');
        assert.strictEqual(duration, 90);
    });

    it('should sum multiple durations', () => {
        const metric = new MarkerStatsMetric();
        const duration = metric._parseDurationFromText('?5s and then ?10s');
        assert.strictEqual(duration, 15);
    });
    
    it('should handle decimal values', () => {
        const metric = new MarkerStatsMetric();
        const duration = metric._parseDurationFromText('?0.5s');
        assert.strictEqual(duration, 0.5);
    });

    it('should ignore invalid formats', () => {
        const metric = new MarkerStatsMetric();
        assert.strictEqual(metric._parseDurationFromText('?5'), 0); // missing unit
        assert.strictEqual(metric._parseDurationFromText('?s'), 0); // missing number
    });
});
