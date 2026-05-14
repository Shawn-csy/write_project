export interface AstNode {
  type?: string;
  text?: string;
  content?: string;
  children?: AstNode[];
  left?: AstNode;
  right?: AstNode;
  [key: string]: unknown;
}

export interface AnalyzerContext {
  markerConfigs?: unknown[];
  statsConfig?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface IMetric {
  reset(): void;
  onNode(node: AstNode, context: AnalyzerContext): void;
  onExitNode?(node: AstNode, context: AnalyzerContext): void;
  getResult(): Record<string, unknown>;
}

/**
 * Core Analyzer that orchestrates the traversal and execution of metrics.
 */
export class ScriptAnalyzer {
  metrics: IMetric[];
  constructor(metrics: IMetric[] = []) {
    this.metrics = metrics;
  }

  analyze(ast: AstNode | AstNode[], context: AnalyzerContext = {}): Record<string, unknown> {
    const rootNodes = Array.isArray(ast) ? ast : (ast.children || []);

    this.metrics.forEach(m => m.reset());
    this._traverse(rootNodes, context);

    const results: Record<string, unknown> = {};
    this.metrics.forEach(m => {
      Object.assign(results, m.getResult());
    });

    return results;
  }

  _traverse(nodes: AstNode[], context: AnalyzerContext) {
    if (!nodes || !Array.isArray(nodes)) return;

    for (const node of nodes) {
      for (const metric of this.metrics) {
        metric.onNode(node, context);
      }

      if (node.children && Array.isArray(node.children)) {
        this._traverse(node.children, context);
      } else if (node.type === 'dual_dialogue') {
        if (node.left) this._traverse([node.left], context);
        if (node.right) this._traverse([node.right], context);
      }

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
export class Metric implements IMetric {
  reset(): void {}
  onNode(_node: AstNode, _context: AnalyzerContext): void {}
  onExitNode(_node: AstNode, _context: AnalyzerContext): void {}
  getResult(): Record<string, unknown> { return {}; }
  getText(node: AstNode): string {
    return String(node.text || node.content || "");
  }
}
