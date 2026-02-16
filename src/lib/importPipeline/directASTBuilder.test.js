/**
 * DirectASTBuilder 單元測試（純 Marker 模式）
 */

import { describe, it } from 'vitest';
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

    it('should prefer higher priority over longer start', () => {
      const input = '<t> 場景';
      const configs = [
        { id: 'short-high', start: '<', matchMode: 'prefix', isBlock: true, priority: 1000 },
        { id: 'long-low', start: '<t>', matchMode: 'prefix', isBlock: true, priority: 10 }
      ];
      const ast = buildAST(input, configs);

      const layer = ast.children.find(n => n.type === 'layer');
      assert.strictEqual(layer.layerType, 'short-high');
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

    it('should treat type=block as block even when isBlock is missing', () => {
      const input = '<t> 場景標記';
      const configs = [
        { id: 'env-tag', label: '場景', start: '<t>', type: 'block', matchMode: 'prefix' }
      ];
      const ast = buildAST(input, configs);
      const layer = ast.children.find(n => n.type === 'layer');
      assert.ok(layer, 'Should parse as layer block');
      assert.strictEqual(layer.layerType, 'env-tag');
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

    it('should keep prefix inline markers as inline (not layer)', () => {
      const input = '/sfx 門外的腳步聲';
      const configs = [
        { id: 'sfx', label: '一般音效', start: '/sfx', type: 'inline', matchMode: 'prefix', isBlock: false }
      ];
      const ast = buildAST(input, configs);

      const layer = ast.children.find(n => n.type === 'layer');
      assert.ok(!layer, 'Inline prefix marker should not be parsed as layer');

      const action = ast.children.find(n => n.type === 'action');
      assert.ok(action, 'Should remain action node');
      assert.ok(Array.isArray(action.inline), 'Action node should contain inline nodes');
      assert.ok(action.inline.some(n => n.type === 'highlight' && n.id === 'sfx'));
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

  describe('Range Mode (區間模式 - 巢狀結構)', () => {
    // 新格式：單一設定同時定義 start 和 end
    const rangeConfigs = [
      { 
        id: 'se-continuous', 
        label: '持續音效', 
        start: '>>SE', 
        end: '<<SE',
        isBlock: true, 
        matchMode: 'range',
        style: { backgroundColor: 'rgba(21, 101, 192, 0.08)' }
      }
    ];

    it('should detect range start and end markers as nested range node', () => {
      const input = '>>SE 背景音樂開始\n內容\n<<SE 背景音樂結束';
      const ast = buildAST(input, rangeConfigs);
      
      const rangeNode = ast.children.find(n => n.type === 'range');
      assert.ok(rangeNode, 'Should create range node');
      assert.strictEqual(rangeNode.rangeGroupId, 'se-continuous');
      
      // Check start node
      assert.ok(rangeNode.startNode, 'Should have start node');
      assert.strictEqual(rangeNode.startNode.layerType, 'se-continuous');
      assert.strictEqual(rangeNode.startNode.rangeRole, 'start');
      
      // Check end node
      assert.ok(rangeNode.endNode, 'Should have end node');
      assert.strictEqual(rangeNode.endNode.layerType, 'se-continuous');
      assert.strictEqual(rangeNode.endNode.rangeRole, 'end');
    });

    it('should contain content nodes inside range node children', () => {
      const input = `>>SE 背景音樂開始
角色A：對話內容
這是動作描述
<<SE 背景音樂結束`;
      const ast = buildAST(input, rangeConfigs);
      
      const rangeNode = ast.children.find(n => n.type === 'range');
      assert.ok(rangeNode, 'Should find range node');
      
      // 內容應該在 rangeNode.children
      assert.strictEqual(rangeNode.children.length, 2, 'Should have 2 nodes in range children');
      
      // 內容節點仍應保留 inRange 屬性 (由 _parseLine 加入，方便 renderer 參考)
      const actionNode = rangeNode.children.find(n => n.type === 'action');
      assert.ok(actionNode.inRange && actionNode.inRange.includes('se-continuous'), 'Nodes should strictly have inRange property');
    });

    it('should handle nested ranges (recursive)', () => {
      const input = `>>SE L1開始
>>SE L2開始
L2內容
<<SE L2結束
<<SE L1結束`;
      const ast = buildAST(input, rangeConfigs);
      
      // 外層 Range
      const outerRange = ast.children.find(n => n.type === 'range');
      assert.ok(outerRange, 'Should find outer range');
      assert.strictEqual(outerRange.rangeDepth, 1);
      
      // 內層 Range (應在 outerRange.children 中)
      const innerRange = outerRange.children.find(n => n.type === 'range');
      assert.ok(innerRange, 'Should find inner nested range');
      assert.strictEqual(innerRange.rangeDepth, 2);
      
      // 內容在內層
      const content = innerRange.children.find(n => n.text === 'L2內容');
      assert.ok(content, 'Should find content inside inner range');
    });

    it('should handle pause and resume in range', () => {
      const pauseConfigs = [
        { 
          id: 'se-pause', 
          start: '>>SE', 
          end: '<<SE',
          pause: '><SE',
          isBlock: true, 
          matchMode: 'range',
        }
      ];
      const input = `>>SE Start
Content 1
><SE Pause
Gap Content
><SE Resume
Content 2
<<SE End`;

      const ast = buildAST(input, pauseConfigs);
      
      // 應該有兩個 range 節點 (因為被 Pause 切斷了)
      const ranges = ast.children.filter(n => n.type === 'range');
      assert.strictEqual(ranges.length, 2, 'Should have 2 range segments');
      
      // 第一個段落
      const r1 = ranges[0];
      assert.strictEqual(r1.startNode.text, 'Start');
      assert.strictEqual(r1.endNode.text, 'Pause'); // Pause acts as end of segment 1
      assert.strictEqual(r1.endNode.rangeRole, 'pause');
      assert.strictEqual(r1.children.length, 1);
      assert.strictEqual(r1.children[0].text, 'Content 1');
      
      // Gap Content 應該在 root
      const gap = ast.children.find(n => n.text === 'Gap Content');
      assert.ok(gap, 'Gap content should be in root');
      assert.strictEqual(gap.type, 'action'); // or whatever default is
      
      // 第二個段落
      const r2 = ranges[1];
      assert.strictEqual(r2.startNode.text, 'Resume'); // Pause acts as start of segment 2
      assert.strictEqual(r2.startNode.rangeRole, 'pause');
      assert.strictEqual(r2.endNode.text, 'End');
      assert.strictEqual(r2.children.length, 1);
      assert.strictEqual(r2.children[0].text, 'Content 2');
    });

    it('should handle multiple different range groups', () => {
      const multiConfigs = [
        ...rangeConfigs,
        { id: 'bg', label: '背景', start: '//BG', end: '//BG-END', matchMode: 'range', isBlock: true, style: { borderLeft: '2px solid green' } }
      ];
      
      const input = `>>SE 音效開始
//BG 背景開始
兩個區間都有的內容
//BG-END
<<SE`;
      const ast = buildAST(input, multiConfigs);
      
      // 外層 Range (se-continuous)
      const outerRange = ast.children.find(n => n.type === 'range' && n.rangeGroupId === 'se-continuous');
      assert.ok(outerRange, 'Should find outer range');
      
      // 內層 Range (bg)
      const innerRange = outerRange.children.find(n => n.type === 'range' && n.rangeGroupId === 'bg');
      assert.ok(innerRange, 'Should find inner range nested inside outer');
      
      // 內容節點應該在內層 range 中
      const content = innerRange.children.find(n => n.text === '兩個區間都有的內容');
      assert.ok(content, 'Should find content inside inner range');
    });
  });

  describe('Prefix Block Markers', () => {
    it('should parse prefix block marker like <t>', () => {
      const configs = [
        {
          id: 'env-tag',
          label: '場景',
          type: 'block',
          matchMode: 'prefix',
          start: '<t>',
          isBlock: true,
          style: { color: 'red' },
          showEndLabel: false
        }
      ];
      
      const input = '<t> 街道上的場景';
      const ast = buildAST(input, configs);
      
      const layer = ast.children.find(n => n.type === 'layer');
      assert.ok(layer, 'Should find layer node');
      assert.strictEqual(layer.layerType, 'env-tag');
      
      // InlineLabel 應該包含內容
      assert.ok(layer.inlineLabel && layer.inlineLabel.length > 0);
      assert.strictEqual(layer.inlineLabel[0].content, '街道上的場景');
      
      // Children 應該為空（單行 prefix）
      assert.strictEqual(layer.children.length, 0);
    });

    it('should parse block enclosure marker like <s>...</s>', () => {
      const configs = [
        {
          id: 'section',
          label: 'section',
          type: 'block',
          matchMode: 'enclosure',
          start: '<s>',
          end: '</s>',
          isBlock: true
        }
      ];
      
      const input = '<s> Section Title </s>';
      const ast = buildAST(input, configs);
      
      const layer = ast.children.find(n => n.type === 'layer');
      assert.ok(layer, 'Should find layer node');
      assert.strictEqual(layer.layerType, 'section');
      
      // Content 解析
      assert.strictEqual(layer.inlineLabel[0].content, 'Section Title');
    });

    it('should parse fullwidth markers', () => {
       const configs = [
        {
          id: 'note',
          label: 'note',
          type: 'inline',
          matchMode: 'enclosure', // inline logic handled by parsing content inside action
          start: '(',
          end: ')'
        },
        {
          id: 'prefix-block',
          matchMode: 'prefix',
          isBlock: true,
          start: '<t>'
        }
      ];

      // To test Inline, we rely on _parseInlineContent which uses inlineParser
      // To test Block, we use DirectASTBuilder logic
      
      const input = '＜t＞ Title\nAction line with （note） inside.';
      const ast = buildAST(input, configs);
      
      // Check Block Fullwidth
      const blockLayer = ast.children[0];
      assert.strictEqual(blockLayer.type, 'layer');
      assert.strictEqual(blockLayer.layerType, 'prefix-block');
      assert.strictEqual(blockLayer.text, 'Title'); // Removed fullwidth marker

      const actionNode = ast.children[1];
      assert.strictEqual(actionNode.type, 'action');
      
      // Check Inline Fullwidth
      // ast.inline for action node
      assert.ok(actionNode.inline && actionNode.inline.length > 0);
      const highlight = actionNode.inline.find(n => n.type === 'highlight' && n.id === 'note');
      assert.ok(highlight, 'Should find highlight node for fullwidth note');
      assert.strictEqual(highlight.content, 'note');
    });
  });
});
