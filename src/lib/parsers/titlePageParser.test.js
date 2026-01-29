import { describe, it, expect } from 'vitest';
import { splitTitleAndBody, extractTitleEntries } from './titlePageParser.js';

describe('TitlePageParser', () => {
    describe('splitTitleAndBody', () => {
        it('should handle empty input', () => {
            expect(splitTitleAndBody('')).toEqual({ titleLines: [], bodyText: "" });
        });

        it('should correctly split title and body with a blank line', () => {
            const input = "Title: My Script\nAuthor: Me\n\nINT. ROOM - DAY\nAction.";
            const result = splitTitleAndBody(input);
            expect(result.titleLines).toEqual(["Title: My Script", "Author: Me"]);
            expect(result.bodyText).toBe("INT. ROOM - DAY\nAction.");
        });

        it('should return all as body if no title-like first line exists', () => {
            const input = "EXT. FOREST - NIGHT\nSuddenly, wolves.";
            const result = splitTitleAndBody(input);
            expect(result.titleLines).toEqual([]);
            expect(result.bodyText).toBe(input);
        });

        it('should handle input with title keys but no blank line', () => {
            const input = "Title: Only Title\nAuthor: No Body";
            const result = splitTitleAndBody(input);
            expect(result.titleLines).toEqual(["Title: Only Title", "Author: No Body"]);
            expect(result.bodyText).toBe("");
        });
    });

    describe('extractTitleEntries', () => {
        it('should handle empty title lines', () => {
            expect(extractTitleEntries([])).toEqual([]);
        });

        it('should extract simple key-value pairs', () => {
            const lines = ["Title: My Script", "Author: Me"];
            const entries = extractTitleEntries(lines);
            expect(entries).toHaveLength(2);
            expect(entries[0]).toEqual({ key: 'Title', indent: 0, values: ['My Script'] });
            expect(entries[1]).toEqual({ key: 'Author', indent: 0, values: ['Me'] });
        });

        it('should handle multiline values', () => {
            const lines = ["Title: My Script", "Author: Me", "    Co-Author"];
            const entries = extractTitleEntries(lines);
            expect(entries).toHaveLength(2);
            expect(entries[1].values).toEqual(['Me', 'Co-Author']);
        });

        it('should handle keys with indentation', () => {
            const lines = ["  Title: Indented"];
            const entries = extractTitleEntries(lines);
            expect(entries[0].indent).toBe(2);
            expect(entries[0].key).toBe('Title');
        });
    });
});
