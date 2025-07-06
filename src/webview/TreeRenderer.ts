import { injectable } from 'tsyringe';
import type {
  ConnectionDTO,
  ProofVisualizationDTO,
  RenderedNodeDTO,
  TreeRenderDTO,
} from '../application/dtos/view-dtos.js';
import type { StatementDTO } from '../application/queries/statement-queries.js';

@injectable()
export class TreeRenderer {
  generateSVG(visualization: ProofVisualizationDTO): string {
    if (visualization.isEmpty) {
      return this.generateEmptyMessage(visualization.totalDimensions.height);
    }

    const { width, height } = visualization.totalDimensions;
    const svgElements: string[] = [];

    // Generate SVG for each tree
    for (const tree of visualization.trees) {
      svgElements.push(this.renderTree(tree));
    }

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" class="proof-tree-svg">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--vscode-textPreformat-foreground)" />
          </marker>
        </defs>
        <style>
          .argument-node-group { cursor: move; }
          .argument-node { cursor: move; }
          .implication-line { stroke: var(--vscode-textPreformat-foreground); stroke-width: 2; }
          .statement-group { cursor: pointer; }
          .statement-text { cursor: text; }
          .editable-statement { cursor: text; }
          .statement-background { fill: var(--vscode-editor-background); }
          .empty-statement { font-style: italic; fill: var(--vscode-descriptionForeground); }
          .premise-section { cursor: pointer; }
          .conclusion-section { cursor: pointer; }
          .drop-zone { opacity: 0; pointer-events: none; }
          .interactive-node { cursor: pointer; }
          .drag-handle { cursor: grab; }
          .connection-group { cursor: pointer; }
          .interactive-connection { cursor: pointer; }
          .connection-hit-area { cursor: pointer; }
          .connection-line { stroke: var(--vscode-textPreformat-foreground); stroke-width: 1; }
          .side-label { font-size: 10px; fill: var(--vscode-descriptionForeground); }
          .editable-label { cursor: text; }
          .tree { }
        </style>
        ${svgElements.join('\n')}
      </svg>`;
  }

  private generateEmptyMessage(height: number): string {
    return `
      <div style="display: flex; align-items: center; justify-content: center; height: ${height}px; color: var(--vscode-descriptionForeground); font-style: italic;">
        No proof trees to display
      </div>
    `;
  }

  private renderTree(tree: TreeRenderDTO): string {
    const elements: string[] = [];

    // Render connections first (so they appear below nodes)
    if (tree.layout?.connections) {
      for (const connection of tree.layout.connections) {
        if (connection) {
          elements.push(this.renderConnection(connection));
        }
      }
    }

    // Render nodes
    if (tree.layout?.nodes) {
      for (const node of tree.layout.nodes) {
        if (node) {
          elements.push(this.renderNode(node, tree.position));
        }
      }
    }

    // Handle malformed position data
    const posX = typeof tree.position?.x === 'number' ? tree.position.x : 0;
    const posY = typeof tree.position?.y === 'number' ? tree.position.y : 0;

    return `<g class="tree" transform="translate(${posX}, ${posY})">${elements.join('\n')}</g>`;
  }

  private renderNode(node: RenderedNodeDTO, _treePosition: { x: number; y: number }): string {
    if (
      !node ||
      !node.position ||
      typeof node.position.x !== 'number' ||
      typeof node.position.y !== 'number'
    ) {
      return '';
    }

    const elements: string[] = [];
    const nodeX = node.position.x;
    const nodeY = node.position.y;

    // Node group
    elements.push(
      `<g class="argument-node-group" data-node-id="${node.id}" data-argument-id="arg-${node.id}">`,
    );

    // Implication line
    elements.push(
      `<line class="implication-line" x1="${nodeX}" y1="${nodeY + 20}" x2="${nodeX + 150}" y2="${nodeY + 20}" />`,
    );

    // Get premises and conclusions from node structure
    const premises = node.premises || [];
    const conclusions = node.conclusions || [];

    // Premises - handle empty case
    if (premises.length === 0) {
      elements.push(`
        <g class="statement-group premise-section" data-statement-type="premise">
          <text class="statement-text empty-statement" x="${nodeX + 10}" y="${nodeY - 5}" font-style="italic" fill="var(--vscode-descriptionForeground)">(empty)</text>
        </g>
      `);
    } else {
      premises.forEach((premise, index) => {
        elements.push(
          this.renderStatement(
            premise,
            nodeX + 10,
            nodeY - (index + 1) * 25,
            'premise',
            index,
            node.id,
          ),
        );
      });
    }

    // Conclusions - handle empty case
    if (conclusions.length === 0) {
      elements.push(`
        <g class="statement-group conclusion-section" data-statement-type="conclusion">
          <text class="statement-text empty-statement" x="${nodeX + 10}" y="${nodeY + 45}" font-style="italic" fill="var(--vscode-descriptionForeground)">(empty)</text>
        </g>
      `);
    } else {
      conclusions.forEach((conclusion, index) => {
        elements.push(
          this.renderStatement(
            conclusion,
            nodeX + 10,
            nodeY + 30 + index * 25,
            'conclusion',
            index,
            node.id,
          ),
        );
      });
    }

    // Side labels
    const sideLabel = node.sideLabel || node.argument?.sideLabels?.left || '';
    if (sideLabel) {
      elements.push(`
        <text class="side-label editable-label" x="${nodeX - 50}" y="${nodeY + 20}" 
              data-node-id="${node.id}" data-label-type="side">
          ${this.escapeXml(sideLabel)}
        </text>
      `);
    }

    // Drag handle
    elements.push(
      `<rect class="drag-handle interactive-node" x="${nodeX + 140}" y="${nodeY - 10}" width="10" height="10" fill="var(--vscode-descriptionForeground)" opacity="0.3" data-node-id="${node.id}" />`,
    );

    // Drop zones
    const nodeWidth = node.dimensions?.width ?? 150;
    const nodeHeight = node.dimensions?.height ?? 20;
    elements.push(
      `<rect class="drop-zone" x="${nodeX}" y="${nodeY - 50}" width="${nodeWidth}" height="${nodeHeight}" data-drop-type="premise" data-node-id="${node.id}" />`,
    );
    elements.push(
      `<rect class="drop-zone" x="${nodeX}" y="${nodeY + 50}" width="${nodeWidth}" height="${nodeHeight}" data-drop-type="conclusion" data-node-id="${node.id}" />`,
    );

    elements.push('</g>');
    return elements.join('\n');
  }

  private renderStatement(
    statement: StatementDTO,
    x: number,
    y: number,
    type: 'premise' | 'conclusion',
    index: number,
    nodeId: string,
  ): string {
    const truncatedContent = this.truncateText(statement.content, 25);
    const sectionClass = type === 'premise' ? 'premise-section' : 'conclusion-section';
    return `
      <g class="statement-group ${sectionClass}" data-statement-id="${this.escapeXml(statement.id)}" data-node-id="${nodeId}" 
         data-statement-type="${type}" data-statement-index="${index}">
        <rect class="statement-background" x="${x - 5}" y="${y - 15}" width="130" height="20" />
        <text class="editable-statement statement-text" x="${x}" y="${y}" 
              data-original-content="${this.escapeXml(statement.content)}">
          ${this.escapeXml(truncatedContent)}
        </text>
      </g>
    `;
  }

  private renderConnection(connection: ConnectionDTO): string {
    // Use the correct connection format
    const fromX = connection.coordinates.startX;
    const fromY = connection.coordinates.startY;
    const toX = connection.coordinates.endX;
    const toY = connection.coordinates.endY;
    const fromNode = connection.fromNodeId;
    const toNode = connection.toNodeId;

    return `
      <g class="connection-group" data-connection-id="${fromNode}-${toNode}">
        <line class="connection-hit-area" 
              x1="${fromX}" y1="${fromY}" 
              x2="${toX}" y2="${toY}"
              stroke="transparent" stroke-width="10" />
        <line class="connection-line interactive-connection" 
              x1="${fromX}" y1="${fromY}" 
              x2="${toX}" y2="${toY}"
              data-from-node="${fromNode}" data-to-node="${toNode}" />
      </g>
    `;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
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
