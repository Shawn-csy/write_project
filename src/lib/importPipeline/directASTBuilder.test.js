/**
 * DirectASTBuilder 單元測試（純 Marker 模式）
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DirectASTBuilder, buildAST } from './directASTBuilder.js';

describe('DirectASTBuilder (Pure Marker Mode)', () => {
  
  describe('Basic AST Structure', () => {
    it('should create root node', () => {
      const input = '測試文本';
      const ast = buildAST(input);
      
      assert.strictEqual(ast.type, 'root');
      assert.ok(Array.isArray(ast.children));
    });

    it('should preserve line numbers', () => {
      const input = '第一行\n第二行\n第三行';
      const ast = buildAST(input);
      
      assert.strictEqual(ast.children[0].lineStart, 1);
      assert.strictEqual(ast.children[1].lineStart, 2);
      assert.strictEqual(ast.children[2].lineStart, 3);
    });
  });

  describe('Blank Line Handling', () => {
    it('should detect blank lines', () => {
      const input = '內容\n\n另一段';
      const ast = buildAST(input);
      
      const blank = ast.children.find(n => n.type === 'blank');
      assert.ok(blank);
    });
  });

  describe('Scene Heading Detection', () => {
    it('should detect numbered chapter format as scene_heading', () => {
      const input = '01. 被姊姊系女友當成狗？';
      const ast = buildAST(input);
      
      const scene = ast.children.find(n => n.type === 'scene_heading');
      assert.ok(scene, 'Should detect scene heading');
      assert.strictEqual(scene.number, 1);
      assert.ok(scene.id, 'Should have id');
    });

    it('should detect Chinese chapter format', () => {
      const input = '第一章 開場';
      const ast = buildAST(input);
      
      const scene = ast.children.find(n => n.type === 'scene_heading');
      assert.ok(scene);
      assert.strictEqual(scene.number, '一');
    });
  });

  describe('Pure Marker Mode - No Character Detection', () => {
    it('should NOT detect characters automatically (pure marker mode)', () => {
      const input = '蒨伶';
      const ast = buildAST(input);
      
      // 純 Marker 模式：所有非 marker 內容都是 action
      const action = ast.children.find(n => n.type === 'action');
      assert.ok(action, 'Should be action in pure marker mode');
      assert.strictEqual(action.text, '蒨伶');
    });

    it('should NOT detect dialogue automatically', () => {
      const input = `蒨伶
這是我說的話`;
      const ast = buildAST(input);
      
      // 純 Marker 模式：所有都是 action
      const actions = ast.children.filter(n => n.type === 'action');
      assert.strictEqual(actions.length, 2);
    });
  });

  describe('Marker Detection (Layer)', () => {
    it('should detect prefix markers as layer', () => {
      const input = '#SE 門外的鑰匙聲';
      const configs = [
        { id: 'se', label: '效果音', start: '#SE', matchMode: 'prefix', isBlock: true }
      ];
      const ast = buildAST(input, configs);
      
      const layer = ast.children.find(n => n.type === 'layer');
      assert.ok(layer, 'Should detect layer');
      assert.strictEqual(layer.layerType, 'se');
      assert.strictEqual(layer.text, '門外的鑰匙聲');
    });

    it('should detect position markers', () => {
      const input = '@ 聲音稍遠';
      const configs = [
        { id: 'pos', label: '位置', start: '@', matchMode: 'prefix', isBlock: true }
      ];
      const ast = buildAST(input, configs);
      
      const layer = ast.children.find(n => n.type === 'layer');
      assert.ok(layer);
      assert.strictEqual(layer.layerType, 'pos');
    });

    it('should prefer longer markers', () => {
      const input = '>>SE 持續音效';
      const configs = [
        { id: 'se', start: '>SE', matchMode: 'prefix', isBlock: true },
        { id: 'se_cont', start: '>>SE', matchMode: 'prefix', isBlock: true }
      ];
      const ast = buildAST(input, configs);
      
      const layer = ast.children.find(n => n.type === 'layer');
      assert.strictEqual(layer.layerType, 'se_cont');
    });

    it('should detect enclosure markers', () => {
      const input = '（▼整段指示）';
      const configs = [
        { id: 'block_dir', label: '區塊指示', start: '（▼', end: '）', matchMode: 'enclosure', isBlock: true }
      ];
      const ast = buildAST(input, configs);
      
      const layer = ast.children.find(n => n.type === 'layer');
      assert.ok(layer);
      assert.strictEqual(layer.text, '整段指示');
    });
  });

  describe('Inline Parsing', () => {
    it('should parse inline content in action', () => {
      const input = '門外傳來（敲門聲）回應';
      
      const configs = [
        { id: 'paren', label: '括號', start: '（', end: '）', type: 'inline', matchMode: 'enclosure' }
      ];
      const ast = buildAST(input, configs);
      
      const action = ast.children.find(n => n.type === 'action');
      assert.ok(action);
      assert.ok(action.inline.length > 0);
    });
  });

  describe('Action Detection', () => {
    it('should detect all non-marker content as action', () => {
      const input = '門外傳來腳步聲';
      const ast = buildAST(input);
      
      const action = ast.children.find(n => n.type === 'action');
      assert.ok(action);
      assert.strictEqual(action.text, '門外傳來腳步聲');
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
      
      // 檢查有場景標題
      assert.ok(ast.children.some(n => n.type === 'scene_heading'), 'Should have scene_heading');
      // 檢查有 #SE 標記 (layer)
      assert.ok(ast.children.some(n => n.type === 'layer' && n.layerType === 'se'), 'Should have SE layer');
      // 檢查有 @ 標記 (layer)
      assert.ok(ast.children.some(n => n.type === 'layer' && n.layerType === 'pos'), 'Should have pos layer');
      // 純 Marker 模式：角色名是 action
      assert.ok(ast.children.some(n => n.type === 'action' && n.text === '蒨伶'), 'Character should be action in pure marker mode');
    });
  });

  describe('Node Properties', () => {
    it('should have correct node structure', () => {
      const input = '測試內容';
      const ast = buildAST(input);
      const node = ast.children[0];

      // 檢查新格式的屬性
      assert.ok('lineStart' in node, 'Should have lineStart');
      assert.ok('lineEnd' in node, 'Should have lineEnd');
      assert.ok('text' in node, 'Should have text');
      assert.ok('inline' in node, 'Should have inline');
      assert.ok('raw' in node, 'Should have raw');
    });

    it('should have id for scene_heading', () => {
      const input = '01. 測試章節';
      const ast = buildAST(input);
      const scene = ast.children.find(n => n.type === 'scene_heading');

      assert.ok(scene.id, 'scene_heading should have id');
    });

    it('layer should have layerType and children', () => {
      const input = '#SE 音效';
      const configs = [
        { id: 'se', label: '效果音', start: '#SE', matchMode: 'prefix', isBlock: true }
      ];
      const ast = buildAST(input, configs);
      const layer = ast.children.find(n => n.type === 'layer');

      assert.ok('layerType' in layer, 'layer should have layerType');
      assert.ok('children' in layer, 'layer should have children array');
    });
  });
});
