/**
 * TextPreprocessor 單元測試
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TextPreprocessor, preprocess } from './textPreprocessor.js';

describe('TextPreprocessor', () => {
  
  describe('Symbol Normalization', () => {
    it('should normalize fullwidth @ to halfwidth', () => {
      const input = '＠ 聲音稍遠';
      const result = preprocess(input);
      
      assert.strictEqual(result.cleanedText, '@ 聲音稍遠');
      assert.strictEqual(result.transformLog.length, 1);
      assert.strictEqual(result.transformLog[0].type, 'normalize');
    });

    it('should normalize multiple symbols in one line', () => {
      const input = '＃SE ＠ 位置 ＊吹氣';
      const result = preprocess(input);
      
      assert.strictEqual(result.cleanedText, '#SE @ 位置 *吹氣');
    });

    it('should preserve fullwidth parentheses', () => {
      const input = '（輕笑）這是保留的';
      const result = preprocess(input);
      
      // 全形括號應該保留
      assert.ok(result.cleanedText.includes('（'));
      assert.ok(result.cleanedText.includes('）'));
    });
  });

  describe('Line Joining', () => {
    it('should join #SE with following content', () => {
      const input = '#SE\n門外的鑰匙聲';
      const result = preprocess(input);
      
      assert.strictEqual(result.cleanedText, '#SE 門外的鑰匙聲');
      assert.strictEqual(result.transformLog.some(l => l.type === 'join'), true);
    });

    it('should join @ with following content', () => {
      const input = '@\n聲音稍遠';
      const result = preprocess(input);
      
      assert.strictEqual(result.cleanedText, '@ 聲音稍遠');
    });

    it('should join >>SE with following content', () => {
      const input = '>>SE\n撫摸頭髮聲';
      const result = preprocess(input);
      
      assert.strictEqual(result.cleanedText, '>>SE 撫摸頭髮聲');
    });

    it('should join >>>SE with following content', () => {
      const input = '>>>SE\n舌吻的聲音';
      const result = preprocess(input);
      
      assert.strictEqual(result.cleanedText, '>>>SE 舌吻的聲音');
    });

    it('should join <<SE with following content', () => {
      const input = '<<SE\n撫摸頭髮聲結束';
      const result = preprocess(input);
      
      assert.strictEqual(result.cleanedText, '<<SE 撫摸頭髮聲結束');
    });

    it('should join //BG with following content', () => {
      const input = '//BG\n背景音樂開始';
      const result = preprocess(input);
      
      assert.strictEqual(result.cleanedText, '//BG 背景音樂開始');
    });

    it('should NOT join when next line is blank', () => {
      const input = '#SE\n\n另一行';
      const result = preprocess(input);
      
      assert.strictEqual(result.cleanedText, '#SE\n\n另一行');
    });

    it('should NOT join when next line starts with marker', () => {
      const input = '#SE\n@位置';
      const result = preprocess(input);
      
      // 下一行是標記開頭，不應該接
      assert.strictEqual(result.cleanedText, '#SE\n@位置');
    });

    it('should preserve intentional blank lines', () => {
      const input = '蒨伶\n（輕笑）\n\n下一段對話';
      const result = preprocess(input);
      
      // 空行應該保留
      assert.ok(result.cleanedText.includes('\n\n'));
    });
  });

  describe('Combined Processing', () => {
    it('should handle normalization and joining together', () => {
      const input = '＠\n聲音稍遠';
      const result = preprocess(input);
      
      // 先正規化 ＠ → @，然後接行
      assert.strictEqual(result.cleanedText, '@ 聲音稍遠');
    });

    it('should process complex multi-line input', () => {
      const input = `#SE
門外的鑰匙聲
＠
聲音稍遠
蒨伶
（注意到了什麼）嗯？`;
      
      const result = preprocess(input);
      const lines = result.cleanedText.split('\n');
      
      // #SE 和 @ 行應該被接
      assert.strictEqual(lines[0], '#SE 門外的鑰匙聲');
      assert.strictEqual(lines[1], '@ 聲音稍遠');
      // 角色名和對話應該保留分開
      assert.strictEqual(lines[2], '蒨伶');
      assert.strictEqual(lines[3], '（注意到了什麼）嗯？');
    });
  });

  describe('Join Preview', () => {
    it('should generate preview for auto-join lines', () => {
      const preprocessor = new TextPreprocessor();
      const input = '#SE\n門外的鑰匙聲\n普通行';
      
      const preview = preprocessor.getJoinPreview(input);
      
      assert.ok(preview.length > 0);
      const autoJoin = preview.find(p => p.type === 'auto');
      assert.ok(autoJoin);
      assert.strictEqual(autoJoin.preview, '#SE 門外的鑰匙聲');
    });

    it('should mark preserved lines', () => {
      const preprocessor = new TextPreprocessor();
      const input = '蒨伶\n（輕笑）';
      
      const preview = preprocessor.getJoinPreview(input);
      
      assert.ok(preview.every(p => p.type === 'preserve'));
    });
  });

  describe('Options', () => {
    it('should skip symbol normalization when disabled', () => {
      const input = '＠ 聲音稍遠';
      const result = preprocess(input, { normalizeSymbols: false });
      
      assert.strictEqual(result.cleanedText, '＠ 聲音稍遠');
    });

    it('should skip auto-join when disabled', () => {
      const input = '#SE\n門外的鑰匙聲';
      const result = preprocess(input, { autoJoin: false });
      
      assert.strictEqual(result.cleanedText, '#SE\n門外的鑰匙聲');
    });
  });
});
