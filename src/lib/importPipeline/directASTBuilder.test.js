/**
 * DirectASTBuilder 單元測試
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DirectASTBuilder, buildAST } from './directASTBuilder.js';

describe('DirectASTBuilder', () => {
  
  describe('Basic AST Structure', () => {
    it('should create root screenplay node', () => {
      const input = '測試文本';
      const ast = buildAST(input);
      
      assert.strictEqual(ast.type, 'screenplay');
      assert.ok(Array.isArray(ast.children));
    });

    it('should include metadata', () => {
      const input = '第一行\n第二行';
      const ast = buildAST(input);
      
      assert.ok(ast.metadata);
      assert.strictEqual(ast.metadata.totalLines, 2);
    });

    it('should preserve line numbers', () => {
      const input = '第一行\n第二行\n第三行';
      const ast = buildAST(input);
      
      assert.strictEqual(ast.children[0].lineNumber, 1);
      assert.strictEqual(ast.children[1].lineNumber, 2);
      assert.strictEqual(ast.children[2].lineNumber, 3);
    });
  });

  describe('Blank Line Handling', () => {
    it('should detect blank lines', () => {
      const input = '內容\n\n另一段';
      const ast = buildAST(input);
      
      const blank = ast.children.find(n => n.type === 'blank');
      assert.ok(blank);
    });

    it('should reset character context on blank line', () => {
      const input = `蒨伶
這是對話

這應該是動作`;
      const ast = buildAST(input);
      
      const lastNode = ast.children[ast.children.length - 1];
      assert.strictEqual(lastNode.type, 'action');
    });
  });

  describe('Chapter Detection', () => {
    it('should detect numbered chapter format', () => {
      const input = '01. 被姊姊系女友當成狗？';
      const ast = buildAST(input);
      
      const chapter = ast.children.find(n => n.type === 'chapter');
      assert.ok(chapter);
      assert.strictEqual(chapter.number, 1);
    });

    it('should detect Chinese chapter format', () => {
      const input = '第一章 開場';
      const ast = buildAST(input);
      
      const chapter = ast.children.find(n => n.type === 'chapter');
      assert.ok(chapter);
      assert.strictEqual(chapter.number, '一');
    });
  });

  describe('Character Detection', () => {
    it('should detect 2-4 character Chinese names', () => {
      const input = '蒨伶';
      const ast = buildAST(input);
      
      const character = ast.children.find(n => n.type === 'character');
      assert.ok(character);
      assert.strictEqual(character.name, '蒨伶');
    });

    it('should detect character name with parentheses', () => {
      const input = '蒨伶（注意到了什麼）';
      const ast = buildAST(input);
      
      // 這會被判定為角色名
      const character = ast.children.find(n => n.type === 'character');
      assert.ok(character);
    });

    it('should NOT detect lines starting with markers as character', () => {
      const input = '#SE 音效';
      
      // 配置 #SE 為 marker
      const configs = [
        { id: 'se', start: '#SE', matchMode: 'prefix', isBlock: true }
      ];
      const ast = buildAST(input, configs);
      
      const character = ast.children.find(n => n.type === 'character');
      assert.ok(!character, 'Should not detect marker as character');
    });
  });

  describe('Dialogue Detection', () => {
    it('should detect dialogue after character name', () => {
      const input = `蒨伶
這是我說的話`;
      const ast = buildAST(input);
      
      const dialogue = ast.children.find(n => n.type === 'dialogue');
      assert.ok(dialogue);
      assert.strictEqual(dialogue.content, '這是我說的話');
      assert.strictEqual(dialogue.character, '蒨伶');
    });

    it('should support multiple dialogue lines', () => {
      const input = `蒨伶
第一句話
第二句話`;
      const ast = buildAST(input);
      
      const dialogues = ast.children.filter(n => n.type === 'dialogue');
      assert.strictEqual(dialogues.length, 2);
    });
  });

  describe('Marker Detection', () => {
    it('should detect prefix markers', () => {
      const input = '#SE 門外的鑰匙聲';
      const configs = [
        { id: 'se', label: '效果音', start: '#SE', matchMode: 'prefix', isBlock: true }
      ];
      const ast = buildAST(input, configs);
      
      const marker = ast.children.find(n => n.type === 'marker');
      assert.ok(marker);
      assert.strictEqual(marker.markerId, 'se');
      assert.strictEqual(marker.content, '門外的鑰匙聲');
    });

    it('should detect position markers', () => {
      const input = '@ 聲音稍遠';
      const configs = [
        { id: 'pos', label: '位置', start: '@', matchMode: 'prefix', isBlock: true }
      ];
      const ast = buildAST(input, configs);
      
      const marker = ast.children.find(n => n.type === 'marker');
      assert.ok(marker);
      assert.strictEqual(marker.markerId, 'pos');
    });

    it('should prefer longer markers', () => {
      const input = '>>SE 持續音效';
      const configs = [
        { id: 'se', start: '>SE', matchMode: 'prefix', isBlock: true },
        { id: 'se_cont', start: '>>SE', matchMode: 'prefix', isBlock: true }
      ];
      const ast = buildAST(input, configs);
      
      const marker = ast.children.find(n => n.type === 'marker');
      assert.strictEqual(marker.markerId, 'se_cont');
    });
  });

  describe('Inline Parsing', () => {
    it('should parse inline markers in dialogue', () => {
      const input = `蒨伶
（輕笑）這是對話`;
      
      const configs = [
        { id: 'paren', label: '括號', start: '（', end: '）', type: 'inline', matchMode: 'enclosure' }
      ];
      const ast = buildAST(input, configs);
      
      const dialogue = ast.children.find(n => n.type === 'dialogue');
      assert.ok(dialogue);
      assert.ok(dialogue.children.length > 0);
    });
  });

  describe('Action Detection', () => {
    it('should detect action when no character context', () => {
      const input = '門外傳來腳步聲';
      const ast = buildAST(input);
      
      const action = ast.children.find(n => n.type === 'action');
      assert.ok(action);
      assert.strictEqual(action.content, '門外傳來腳步聲');
    });
  });

  describe('Real World Examples', () => {
    it('should correctly parse file1 style script', () => {
      const input = `01. 被姊姊系女友當成狗？

#SE 門外的鑰匙聲
@ 聲音稍遠
蒨伶
（注意到了什麼）嗯？

啊、你今天比較早回來啊`;

      const configs = [
        { id: 'se', label: '效果音', start: '#SE', matchMode: 'prefix', isBlock: true },
        { id: 'pos', label: '位置', start: '@', matchMode: 'prefix', isBlock: true }
      ];
      
      const ast = buildAST(input, configs);
      
      // 檢查有章節
      assert.ok(ast.children.some(n => n.type === 'chapter'));
      // 檢查有 #SE 標記
      assert.ok(ast.children.some(n => n.type === 'marker' && n.markerId === 'se'));
      // 檢查有 @ 標記
      assert.ok(ast.children.some(n => n.type === 'marker' && n.markerId === 'pos'));
      // 檢查有角色
      assert.ok(ast.children.some(n => n.type === 'character'));
    });
  });

  describe('toFountain Export', () => {
    it('should export to Fountain format', () => {
      const input = `蒨伶
這是對話`;
      
      const builder = new DirectASTBuilder([]);
      const ast = builder.parse(input);
      const fountain = builder.toFountain(ast);
      
      // 角色名應該大寫
      assert.ok(fountain.includes('蒨伶'.toUpperCase()));
      // 對話應該存在
      assert.ok(fountain.includes('這是對話'));
    });
  });
});
