import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';
import { ValidationError } from '../../domain/shared/result.js';
import type {
  ConnectionDTO,
  RenderedNodeDTO,
  TreeLayoutConfig,
  TreeLayoutDTO,
  TreeNodeData,
  TreeRenderDTO,
} from '../dtos/view-dtos.js';
import { createRenderedNodeDTO } from '../dtos/view-dtos.js';
import type { DocumentDTO } from '../queries/document-queries.js';
import type { TreeDTO } from '../queries/shared-types.js';
import type { StatementDTO } from '../queries/statement-queries.js';

@injectable()
export class TreeLayoutService {
  private readonly defaultConfig: TreeLayoutConfig = {
    nodeWidth: 220,
    nodeHeight: 120,
    verticalSpacing: 180,
    horizontalSpacing: 280,
    treeSpacing: 150,
    canvasMargin: 50,
  };

  /**
   * Calculate layout for all trees in a document
   */
  calculateDocumentLayout(
    document: DocumentDTO,
    config: Partial<TreeLayoutConfig> = {},
  ): Result<TreeRenderDTO[], ValidationError> {
    const layoutConfig = { ...this.defaultConfig, ...config };
    const layouts: TreeRenderDTO[] = [];
    let currentY = layoutConfig.canvasMargin;

    try {
      for (const [treeId, treeDTO] of Object.entries(document.trees)) {
        const layoutResult = this.calculateTreeLayout(
          treeId,
          treeDTO,
          document,
          layoutConfig,
          currentY,
        );

        if (layoutResult.isErr()) {
          return err(layoutResult.error);
        }

        layouts.push(layoutResult.value);
        currentY += layoutResult.value.bounds.height + layoutConfig.treeSpacing;
      }

      return ok(layouts);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to calculate document layout: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Calculate layout for a single tree
   */
  private calculateTreeLayout(
    treeId: string,
    treeDTO: TreeDTO,
    document: DocumentDTO,
    config: TreeLayoutConfig,
    startY: number,
  ): Result<TreeRenderDTO, ValidationError> {
    try {
      // Get nodes from tree structure
      const nodes = this.extractTreeNodes(treeDTO, document);
      if (nodes.length === 0) {
        return ok(this.createEmptyTreeLayout(treeId, treeDTO, config, startY));
      }

      // Calculate node positions using hierarchical layout
      const positions = this.calculateNodePositions(nodes, config, treeDTO.position);

      // Create rendered nodes with calculated positions
      const renderedNodes: RenderedNodeDTO[] = [];
      for (const [nodeId, position] of positions) {
        const node = nodes.find((n) => n.nodeId === nodeId);
        if (!node) continue;

        const argumentDTO = document.atomicArguments[node.argumentId];
        if (!argumentDTO) continue;

        const premises = this.getStatementsForOrderedSet(argumentDTO.premiseSetId, document);
        const conclusions = this.getStatementsForOrderedSet(argumentDTO.conclusionSetId, document);

        renderedNodes.push(
          createRenderedNodeDTO(
            nodeId,
            position,
            { width: config.nodeWidth, height: config.nodeHeight },
            argumentDTO,
            premises,
            conclusions,
            argumentDTO.sideLabels?.left,
          ),
        );
      }

      // Calculate connections with coordinates
      const connections = this.calculateConnections(renderedNodes, nodes);

      // Calculate overall bounds
      const bounds = this.calculateTreeBounds(renderedNodes, config);

      const layout: TreeLayoutDTO = {
        nodes: renderedNodes,
        connections,
        dimensions: bounds,
      };

      return ok({
        id: treeId,
        position: { x: treeDTO.position.x, y: startY },
        layout,
        bounds: { width: bounds.width, height: bounds.height },
      });
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to calculate tree layout: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Extract tree node structure from DocumentDTO
   * Since TreeDTO doesn't contain node structure, we need to reconstruct it
   * from the document's atomic arguments and their relationships
   */
  private extractTreeNodes(treeDTO: TreeDTO, document: DocumentDTO): TreeNodeData[] {
    const nodes: TreeNodeData[] = [];

    // For now, we'll create a simple structure based on rootNodeIds
    // In a complete implementation, this would parse the actual tree structure
    // from a nodes collection or tree specification in the document

    // Create nodes for each root node ID
    for (const rootNodeId of treeDTO.rootNodeIds) {
      // Find if there's an atomic argument with this ID
      const argumentId = this.findArgumentForNode(rootNodeId, document);
      if (argumentId) {
        nodes.push({
          nodeId: rootNodeId,
          argumentId,
        });
      }
    }

    return nodes;
  }

  /**
   * Find the atomic argument ID for a given node
   * This is a simplified implementation - in reality, nodes would reference arguments
   */
  private findArgumentForNode(nodeId: string, document: DocumentDTO): string | undefined {
    // Simple heuristic: if there's an argument with the same ID as the node, use it
    if (document.atomicArguments[nodeId]) {
      return nodeId;
    }

    // Otherwise, return the first available argument
    const argumentIds = Object.keys(document.atomicArguments);
    return argumentIds[0];
  }

  private calculateNodePositions(
    nodes: TreeNodeData[],
    config: TreeLayoutConfig,
    treeOffset: { x: number; y: number },
  ): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    // Build hierarchy levels
    const levels = this.buildHierarchyLevels(nodes);

    // Position nodes level by level
    for (const [level, levelNodes] of levels) {
      const levelWidth = levelNodes.length * config.horizontalSpacing;
      const startX = treeOffset.x - levelWidth / 2;

      levelNodes.forEach((nodeId, index) => {
        const x = startX + index * config.horizontalSpacing;
        const y = treeOffset.y + level * config.verticalSpacing;
        positions.set(nodeId, { x, y });
      });
    }

    return positions;
  }

  private buildHierarchyLevels(nodes: TreeNodeData[]): Map<number, string[]> {
    const levels = new Map<number, string[]>();
    const visited = new Set<string>();

    // Find root nodes (nodes without parents)
    const rootNodes = nodes.filter((n) => !n.parentId);

    // BFS to assign levels
    const queue: { nodeId: string; level: number }[] = [];

    rootNodes.forEach((node) => {
      queue.push({ nodeId: node.nodeId, level: 0 });
    });

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      const { nodeId, level } = item;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      if (!levels.has(level)) {
        levels.set(level, []);
      }
      const levelArray = levels.get(level);
      if (levelArray) {
        levelArray.push(nodeId);
      }

      // Add children to queue
      const children = nodes.filter((n) => n.parentId === nodeId);
      children.forEach((child) => {
        queue.push({ nodeId: child.nodeId, level: level + 1 });
      });
    }

    return levels;
  }

  private getStatementsForOrderedSet(
    orderedSetId: string | null,
    document: DocumentDTO,
  ): StatementDTO[] {
    if (!orderedSetId) return [];

    const orderedSet = document.orderedSets[orderedSetId];
    if (!orderedSet) return [];

    return orderedSet.statementIds
      .map((id) => document.statements[id])
      .filter((stmt) => stmt != null);
  }

  private calculateConnections(
    renderedNodes: RenderedNodeDTO[],
    nodeData: TreeNodeData[],
  ): ConnectionDTO[] {
    const connections: ConnectionDTO[] = [];

    for (const node of nodeData) {
      if (!node.parentId) continue;

      const childNode = renderedNodes.find((n) => n.id === node.nodeId);
      const parentNode = renderedNodes.find((n) => n.id === node.parentId);

      if (!childNode || !parentNode) continue;

      connections.push({
        fromNodeId: node.nodeId,
        toNodeId: node.parentId,
        fromPosition: 0,
        toPosition: node.premisePosition || 0,
        coordinates: {
          startX: childNode.position.x + childNode.dimensions.width / 2,
          startY: childNode.position.y,
          endX: parentNode.position.x + parentNode.dimensions.width / 2,
          endY: parentNode.position.y + parentNode.dimensions.height,
        },
      });
    }

    return connections;
  }

  private calculateTreeBounds(
    nodes: RenderedNodeDTO[],
    config: TreeLayoutConfig,
  ): { width: number; height: number } {
    if (nodes.length === 0) {
      return { width: 400, height: 200 };
    }

    const maxX = Math.max(...nodes.map((n) => n.position.x + n.dimensions.width));
    const maxY = Math.max(...nodes.map((n) => n.position.y + n.dimensions.height));
    const minX = Math.min(...nodes.map((n) => n.position.x));
    const minY = Math.min(...nodes.map((n) => n.position.y));

    return {
      width: maxX - minX + config.canvasMargin * 2,
      height: maxY - minY + config.canvasMargin * 2,
    };
  }

  private createEmptyTreeLayout(
    treeId: string,
    treeDTO: TreeDTO,
    config: TreeLayoutConfig,
    startY: number,
  ): TreeRenderDTO {
    // Calculate minimum dimensions for empty tree
    // For empty trees, provide a reasonable default size based on node dimensions plus spacing
    // When canvasMargin is customized (larger than default), add both canvasMargin and minimum spacing
    const isCustomCanvasMargin = config.canvasMargin > 50; // 50 is default
    const width = Math.max(
      400,
      isCustomCanvasMargin
        ? config.nodeWidth + config.canvasMargin * 2 + 100 // extra spacing for custom margins
        : config.nodeWidth + config.horizontalSpacing,
    );
    const height = Math.max(200, config.nodeHeight + config.verticalSpacing);

    return {
      id: treeId,
      position: { x: treeDTO.position.x, y: startY },
      layout: {
        nodes: [],
        connections: [],
        dimensions: { width, height },
      },
      bounds: { width, height },
    };
  }

  /**
   * Get the default layout configuration
   */
  getDefaultConfig(): TreeLayoutConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Create a custom layout configuration
   */
  createConfig(overrides: Partial<TreeLayoutConfig>): TreeLayoutConfig {
    return { ...this.defaultConfig, ...overrides };
  }
}
