/**
 * MarkerDiscoverer 單元測試
 */

import { describe, it } from 'vitest';
import assert from 'node:assert';
import { MarkerDiscoverer, discoverMarkers } from './markerDiscoverer.js';
import { defaultMarkerConfigs } from '../../constants/defaultMarkers.js';

describe('MarkerDiscoverer', () => {
  
  describe('Prefix Pattern Discovery', () => {
    it('should discover #SE pattern', () => {
      const input = `#SE 門外的鑰匙聲
#SE 用鑰匙開鎖的聲音
#SE 開門聲與關門聲
普通文字`;
      
      const result = discoverMarkers(input);
      
      const seMarker = result.discoveredMarkers.find(m => m.start === '#SE');
      assert.ok(seMarker, 'Should discover #SE pattern');
      assert.strictEqual(seMarker._discovery.occurrences, 3);
      assert.ok(seMarker._discovery.confidence >= 0.6);
    });

    it('should discover @ position pattern', () => {
      const input = `@ 聲音稍遠
@ 前方近處
普通文字
@ 左耳近處`;
      
      const result = discoverMarkers(input);
      
      const posMarker = result.discoveredMarkers.find(m => m.start === '@');
      assert.ok(posMarker, 'Should discover @ pattern');
      assert.strictEqual(posMarker._discovery.occurrences, 3);
    });

    it('should discover >>SE continuous pattern', () => {
      const input = `>>SE 撫摸頭髮聲
普通文字
>>SE 掏耳聲`;
      
      const result = discoverMarkers(input);
      
      const seMarker = result.discoveredMarkers.find(m => m.start === '>>SE');
      assert.ok(seMarker, 'Should discover >>SE pattern');
    });

    it('should discover >>>SE continuous pattern', () => {
      const input = `>>>SE 舌吻的聲音
普通文字
>>>SE 另一個音效`;
      
      const result = discoverMarkers(input);
      
      const seMarker = result.discoveredMarkers.find(m => m.start === '>>>SE');
      assert.ok(seMarker, 'Should discover >>>SE pattern');
    });

    it('should discover //BG pattern', () => {
      const input = `//BG 背景音開始
普通文字
//BGM 背景音樂開始`;
      
      const result = discoverMarkers(input);
      
      assert.ok(result.discoveredMarkers.some(m => m.start === '//BG'));
      assert.ok(result.discoveredMarkers.some(m => m.start === '//BGM'));
    });

    it('should have higher confidence for more occurrences', () => {
      const fewOccurrences = discoverMarkers(`#SE 音效1\n#SE 音效2`);
      const manyOccurrences = discoverMarkers(`#SE 1\n#SE 2\n#SE 3\n#SE 4\n#SE 5\n#SE 6\n#SE 7\n#SE 8\n#SE 9\n#SE 10\n#SE 11`);
      
      const fewMarker = fewOccurrences.discoveredMarkers.find(m => m.start === '#SE');
      const manyMarker = manyOccurrences.discoveredMarkers.find(m => m.start === '#SE');
      
      assert.ok(manyMarker._discovery.confidence > fewMarker._discovery.confidence);
    });
  });

  describe('Enclosure Pattern Discovery', () => {
    it('should discover fullwidth parentheses', () => {
      const input = `（輕笑）這是對話
（注意到了什麼）嗯？
（帶苦笑）說什麼啊
普通文字`;
      
      const result = discoverMarkers(input);
      
      const parenMarker = result.discoveredMarkers.find(m => m.start === '（');
      assert.ok(parenMarker, 'Should discover （...） pattern');
      assert.strictEqual(parenMarker._discovery.occurrences, 3);
    });

    it('should discover double braces', () => {
      const input = `{{音效1}} 說明
普通文字
{{音效2}} 另一個`;
      
      const result = discoverMarkers(input);
      
      const braceMarker = result.discoveredMarkers.find(m => m.start === '{{');
      assert.ok(braceMarker, 'Should discover {{...}} pattern');
    });

    it('should collect examples', () => {
      const input = `（輕笑）
（帶苦笑）
（感動）`;
      
      const result = discoverMarkers(input);
      
      const parenMarker = result.discoveredMarkers.find(m => m.start === '（');
      assert.ok(parenMarker._discovery.examples.length > 0);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflict with existing marker configs', () => {
      const input = `（輕笑）這是對話
（注意到了什麼）嗯？
（帶苦笑）說什麼啊
（感動）開心`;
      
      // 建立一個會與全形括號衝突的 existing config
      const existingConfigs = [
        { id: 'paren', label: '全形括號', start: '（', end: '）', type: 'enclosure' }
      ];
      
      const result = discoverMarkers(input, existingConfigs);
      
      // 應該偵測到與 'paren' 規則的衝突
      const hasParenConflict = result.conflicts.some(c => 
        c.discoveredPattern.includes('（') || c.existingRule === 'paren'
      );
      assert.ok(hasParenConflict, 'Should detect conflict with existing paren rule');
    });

    it('should not report conflict when no existing rules match', () => {
      const input = `#SE 音效
#SE 另一個`;
      
      // 空的 existing configs
      const result = discoverMarkers(input, []);
      
      assert.strictEqual(result.conflicts.length, 0);
    });
  });

  describe('Ambiguity Detection', () => {
    it('should detect unknown patterns', () => {
      const input = `***特殊標記1
***特殊標記2
普通文字`;
      
      const result = discoverMarkers(input);
      
      // 應該有模糊項目
      assert.ok(result.ambiguities.some(a => a.pattern === '***'));
    });
  });

  describe('Output Format', () => {
    it('should output markerConfig compatible format', () => {
      const input = `#SE 音效1
#SE 音效2
#SE 音效3`;
      
      const result = discoverMarkers(input);
      const seMarker = result.discoveredMarkers.find(m => m.start === '#SE');
      
      // 驗證輸出格式符合 markerConfig
      assert.ok('id' in seMarker);
      assert.ok('label' in seMarker);
      assert.ok('start' in seMarker);
      assert.ok('end' in seMarker);
      assert.ok('isBlock' in seMarker);
      assert.ok('type' in seMarker);
      assert.ok('matchMode' in seMarker);
      assert.ok('style' in seMarker);
    });

    it('should convert to clean markerConfig', () => {
      const input = `#SE 音效1
#SE 音效2
#SE 音效3`;
      
      const result = discoverMarkers(input);
      const seMarker = result.discoveredMarkers.find(m => m.start === '#SE');
      
      const config = MarkerDiscoverer.toMarkerConfig(seMarker);
      
      // 應該移除 _discovery
      assert.ok(!('_discovery' in config));
      // 應該清理 id
      assert.ok(!config.id.startsWith('discovered_'));
    });
  });

  describe('Real World Examples', () => {
    it('should correctly analyze file1 style markers', () => {
      const input = `#SE
門外的鑰匙聲
@
聲音稍遠
蒨伶
（注意到了什麼）嗯？
>>SE
撫摸頭髮聲
<<SE
撫摸頭髮聲結束`;
      
      const result = discoverMarkers(input);
      
      // 應該偵測到所有主要標記
      assert.ok(result.discoveredMarkers.some(m => m.start === '#SE'));
      assert.ok(result.discoveredMarkers.some(m => m.start === '@'));
    });

    it('should correctly analyze file3 style markers', () => {
      const input = `>>>SE
舌吻的聲音（用親吻耳朵代替）持續５分鐘
<<<SE
舌吻的聲音結束
//BGM
背景音樂開頭
\\\\BGM
背景音樂結束`;
      
      const result = discoverMarkers(input);
      
      // 應該偵測到三重符號的標記
      assert.ok(result.discoveredMarkers.some(m => m.start === '>>>SE'));
      assert.ok(result.discoveredMarkers.some(m => m.start === '<<<SE'));
    });
  });
});
