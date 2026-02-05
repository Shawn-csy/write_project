import { Metric } from '../ScriptAnalyzer.js';

export class BasicStatsMetric extends Metric {
  constructor(options = {}) {
    super();
    this.options = options;
    this.reset();
  }

  reset() {
    this.counts = {
      scenes: 0,
      nodes: 0,
      dialogueChars: 0,
      actionChars: 0,
      totalChars: 0,
      dialogueLines: 0
    };
    this.locations = [];
    this.actionLines = []; // New collection
    this.timeframeDistribution = { INT: 0, EXT: 0, OTHER: 0 };
  }

  onNode(node, context) {
    this.counts.nodes++;

    const text = this.getText(node).trim();

    switch (node.type) {
      case 'scene_heading':
        this.counts.scenes++;
        this.locations.push(text);
        
        const upper = text.toUpperCase();
        if (upper.startsWith('INT') || upper.includes('INT.')) this.timeframeDistribution.INT++;
        else if (upper.startsWith('EXT') || upper.includes('EXT.')) this.timeframeDistribution.EXT++;
        else this.timeframeDistribution.OTHER++;
        
        this.counts.totalChars += text.length;
        break;

      case 'action':
        if (text) {
          const len = text.replace(/\s/g, '').length;
          this.counts.actionChars += len;
          this.counts.totalChars += len; 
          this.actionLines.push(text); // Collect content
        }
        break;

      case 'speech':
        // Determine speech text (handle dual dialogue or simple children if any)
        let speechText = text;
        if ((!speechText && node.children) || (node.children && node.children.length > 0)) {
            speechText = node.children
              .filter(c => c.type !== 'parenthetical' && c.type !== 'character') 
              .map(c => this.getText(c))
              .join(' ')
              .trim();
        }

        if (speechText) {
          this.counts.dialogueLines++;
          const len = speechText.replace(/\s/g, '').length;
          this.counts.dialogueChars += len;
          this.counts.totalChars += len;
        }
        break;

      case 'dialogue': // Fallback for flat AST
        const dlgText = text;
        if (dlgText) {
          this.counts.dialogueLines++;
          const len = dlgText.replace(/\s/g, '').length;
          this.counts.dialogueChars += len;
          this.counts.totalChars += len;
        }
        break;
    }
  }

  getResult() {
    return {
      counts: this.counts,
      counts: this.counts,
      locations: this.locations,
      actionLines: this.actionLines, // Return Collected Lines
      timeframeDistribution: this.timeframeDistribution,
      // Calculate Ratios here
      dialogueRatio: this.counts.totalChars ? Math.round((this.counts.dialogueChars / this.counts.totalChars) * 100) : 0,
      actionRatio: this.counts.totalChars ? Math.round((this.counts.actionChars / this.counts.totalChars) * 100) : 0
    };
  }
}
