import { Metric } from '../ScriptAnalyzer.js';

export class MarkerStatsMetric extends Metric {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.customLayers = {}; // { LayerName: [content...] }
    this.sfxLines = [];
    this.customDurationSeconds = 0;
    this.durationOverrideStack = []; // Stack to track if we are inside a range that already accounts for duration
  }

  _parseDurationFromText(text, statsConfig) {
      if (!text) return 0;
      let totalSeconds = 0;

      // Default keywords if no config
      const defaultUnits = [
          { factor: 1, keywords: ["s", "sec", "秒"] },
          { factor: 60, keywords: ["m", "min", "分", "分鐘"] }
      ];

      // Parse config keywords if available
      let units = defaultUnits;
      if (statsConfig && Array.isArray(statsConfig.customKeywords) && statsConfig.customKeywords.length > 0) {
          units = statsConfig.customKeywords.map(k => ({
              factor: k.factor,
              keywords: typeof k.keywords === 'string' ? k.keywords.split(',').map(s => s.trim()) : k.keywords
          }));
      }

      // Build Regex dynamically
      // Pattern: ? + number + unit
      // We join all keywords: (s|sec|...)
      const allKeywords = units.flatMap(u => u.keywords).filter(k => k).sort((a,b) => b.length - a.length); // Sort by length desc
      const unitPattern = allKeywords.join('|');
      
      // 1. Explicit Patterns (Number + Unit)
      //    Matches: "? 10s", "(10s)", "<10s>", "[10s]"
      const qPattern = new RegExp(`\\?\\s*(\\d*\\.?\\d+)\\s*(${unitPattern})`, 'gi');
      const textPattern = new RegExp(`[<\\[(\\s][\\s]*(?:約|approx)?\\s*(\\d*\\.?\\d+)\\s*(${unitPattern})\\s*[>\\])\\s]`, 'gi');

      // Helper to process and mask matches
      const processPattern = (pattern) => {
          let match;
          // We must loop on the original text but "mask" what we found in a separate buffer if we wanted to be pure,
          // but simpler is to use a temp string that we modify? No, modifying string messes up indices for subsequent regexes if length changes.
          // Better: Replace matched parts with spaces in a temp string used for subsequent steps.
      };

      // Actually, we can use 'replace' to both count and mask.
      let remainingText = text;

      // Pass 1: Handle Explicit Numbers (High Priority)
      // We replace matches with equal length spaces to preserve positions if needed, or just spaces.
      // Since we don't care about positions for the next passes (just existence), simple space replacement is fine.
      
      const parseAndMask = (pattern) => {
          remainingText = remainingText.replace(pattern, (match, valStr, unitStr) => {
              const value = parseFloat(valStr);
              const unitDef = units.find(u => u.keywords.some(k => k.toLowerCase() === unitStr.toLowerCase()));
              if (!isNaN(value) && unitDef) {
                  totalSeconds += value * unitDef.factor;
              }
              // Replace with spaces to avoid matching the keyword again in Pass 2
              return " ".repeat(match.length);
          });
      };

      parseAndMask(qPattern);
      parseAndMask(textPattern);

      // Pass 2: Handle Standalone Keywords (Implicit 1 Unit)
      // Iterate through ALL defined keywords.
      // If keyword is alphanumeric, use \b boundary. If symbol, literal match.
      
      // We need to check each unit definition
      units.forEach(u => {
          u.keywords.forEach(k => {
              if (!k) return;
              try {
                  const isAlpha = /^[a-zA-Z0-9]+$/.test(k);
                  // Escape regex special chars in keyword
                  const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  
                  // If Alpha, enforce word boundaries
                  // Also skip single-letter alpha keywords (like 's', 'm') to avoid high false positive rate in implicit mode
                  if (isAlpha && k.length < 2) return;
                  
                  const patternStr = isAlpha ? `\\b${escapedK}\\b` : escapedK;
                  
                  const re = new RegExp(patternStr, 'g');
                  
                  // Count matches in the remaining text
                  const matches = remainingText.match(re);
                  if (matches) {
                      totalSeconds += matches.length * u.factor; // Default to 1 * factor
                      // We don't need to mask anymore unless we have overlapping keywords (like "Time" and "TimeOut")
                      // But units loop order matters? User defined keywords usually exact.
                      // Ideally we should mask here too if we fear overlaps, but let's keep it simple for now.
                      // To be safe against "Time" matching "TimeOut" if boundaries ignored (but boundaries ARE handled).
                      
                      // Masking is safe practice if multiple keywords might overlap
                      remainingText = remainingText.replace(re, " ".repeat(k.length)); 
                  }
              } catch (e) {
                  // Ignore invalid regex
              }
          });
      });

      return totalSeconds;
  }

  _addDuration(seconds, statsConfig) {
      const shouldExclude = statsConfig?.excludeNestedDuration;
      // Only check stack if exclusion is enabled
      if (shouldExclude && this.durationOverrideStack.length > 0 && this.durationOverrideStack[this.durationOverrideStack.length - 1] === true) {
          return;
      }
      this.customDurationSeconds += seconds;
  }

  onNode(node, context) {
    const { markerConfigs, statsConfig } = context;

    if (node.type === 'layer') {
      const layerId = node.layerType; 
      const content = this._getRecursiveText(node);
      
      if (!this.customLayers[layerId]) {
        this.customLayers[layerId] = [];
      }
      if (content || node.rangeRole === 'start') {
          this.customLayers[layerId].push({
              text: content || (node.rangeRole === 'start' ? "(區間開始)" : ""),
              line: node.lineStart,
              type: 'block'
          });
          
          if (content) {
              this._addDuration(this._parseDurationFromText(content, statsConfig), statsConfig);
          }
      }

      // Fixed Duration
      const config = markerConfigs ? markerConfigs.find(c => c.id === layerId) : null;
      if (config && config.fixedDuration) {
          const duration = parseFloat(config.fixedDuration);
          if (!isNaN(duration)) {
              this._addDuration(duration, statsConfig);
          }
      }
    } 
    else if (node.type === 'range') {
        const layerId = node.layerType;
        const startNode = node.startNode;
        let rangeHasDuration = false;

        if (layerId && startNode) {
            if (!this.customLayers[layerId]) {
                this.customLayers[layerId] = [];
            }
            
            const content = this._getRecursiveText(startNode);
            this.customLayers[layerId].push({
                text: content || "(區間開始)",
                line: startNode.lineStart,
                type: 'block-range'
            });

            // Parse Duration from range content
            if (content) {
                const parsed = this._parseDurationFromText(content, statsConfig);
                if (parsed > 0) {
                    this._addDuration(parsed, statsConfig);
                    rangeHasDuration = true;
                }
            }

             // Fixed Duration check for the range marker itself
            const config = markerConfigs ? markerConfigs.find(c => c.id === layerId) : null;
            if (config && config.fixedDuration) {
                const duration = parseFloat(config.fixedDuration);
                if (!isNaN(duration)) {
                    this._addDuration(duration, statsConfig);
                    rangeHasDuration = true; // If fixed duration is set, we also treat it as having duration
                }
            }
        }
        
        // Push to stack: if this range has explicit duration, children should NOT add duration
        this.durationOverrideStack.push(rangeHasDuration);
    }
    else if (node.type === 'sfx') {
        const text = this.getText(node).trim();
        this.sfxLines.push(text);
        this._addDuration(this._parseDurationFromText(text, statsConfig), statsConfig);
    }
    // Added: Scan normal script content for duration keywords (e.g. "(ASMR)" in dialogue)
    else if (node.type === 'speech' || node.type === 'dialogue' || node.type === 'action') {
        let text = this.getText(node);
        // For speech, ensure we check the full line content if children exist
        if ((!text && node.children) || (node.children && node.children.length > 0)) {
             text = node.children
              .map(c => this.getText(c))
              .join(' ')
              .trim();
        }
        if (text) {
             this._addDuration(this._parseDurationFromText(text, statsConfig), statsConfig);
        }
    }

    // Process Inline Markers
    if (node.inline && Array.isArray(node.inline)) {
        node.inline.forEach(item => {
            if (item.type === 'highlight' && item.id) {
                const layerId = item.id;
                
                if (!this.customLayers[layerId]) {
                    this.customLayers[layerId] = [];
                }
                
                const content = item.content || item.text || "";
                
                this.customLayers[layerId].push({
                    text: content,
                    line: node.lineStart
                });
                
                // Note: We might double count IF the keyword is inside a marker AND we scanned the parent text.
                // However, likely the user uses EITHER a duration keyword OR a specific marker layer.
                // If they use both, it might be ambiguous. 
                // Given the user request, they treat "(ASMR)" as a duration token, not necessarily a layer.
                // We keep layer logic for fixedDuration configs.
                
                // If content parses to duration via Regex (requiring brackets), it likely won't match "content" stripped of brackets.
                // So this is relatively safe.
                if (content) {
                     this._addDuration(this._parseDurationFromText(content, statsConfig), statsConfig);
                }

                 // Fixed Duration for inline
                const config = markerConfigs ? markerConfigs.find(c => c.id === layerId) : null;
                if (config && config.fixedDuration) {
                    const duration = parseFloat(config.fixedDuration);
                    if (!isNaN(duration)) {
                        this._addDuration(duration, statsConfig);
                    }
                }
            }
        });
    }
  }

  onExitNode(node, context) {
      if (node.type === 'range') {
          this.durationOverrideStack.pop();
      }
  }
  
  _getRecursiveText(node) {
      let text = this.getText(node).trim();
      if (node.children && node.children.length) {
          text += "\n" + node.children.map(c => this._getRecursiveText(c)).join("\n");
      }
      return text.trim();
  }

  getResult() {
    return {
      customLayers: this.customLayers,
      sentences: {
          sfx: this.sfxLines
      },
      customDurationSeconds: this.customDurationSeconds
    };
  }
}
