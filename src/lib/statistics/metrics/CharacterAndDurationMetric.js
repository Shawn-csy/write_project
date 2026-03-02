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
    this.sceneSetByChar = {}; // { Name: Set(sceneId) }
    this.currentCharacterName = null;
    this.currentSceneId = null;
  }

  onNode(node, context) {
    if (node.type === 'scene_heading') {
      this.currentSceneId = (node.id || node.text || `scene-${node.lineStart || ""}`).toString();
      return;
    }

    const touchCharacterScene = (charName) => {
      if (!charName) return;
      if (!this.sceneSetByChar[charName]) {
        this.sceneSetByChar[charName] = new Set();
      }
      if (this.currentSceneId) {
        this.sceneSetByChar[charName].add(this.currentSceneId);
      }
    };

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
        touchCharacterScene(charName);
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
                touchCharacterScene(this.currentCharacterName);
             }
         }
    }
  }

  getResult() {
    // 1. Process Character Stats
    const characterStats = Object.entries(this.dialogueByChar).map(([name, lines]) => {
      const lineCount = lines.length;
      const wordCount = lines.join('').length;
      const speakingScenesCount = this.sceneSetByChar[name]?.size || 0;
      return {
        name,
        count: lineCount, // backward compatibility
        lineCount,
        wordCount,
        speakingScenesCount,
        percentage: 0
      };
    }).sort((a, b) => b.lineCount - a.lineCount);

    const totalLines = characterStats.reduce((sum, c) => sum + c.lineCount, 0);
    if (totalLines > 0) {
      characterStats.forEach(c => c.percentage = Math.round((c.lineCount / totalLines) * 100));
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
      dialogueByCharacter: this.dialogueByChar
    };
  }
}
