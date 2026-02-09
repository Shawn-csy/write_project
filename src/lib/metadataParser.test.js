import { describe, it, expect } from 'vitest';
import { extractMetadata, extractMetadataWithRaw, rewriteMetadata, writeMetadata } from './metadataParser.js';

describe('metadataParser', () => {
  describe('extractMetadata', () => {
    it('should parse simple key-value pairs and stop at first non-meta line', () => {
      const content = [
        'Title: Test Script',
        'Author: Jane Doe',
        '',
        'INT. ROOM - DAY',
        'Hello'
      ].join('\n');

      const meta = extractMetadata(content);
      expect(meta).toEqual({ title: 'Test Script', author: 'Jane Doe' });
    });

    it('should ignore leading blank lines and trim keys', () => {
      const content = [
        '',
        '  Title :  My Script  ',
        'Credit:  Feature',
        'NotAHeader'
      ].join('\n');

      const meta = extractMetadata(content);
      expect(meta).toEqual({ title: 'My Script', credit: 'Feature' });
    });
  });

  describe('extractMetadataWithRaw', () => {
    it('should preserve original key casing and collect raw entries', () => {
      const content = 'Draft Date: 2024-01-01\nContact: test@example.com\n\nBody';
      const result = extractMetadataWithRaw(content);

      expect(result.meta).toEqual({ draftdate: '2024-01-01', contact: 'test@example.com' });
      expect(result.rawEntries).toEqual([
        { key: 'Draft Date', value: '2024-01-01' },
        { key: 'Contact', value: 'test@example.com' }
      ]);
    });
  });

  describe('rewriteMetadata', () => {
    it('should update existing keys, keep order, and preserve body', () => {
      const content = [
        'Title: Old Title',
        'Author: Old Author',
        '',
        'Scene 1',
        'Scene 2'
      ].join('\n');

      const updated = rewriteMetadata(content, { title: 'New Title', author: 'New Author' });
      const expected = [
        'Title: New Title',
        'Author: New Author',
        '',
        'Scene 1',
        'Scene 2'
      ].join('\n');

      expect(updated).toBe(expected);
    });

    it('should remove keys when value is empty and add new custom keys', () => {
      const content = [
        'Title: Old Title',
        'Contact: old@example.com',
        '',
        'Body'
      ].join('\n');

      const updated = rewriteMetadata(content, { contact: '', notes: 'Private' });
      const expected = [
        'Title: Old Title',
        'Notes: Private',
        '',
        'Body'
      ].join('\n');

      expect(updated).toBe(expected);
    });
  });

  describe('writeMetadata', () => {
    it('should replace the entire header and keep body intact', () => {
      const content = [
        'Title: Old Title',
        'Author: Old Author',
        '',
        'Body line 1',
        'Body line 2'
      ].join('\n');

      const updated = writeMetadata(content, [
        { key: 'Title', value: 'New Title' },
        { key: 'Author', value: 'New Author' },
        { key: 'Contact', value: 'new@example.com' }
      ]);

      const expected = [
        'Title: New Title',
        'Author: New Author',
        'Contact: new@example.com',
        '',
        'Body line 1',
        'Body line 2'
      ].join('\n');

      expect(updated).toBe(expected);
    });
  });

  describe('Expansion Tests', () => {
    it('should handle unicode characters in keys and values', () => {
        const content = '作者: 王小明\n類型: 劇情片\n\n內容段落';
        const meta = extractMetadata(content);
        expect(meta).toEqual({ 作者: '王小明', 類型: '劇情片' });
    });

    it('should handle multiline metadata (if supported) or stop correctly', () => {
        // Current parser might not support multiline values standardly unless indent
        // Let's assume standard behavior: single line. 
        // If next line is not Key: Value, it stops? Or continues?
        // Fountain spec says Metadata is Key: Value. 
        // If next line doesn't have colon, it might be end of metadata.
        const content = 'Title: Multi\nLine\n\nBody';
        // "Line" doesn't have colon.
        const meta = extractMetadata(content);
        expect(meta).toEqual({ title: 'Multi' });
    });

    it('should handle missing values', () => {
        const content = 'Title:\nAuthor: Me\n\nBody';
        const meta = extractMetadata(content);
        expect(meta).toEqual({ title: '', author: 'Me' });
    });
  });
});
