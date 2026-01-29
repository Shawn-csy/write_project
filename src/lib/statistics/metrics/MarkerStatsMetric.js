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
  }

  onNode(node, context) {
    const { markerConfigs } = context;
    const layerNames = {};
    if (markerConfigs) {
      markerConfigs.forEach(c => {
        layerNames[c.id] = c.name || c.id;
      });
    }

    if (node.type === 'layer') {
      const layerId = node.layerType; 
      const layerName = layerNames[layerId] || layerId;
      const content = this._getRecursiveText(node);
      
      if (!this.customLayers[layerName]) {
        this.customLayers[layerName] = [];
      }
      if (content) this.customLayers[layerName].push(content);

      // Fixed Duration
      const config = markerConfigs.find(c => c.id === layerId);
      if (config && config.fixedDuration) {
          const duration = parseFloat(config.fixedDuration);
          if (!isNaN(duration)) {
              this.customDurationSeconds += duration;
          }
      }
    } 
    else if (node.type === 'sfx') {
        const text = this.getText(node).trim();
        this.sfxLines.push(text);
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
