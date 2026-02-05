import { Metric } from '../ScriptAnalyzer.js';

export class CharacterAndDurationMetric extends Metric {
  constructor(options = {}) {
    super();
    // Default: 200 chars/min for dialogue, 300 chars/min for action (reading speed)
    this.wpm = {
        dialogue: options.dialogueSpeed || 200,
        action: options.actionSpeed || 300 
    };
    this.reset();
  }

  reset() {
    this.dialogueByChar = {}; // { Name: [lines...] }
  }

  onNode(node, context) {
    if (node.type === 'speech') {
      const charName = (node.character || "UNKNOWN").trim();
      
      let speechText = this.getText(node).trim();
      if ((!speechText && node.children) || (node.children && node.children.length > 0)) {
          speechText = node.children
            .filter(c => c.type !== 'parenthetical' && c.type !== 'character') 
            .map(c => this.getText(c))
            .join(' ')
            .trim();
      }

      if (speechText) {
        if (!this.dialogueByChar[charName]) {
          this.dialogueByChar[charName] = [];
        }
        this.dialogueByChar[charName].push(speechText);
      }
    } else if (node.type === 'character') {
        this.currentCharacterName = (node.text || "UNKNOWN").trim();
    } else if (node.type === 'dialogue') {
         if (this.currentCharacterName) {
             const speechText = this.getText(node).trim();
             if (speechText) {
                if (!this.dialogueByChar[this.currentCharacterName]) {
                  this.dialogueByChar[this.currentCharacterName] = [];
                }
                this.dialogueByChar[this.currentCharacterName].push(speechText);
             }
         }
    }
  }

  getResult() {
    // 1. Process Character Stats
    const characterStats = Object.entries(this.dialogueByChar).map(([name, lines]) => ({
      name,
      count: lines.length,
      percentage: 0 
    })).sort((a, b) => b.count - a.count);

    const totalLines = characterStats.reduce((sum, c) => sum + c.count, 0);
    if (totalLines > 0) {
      characterStats.forEach(c => c.percentage = Math.round((c.count / totalLines) * 100));
    }

    // 2. Duration is usually dependent on BasicStats (counts). 
    // Ideally this should receive the result of BasicStats or track chars itself.
    // For simplicity, let's rely on the calling Analyzer merging results, OR duplicate counting here?
    // Let's implement duration logic based on character lines (dialogue) here if we tracked lengths.
    // Actually, `BasicStatsMetric` calculates the totals. 
    // Better design: Duration calculation might need data from BasicStats. 
    // Or we provide a "PostProcess" step in Analyzer?
    // For now, let's just return Character Stats here. 
    // I entered "AndDuration" in class name, let's stick to Duration logic in `BasicStats` or separate.
    // Actually, I'll calculate Duration in the Index facade using the counts, OR make a simple duration estimator here.
    
    return {
      characterStats,
      sentences: {
          dialogue: this.dialogueByChar
      }
    };
  }
}
