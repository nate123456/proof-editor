import { injectable } from 'tsyringe';
import type {
  ConnectionDTO,
  ProofVisualizationDTO,
  RenderedNodeDTO,
  TreeRenderDTO,
} from '../application/dtos/view-dtos.js';
import type { StatementDTO } from '../application/queries/statement-queries.js';

interface TreeRenderConfig {
  fontSize: number;
  colors: {
    nodeBackground: string;
    nodeBorder: string;
    implicationLine: string;
    statementText: string;
    connectionLine: string;
    sideLabel: string;
  };
}

@injectable()
export class TreeRenderer {
  private readonly config: TreeRenderConfig = {
    fontSize: 12,
    colors: {
      nodeBackground: '#f8f9fa',
      nodeBorder: '#dee2e6',
      implicationLine: '#495057',
      statementText: '#212529',
      connectionLine: '#6c757d',
      sideLabel: '#6c757d',
    },
  };

  /**
   * Generate SVG from pre-calculated visualization data
   */
  generateSVG(visualization: ProofVisualizationDTO): string {
    if (visualization.isEmpty) {
      return this.generateEmptyMessage();
    }

    const svgContent = this.renderAllTrees(visualization.trees);

    return `
      <svg width="${visualization.totalDimensions.width}" 
           height="${visualization.totalDimensions.height}" 
           xmlns="http://www.w3.org/2000/svg">
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

  private renderAllTrees(trees: TreeRenderDTO[]): string {
    return trees.map((tree) => this.renderSingleTree(tree)).join('\n');
  }

  private renderSingleTree(tree: TreeRenderDTO): string {
    const nodesSvg = tree.layout.nodes.map((node) => this.renderAtomicArgument(node)).join('\n');

    const connectionsSvg = tree.layout.connections
      .map((conn) => this.renderConnection(conn))
      .join('\n');

    return `
      <g class="tree" transform="translate(${tree.position.x}, ${tree.position.y})">
        ${connectionsSvg}
        ${nodesSvg}
      </g>
    `;
  }

  private renderAtomicArgument(node: RenderedNodeDTO): string {
    const { x, y } = node.position;
    const { width, height } = node.dimensions;

    const premisesHeight = Math.max(30, node.premises.length * 20);
    const conclusionsHeight = Math.max(30, node.conclusions.length * 20);

    const premisesSvg = this.renderStatements(
      node.premises,
      x + 10,
      y + 15,
      width - 20,
      premisesHeight - 10,
    );

    const conclusionsSvg = this.renderStatements(
      node.conclusions,
      x + 10,
      y + premisesHeight + 15,
      width - 20,
      conclusionsHeight - 10,
    );

    const sideLabelSvg = node.sideLabel
      ? `<text x="${x + width + 10}" y="${y + height / 2}" 
               class="side-label">${this.escapeXml(node.sideLabel)}</text>`
      : '';

    return `
      <g class="argument-node-group">
        <rect x="${x}" y="${y}" width="${width}" height="${height}" 
              class="argument-node" />
        
        ${premisesSvg}
        
        <line x1="${x + 10}" y1="${y + premisesHeight + 5}" 
              x2="${x + width - 10}" y2="${y + premisesHeight + 5}" 
              class="implication-line" />
        
        ${conclusionsSvg}
        ${sideLabelSvg}
      </g>
    `;
  }

  private renderStatements(
    statements: StatementDTO[],
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
        const content = this.truncateText(statement.content, width / 8);

        return `<text x="${x + width / 2}" y="${textY}" class="statement-text">
                  ${this.escapeXml(content)}
                </text>`;
      })
      .join('\n');
  }

  private renderConnection(connection: ConnectionDTO): string {
    const { coordinates } = connection;

    return `<line x1="${coordinates.startX}" y1="${coordinates.startY}" 
                  x2="${coordinates.endX}" y2="${coordinates.endY}" 
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
