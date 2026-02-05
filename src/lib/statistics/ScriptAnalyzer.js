
/**
 * Core Analyzer that orchestrates the traversal and execution of metrics.
 */
export class ScriptAnalyzer {
  constructor(metrics = []) {
    this.metrics = metrics;
  }

  /**
   * Run the analysis on a given AST.
   * @param {Array|Object} ast - The script AST or root node.
   * @param {Object} context - Shared context (e.g. markerConfigs).
   * @returns {Object} Aggregated results from all metrics.
   */
  analyze(ast, context = {}) {
    const rootNodes = Array.isArray(ast) ? ast : (ast.children || []);
    
    // 1. Reset metrics
    this.metrics.forEach(m => m.reset());

    // 2. Traverse
    this._traverse(rootNodes, context);

    // 3. Aggregate results
    const results = {};
    this.metrics.forEach(m => {
      Object.assign(results, m.getResult());
    });

    return results;
  }

  _traverse(nodes, context) {
    if (!nodes || !Array.isArray(nodes)) return;

    for (const node of nodes) {
      // Notify all metrics visiting this node
      for (const metric of this.metrics) {
        metric.onNode(node, context);
      }

      // Recursion
      if (node.children && Array.isArray(node.children)) {
        this._traverse(node.children, context);
      } 
      // Handle Dual Dialogue special case if needed, or rely on children traversal
      else if (node.type === 'dual_dialogue') {
         if (node.left) this._traverse([node.left], context);
         if (node.right) this._traverse([node.right], context);
      }

      // Notify metrics about exit
      for (const metric of this.metrics) {
        if (metric.onExitNode) {
            metric.onExitNode(node, context);
        }
      }
    }
  }
}

/**
 * Abstract Base Class for a Metric.
 */
export class Metric {
  reset() {}
  
  /**
   * Called for each node visited.
   * @param {Object} node 
   * @param {Object} context 
   */
  onNode(node, context) {}

  /**
   * Called when leaving a node (after processing children).
   * @param {Object} node 
   * @param {Object} context 
   */
  onExitNode(node, context) {}

  /**
   * Returns the final data object to be merged into the stats result.
   */
  getResult() {
    return {};
  }
  
  getText(node) {
    return node.text || node.content || "";
  }
}
