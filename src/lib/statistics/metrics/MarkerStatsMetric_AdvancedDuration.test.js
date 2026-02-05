
import { describe, it } from 'vitest';
import assert from 'node:assert';
import { MarkerStatsMetric } from './MarkerStatsMetric.js';

describe('MarkerStatsMetric Advanced Duration Parsing', () => {
    it('should parse standard ?format', () => {
        const metric = new MarkerStatsMetric();
        const duration = metric._parseDurationFromText('Wait ?5s');
        assert.strictEqual(duration, 5);
    });

    it('should parse bracket format <約5分鐘>', () => {
        const metric = new MarkerStatsMetric();
        const duration = metric._parseDurationFromText('Info <約5分鐘>');
        assert.strictEqual(duration, 300);
    });

    it('should parse parenthesis format (30s)', () => {
        const metric = new MarkerStatsMetric();
        const duration = metric._parseDurationFromText('Some effect (30s)');
        assert.strictEqual(duration, 30);
    });

    it('should parse Chinese units', () => {
        const metric = new MarkerStatsMetric();
        assert.strictEqual(metric._parseDurationFromText('<約 1.5 分>'), 90);
        assert.strictEqual(metric._parseDurationFromText('?10秒'), 10);
    });

    it('should ignore false positives', () => {
        const metric = new MarkerStatsMetric();
        assert.strictEqual(metric._parseDurationFromText('Just 5 minutes text'), 0); // No markers
        assert.strictEqual(metric._parseDurationFromText('1990s'), 0);
    });
});
