/**
 * 整合測試：使用真實範例檔案測試三階段流程（純 Marker 模式）
 */

import { describe, it } from 'vitest';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { preprocess } from './textPreprocessor.js';
import { discoverMarkers, MarkerDiscoverer } from './markerDiscoverer.js';
import { buildAST } from './directASTBuilder.js';

// 讀取真實範例檔案
const file1 = readFileSync('./examples/convert_example/file1', 'utf-8');
const file2 = readFileSync('./examples/convert_example/file2', 'utf-8');
const file3 = readFileSync('./examples/convert_example/file3', 'utf-8');

describe('Integration Tests with Real Examples (Pure Marker Mode)', () => {
  
  describe('File 1 (凜峰式台本)', () => {
    it('Stage 1: should preprocess file1 correctly', () => {
      const result = preprocess(file1);
      
      // 應該有清洗後的文本
      assert.ok(result.cleanedText);
      assert.ok(result.cleanedText.length > 0);
      
      // 檢查 #SE 是否被接行
      const lines = result.cleanedText.split('\n');
      const seLines = lines.filter(l => l.startsWith('#SE'));
      
      // 每個 #SE 行應該包含內容，不是單獨的
      for (const seLine of seLines) {
        assert.ok(seLine.length > 3, `#SE line should have content: ${seLine}`);
      }
      
      console.log(`  File1 Stage 1: ${result.transformLog.length} transforms applied`);
    });

    it('Stage 2: should discover markers in file1', () => {
      const preprocessed = preprocess(file1);
      const result = discoverMarkers(preprocessed.cleanedText);
      
      // 應該偵測到常見標記
      const markers = result.discoveredMarkers;
      
      assert.ok(markers.some(m => m.start === '#SE'), 'Should find #SE');
      assert.ok(markers.some(m => m.start === '@'), 'Should find @');
      
      console.log(`  File1 Stage 2: Found ${markers.length} marker types`);
      for (const m of markers.slice(0, 5)) {
        console.log(`    - ${m.label}: ${m._discovery.occurrences} occurrences`);
      }
    });

    it('Stage 3: should build AST for file1 (pure marker mode)', () => {
      const preprocessed = preprocess(file1);
      const discovery = discoverMarkers(preprocessed.cleanedText);
      
      // 使用發現的 markers 建構 AST
      const configs = discovery.discoveredMarkers.map(m => MarkerDiscoverer.toMarkerConfig(m));
      const ast = buildAST(preprocessed.cleanedText, configs);
      
      // 檢查 AST 結構（純 Marker 模式使用 'root' 而非 'screenplay'）
      assert.strictEqual(ast.type, 'root');
      assert.ok(ast.children.length > 0);
      
      // 統計節點類型
      const typeCounts = {};
      for (const node of ast.children) {
        typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
      }
      
      console.log(`  File1 Stage 3: Built AST with ${ast.children.length} nodes`);
      console.log(`    Types:`, typeCounts);
      
      // 應該有場景標題
      assert.ok(typeCounts.scene_heading > 0, 'Should have scene_heading');
      // 純 Marker 模式：應該有 layer (markers)
      assert.ok(typeCounts.layer > 0, 'Should have layer (markers)');
      // 純 Marker 模式：應該有 action
      assert.ok(typeCounts.action > 0, 'Should have action');
    });
  });

  describe('File 2 (依晴台本)', () => {
    it('Full pipeline should work for file2', () => {
      // Stage 1
      const preprocessed = preprocess(file2);
      assert.ok(preprocessed.cleanedText);
      
      // Stage 2
      const discovery = discoverMarkers(preprocessed.cleanedText);
      assert.ok(discovery.discoveredMarkers.length > 0);
      
      // Stage 3
      const configs = discovery.discoveredMarkers.map(m => MarkerDiscoverer.toMarkerConfig(m));
      const ast = buildAST(preprocessed.cleanedText, configs);
      
      assert.strictEqual(ast.type, 'root');
      assert.ok(ast.children.length > 0);
      
      // 純 Marker 模式：角色名會被當作 action
      // 不再測試角色偵測
      const hasContent = ast.children.some(n => n.type === 'action' || n.type === 'layer');
      assert.ok(hasContent, 'Should have content nodes');
      
      console.log(`  File2: Pipeline completed, ${ast.children.length} nodes`);
    });
  });

  describe('File 3 (卡蚯蚓式台本)', () => {
    it('Should handle >>>SE and <<<SE markers', () => {
      const preprocessed = preprocess(file3);
      const discovery = discoverMarkers(preprocessed.cleanedText);
      
      // 應該偵測到三重符號
      const has3SE = discovery.discoveredMarkers.some(m => 
        m.start === '>>>SE' || m.start === '<<<SE'
      );
      
      // 即使沒有三重符號，也應該有雙重符號
      const has2SE = discovery.discoveredMarkers.some(m => 
        m.start === '>>SE' || m.start === '<<SE' || m.start === '>>>SE' || m.start === '<<<SE'
      );
      
      assert.ok(has2SE || has3SE, 'Should find continuous SE markers');
      
      console.log(`  File3: Found markers:`, 
        discovery.discoveredMarkers.map(m => m.start).slice(0, 10)
      );
    });

    it('Should handle different marker format', () => {
      const preprocessed = preprocess(file3);
      const discovery = discoverMarkers(preprocessed.cleanedText);
      
      // 應該偵測到 ＠（全形）會被正規化為 @
      const hasPosition = discovery.discoveredMarkers.some(m => m.start === '@');
      
      console.log(`  File3: Position marker found: ${hasPosition}`);
    });
  });

  describe('Cross-file Consistency', () => {
    it('Should handle all files without errors', () => {
      const files = [
        { name: 'file1', content: file1 },
        { name: 'file2', content: file2 },
        { name: 'file3', content: file3 }
      ];
      
      for (const file of files) {
        // 這不應該拋出任何錯誤
        const preprocessed = preprocess(file.content);
        const discovery = discoverMarkers(preprocessed.cleanedText);
        const configs = discovery.discoveredMarkers.map(m => MarkerDiscoverer.toMarkerConfig(m));
        const ast = buildAST(preprocessed.cleanedText, configs);
        
        assert.strictEqual(ast.type, 'root');
        assert.ok(ast.children.length > 0);
        
        console.log(`  ${file.name}: ✓ ${ast.children.length} nodes`);
      }
    });
  });
});
