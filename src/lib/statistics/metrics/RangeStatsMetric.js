import { Metric } from '../ScriptAnalyzer.js';

/**
 * 統計 Range 區間相關數據
 * - 每個 rangeGroupId 的出現次數
 * - 區間內的節點數量
 * - 區間內的字數
 */
export class RangeStatsMetric extends Metric {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    // rangeStats: { groupId: { count, nodesInRange, charsInRange, dialogueChars, actionChars } }
    this.rangeStats = {};
    // 追蹤區間開始/結束
    this.activeRangeStarts = {}; // { groupId: startCount }
  }

  onNode(node, context) {
    // 處理 range 開始/結束標記
    if (node.rangeRole === 'start' && node.rangeGroupId) {
      const groupId = node.rangeGroupId;
      if (!this.rangeStats[groupId]) {
        this.rangeStats[groupId] = {
          count: 0,
          nodesInRange: 0,
          charsInRange: 0,
          dialogueChars: 0,
          actionChars: 0
        };
      }
      this.rangeStats[groupId].count++;
    }

    // 處理區間內的節點
    if (node.inRange && Array.isArray(node.inRange)) {
      const text = this.getText(node).trim();
      const charCount = text.replace(/\s/g, '').length;

      for (const groupId of node.inRange) {
        if (!this.rangeStats[groupId]) {
          this.rangeStats[groupId] = {
            count: 0,
            nodesInRange: 0,
            charsInRange: 0,
            dialogueChars: 0,
            actionChars: 0
          };
        }
        
        this.rangeStats[groupId].nodesInRange++;
        this.rangeStats[groupId].charsInRange += charCount;

        // 區分對話和動作
        if (node.type === 'speech' || node.type === 'dialogue') {
          this.rangeStats[groupId].dialogueChars += charCount;
        } else if (node.type === 'action') {
          this.rangeStats[groupId].actionChars += charCount;
        }
      }
    }
  }

  getResult() {
    return {
      rangeStats: this.rangeStats
    };
  }
}
