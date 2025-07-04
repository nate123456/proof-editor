import { injectable } from 'tsyringe';

import type { AtomicArgument } from '../domain/entities/AtomicArgument.js';
import type { Node } from '../domain/entities/Node.js';
import type { Statement } from '../domain/entities/Statement.js';
import type { Tree } from '../domain/entities/Tree.js';
import type { OrderedSetId } from '../domain/shared/value-objects.js';
import type { ProofDocument } from '../parser/ProofDocument.js';

interface TreeRenderConfig {
  nodeWidth: number;
  nodeHeight: number;
  verticalSpacing: number;
  horizontalSpacing: number;
  fontSize: number;
  colors: {
    nodeBackground: string;
    nodeBorder: string;
    implicationLine: string;
    statementText: string;
    connectionLine: string;
  };
}

interface RenderedNode {
  id: string;
  x: number;
  y: number;
  argument: AtomicArgument;
  premises: Statement[];
  conclusions: Statement[];
  sideLabel?: string | undefined;
}

interface TreeLayout {
  nodes: RenderedNode[];
  connections: {
    fromNode: string;
    toNode: string;
    fromPosition: number;
    toPosition: number;
  }[];
  width: number;
  height: number;
}

@injectable()
export class TreeRenderer {
  private readonly config: TreeRenderConfig = {
    nodeWidth: 220,
    nodeHeight: 120,
    verticalSpacing: 180,
    horizontalSpacing: 280,
    fontSize: 12,
    colors: {
      nodeBackground: '#f8f9fa',
      nodeBorder: '#dee2e6',
      implicationLine: '#495057',
      statementText: '#212529',
      connectionLine: '#6c757d',
    },
  };

  public generateSVG(proofDoc: ProofDocument): string {
    if (proofDoc.trees.size === 0) {
      return this.generateEmptyMessage();
    }

    const layouts = this.calculateTreeLayouts(proofDoc);
    const totalWidth = Math.max(...layouts.map((layout) => layout.width + 50)) || 400;
    const totalHeight = layouts.reduce((sum, layout) => sum + layout.height + 100, 50);

    const svgContent = this.renderAllTrees(layouts);

    return `
      <svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                  refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" 
                     fill="${this.config.colors.connectionLine}" />
          </marker>
        </defs>
        ${svgContent}
      </svg>
    `;
  }

  private generateEmptyMessage(): string {
    return `
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: center; 
        height: 200px; 
        color: var(--vscode-descriptionForeground);
        font-style: italic;
      ">
        No proof trees to display. Add trees to your proof file to see visualization.
      </div>
    `;
  }

  private calculateTreeLayouts(proofDoc: ProofDocument): TreeLayout[] {
    const layouts: TreeLayout[] = [];
    let currentY = 50;

    for (const [treeId, tree] of Array.from(proofDoc.trees.entries())) {
      const layout = this.calculateSingleTreeLayout(treeId, tree, proofDoc, currentY);
      layouts.push(layout);
      currentY += layout.height + 100;
    }

    return layouts;
  }

  private calculateSingleTreeLayout(
    _treeId: string,
    tree: Tree,
    proofDoc: ProofDocument,
    startY: number,
  ): TreeLayout {
    const treeNodes = this.getTreeNodes(tree, proofDoc);
    const renderedNodes: RenderedNode[] = [];
    const connections: TreeLayout['connections'] = [];

    if (treeNodes.size === 0) {
      return { nodes: [], connections: [], width: 400, height: 100 };
    }

    const nodePositions = this.calculateNodePositions(treeNodes, {
      x: tree.getPosition().getX(),
      y: tree.getPosition().getY(),
    });
    let maxX = 0;
    let maxY = startY;

    for (const [nodeId, node] of Array.from(treeNodes.entries())) {
      const position = nodePositions.get(nodeId) ?? { x: 50, y: startY };
      const argument = proofDoc.atomicArguments.get(node.getArgumentId().getValue());

      if (!argument) continue;

      const premisesId = argument.getPremiseSet();
      const conclusionsId = argument.getConclusionSet();

      const premises = this.getStatementsFromOrderedSet(premisesId, proofDoc);
      const conclusions = this.getStatementsFromOrderedSet(conclusionsId, proofDoc);

      const sideLabel = argument.getSideLabels().left;

      renderedNodes.push({
        id: nodeId,
        x: position.x,
        y: position.y,
        argument,
        premises,
        conclusions,
        sideLabel,
      });

      maxX = Math.max(maxX, position.x + this.config.nodeWidth);
      maxY = Math.max(maxY, position.y + this.config.nodeHeight);

      const attachment = node.getAttachment();
      if (attachment) {
        connections.push({
          fromNode: nodeId,
          toNode: attachment.getParentNodeId().getValue(),
          fromPosition: 0,
          toPosition: attachment.getPremisePosition(),
        });
      }
    }

    return {
      nodes: renderedNodes,
      connections,
      width: maxX + 50,
      height: maxY - startY + 50,
    };
  }

  private getTreeNodes(tree: Tree, proofDoc: ProofDocument): Map<string, Node> {
    const nodes = new Map<string, Node>();

    for (const nodeId of tree.getNodeIds()) {
      const node = proofDoc.nodes.get(nodeId.getValue());
      if (node) {
        nodes.set(nodeId.getValue(), node);
      }
    }

    return nodes;
  }

  private calculateNodePositions(
    nodes: Map<string, Node>,
    treeOffset: { x: number; y: number },
  ): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    const levels = new Map<string, number>();

    const rootNodes = Array.from(nodes.entries()).filter(([_, node]) => !node.getAttachment());

    const queue: { nodeId: string; level: number }[] = [];

    rootNodes.forEach(([nodeId]) => {
      levels.set(nodeId, 0);
      queue.push({ nodeId, level: 0 });
    });

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const { nodeId, level } = item;

      for (const [childId, childNode] of Array.from(nodes.entries())) {
        const attachment = childNode.getAttachment();
        if (attachment && attachment.getParentNodeId().getValue() === nodeId) {
          levels.set(childId, level + 1);
          queue.push({ nodeId: childId, level: level + 1 });
        }
      }
    }

    const levelCounts = new Map<number, number>();
    const levelPositions = new Map<number, number>();

    for (const level of Array.from(levels.values())) {
      levelCounts.set(level, (levelCounts.get(level) ?? 0) + 1);
    }

    for (const [nodeId, level] of Array.from(levels.entries())) {
      const positionInLevel = levelPositions.get(level) ?? 0;
      levelPositions.set(level, positionInLevel + 1);

      const x = treeOffset.x + positionInLevel * this.config.horizontalSpacing;
      const y = treeOffset.y + level * this.config.verticalSpacing;

      positions.set(nodeId, { x, y });
    }

    return positions;
  }

  private getStatementsFromOrderedSet(
    orderedSetId: OrderedSetId | null | undefined,
    proofDoc: ProofDocument,
  ): Statement[] {
    if (!orderedSetId) return [];

    // Find the ordered set by looking through arguments that use it
    for (const argument of Array.from(proofDoc.atomicArguments.values())) {
      const premiseSetId = argument.getPremiseSet();
      const conclusionSetId = argument.getConclusionSet();

      if (premiseSetId?.getValue() === orderedSetId.getValue()) {
        return this.getStatementsFromArgumentSet(proofDoc, argument, 'premises');
      }

      if (conclusionSetId?.getValue() === orderedSetId.getValue()) {
        return this.getStatementsFromArgumentSet(proofDoc, argument, 'conclusions');
      }
    }

    return [];
  }

  private getStatementsFromArgumentSet(
    proofDoc: ProofDocument,
    argument: AtomicArgument,
    type: 'premises' | 'conclusions',
  ): Statement[] {
    // Get the ordered set from the argument
    const orderedSetId =
      type === 'premises' ? argument.getPremiseSet() : argument.getConclusionSet();
    if (!orderedSetId) return [];

    // Look up the ordered set in the document
    const orderedSet = proofDoc.orderedSets.get(orderedSetId.getValue());
    if (!orderedSet) return [];

    // Get statements from the ordered set by looking up each statement ID
    const statements: Statement[] = [];
    for (const statementId of orderedSet.getStatementIds()) {
      const statement = proofDoc.statements.get(statementId.getValue());
      if (statement) {
        statements.push(statement);
      }
    }

    return statements;
  }

  private renderAllTrees(layouts: TreeLayout[]): string {
    return layouts.map((layout) => this.renderSingleTree(layout)).join('\n');
  }

  private renderSingleTree(layout: TreeLayout): string {
    const nodesSvg = layout.nodes.map((node) => this.renderAtomicArgument(node)).join('\n');

    const connectionsSvg = this.renderConnections(layout);

    return `
      <g class="tree">
        ${connectionsSvg}
        ${nodesSvg}
      </g>
    `;
  }

  private renderAtomicArgument(node: RenderedNode): string {
    const { x, y } = node;
    const { nodeWidth } = this.config;

    const premisesHeight = Math.max(30, node.premises.length * 20);
    const conclusionsHeight = Math.max(30, node.conclusions.length * 20);
    const totalHeight = premisesHeight + conclusionsHeight + 10;

    const premisesSvg = this.renderStatements(
      node.premises,
      x + 10,
      y + 15,
      nodeWidth - 20,
      premisesHeight - 10,
    );

    const conclusionsSvg = this.renderStatements(
      node.conclusions,
      x + 10,
      y + premisesHeight + 15,
      nodeWidth - 20,
      conclusionsHeight - 10,
    );

    const sideLabelSvg = node.sideLabel
      ? `<text x="${x + nodeWidth + 10}" y="${y + totalHeight / 2}" 
               class="side-label">${this.escapeXml(node.sideLabel)}</text>`
      : '';

    return `
      <g class="argument-node-group">
        <rect x="${x}" y="${y}" width="${nodeWidth}" height="${totalHeight}" 
              class="argument-node" />
        
        <rect x="${x}" y="${y}" width="${nodeWidth}" height="${premisesHeight}" 
              class="premise-section" fill="none" />
        ${premisesSvg}
        
        <line x1="${x + 10}" y1="${y + premisesHeight + 5}" 
              x2="${x + nodeWidth - 10}" y2="${y + premisesHeight + 5}" 
              class="implication-line" />
        
        <rect x="${x}" y="${y + premisesHeight + 10}" width="${nodeWidth}" height="${conclusionsHeight}" 
              class="conclusion-section" fill="none" />
        ${conclusionsSvg}
        
        ${sideLabelSvg}
      </g>
    `;
  }

  private renderStatements(
    statements: Statement[],
    x: number,
    y: number,
    width: number,
    height: number,
  ): string {
    if (statements.length === 0) {
      return `<text x="${x + width / 2}" y="${y + height / 2}" 
                    class="statement-text" style="font-style: italic;">
                (empty)
              </text>`;
    }

    const lineHeight = Math.min(18, height / statements.length);

    return statements
      .map((statement, index) => {
        const textY = y + (index + 0.7) * lineHeight;
        const content = this.truncateText(statement.getContent(), width / 8);

        return `<text x="${x + width / 2}" y="${textY}" class="statement-text">
                  ${this.escapeXml(content)}
                </text>`;
      })
      .join('\n');
  }

  private renderConnections(layout: TreeLayout): string {
    return layout.connections.map((conn) => this.renderConnection(conn, layout.nodes)).join('\n');
  }

  private renderConnection(
    connection: TreeLayout['connections'][0],
    nodes: RenderedNode[],
  ): string {
    const fromNode = nodes.find((n) => n.id === connection.fromNode);
    const toNode = nodes.find((n) => n.id === connection.toNode);

    if (!fromNode || !toNode) return '';

    const fromX = fromNode.x + this.config.nodeWidth / 2;
    const fromY = fromNode.y;
    const toX = toNode.x + this.config.nodeWidth / 2;
    const toY = toNode.y + this.config.nodeHeight;

    return `<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" 
                  class="connection-line" />`;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength - 3)}...`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}
