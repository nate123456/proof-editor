import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';
import { ValidationError } from '../../domain/shared/result.js';
import {
  Dimensions,
  NodeCount,
  NodeId,
  Position2D,
  type StatementId,
  TreeId,
} from '../../domain/shared/value-objects/index.js';
import {
  type ConnectionDTO,
  createRenderedNodeDTO,
  type RenderedNodeDTO,
  type TreeLayoutConfig,
  type TreeLayoutDTO,
  type TreeNodeData,
  type TreeRenderDTO,
  TypedTreeLayoutConfig,
} from '../dtos/view-dtos.js';
import type { DocumentDTO } from '../queries/document-queries.js';
import type { TreeDTO } from '../queries/shared-types.js';
import type { StatementDTO } from '../queries/statement-queries.js';

@injectable()
export class TreeLayoutService {
  private readonly defaultConfig: TypedTreeLayoutConfig = TypedTreeLayoutConfig.default();

  /**
   * Calculate layout for all trees in a document
   */
  calculateDocumentLayout(
    document: DocumentDTO,
    config: Partial<TreeLayoutConfig> | TypedTreeLayoutConfig = {},
  ): Result<TreeRenderDTO[], ValidationError> {
    const layoutConfig = config instanceof TypedTreeLayoutConfig ? config : this.defaultConfig;
    const layouts: TreeRenderDTO[] = [];
    let currentY = layoutConfig.getCanvasMargin().getValue();

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
        currentY +=
          layoutResult.value.bounds.getHeight() + layoutConfig.getTreeSpacing().getValue();
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
    config: TypedTreeLayoutConfig,
    startY: number,
  ): Result<TreeRenderDTO, ValidationError> {
    try {
      // Get nodes from tree structure
      const nodes = this.extractTreeNodes(treeDTO, document);
      if (nodes.length === 0) {
        const emptyLayoutResult = this.createEmptyTreeLayout(treeId, treeDTO, config, startY);
        if (emptyLayoutResult.isErr()) {
          return err(emptyLayoutResult.error);
        }
        return ok(emptyLayoutResult.value);
      }

      // Calculate node positions using hierarchical layout
      const positions = this.calculateNodePositions(nodes, config, {
        x: treeDTO.position.getX(),
        y: treeDTO.position.getY(),
      });

      // Create rendered nodes with calculated positions
      const renderedNodes: RenderedNodeDTO[] = [];
      for (const [nodeId, position] of positions) {
        const node = nodes.find((n) => n.nodeId.getValue() === nodeId);
        if (!node) continue;

        const argumentDTO = document.atomicArguments[node.argumentId];
        if (!argumentDTO) continue;

        const premises = this.getStatementsFromIds(argumentDTO.premiseIds, document);
        const conclusions = this.getStatementsFromIds(argumentDTO.conclusionIds, document);

        const dimensionsResult = Dimensions.create(
          config.getNodeWidth().getValue(),
          config.getNodeHeight().getValue(),
        );
        if (dimensionsResult.isErr()) {
          return err(dimensionsResult.error);
        }
        const positionResult = Position2D.create(position.x, position.y);
        if (positionResult.isErr()) {
          return err(positionResult.error);
        }
        const nodeIdResult = NodeId.create(nodeId);
        if (nodeIdResult.isErr()) {
          return err(nodeIdResult.error);
        }
        renderedNodes.push(
          createRenderedNodeDTO(
            nodeIdResult.value,
            positionResult.value,
            dimensionsResult.value,
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

      const dimensionsResult = Dimensions.create(bounds.width, bounds.height);
      if (dimensionsResult.isErr()) {
        return err(dimensionsResult.error);
      }
      const layout: TreeLayoutDTO = {
        nodes: renderedNodes,
        connections,
        dimensions: dimensionsResult.value,
      };

      const treePositionResult = Position2D.create(treeDTO.position.getX(), startY);
      if (treePositionResult.isErr()) {
        return err(treePositionResult.error);
      }
      const boundsResult = Dimensions.create(bounds.width, bounds.height);
      if (boundsResult.isErr()) {
        return err(boundsResult.error);
      }
      const treeIdResult = TreeId.create(treeId);
      if (treeIdResult.isErr()) {
        return err(treeIdResult.error);
      }
      return ok({
        id: treeIdResult.value,
        position: treePositionResult.value,
        layout,
        bounds: boundsResult.value,
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
      const argumentId = this.findArgumentForNode(rootNodeId.getValue(), document);
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
    config: TypedTreeLayoutConfig,
    treeOffset: { x: number; y: number },
  ): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    // Build hierarchy levels
    const levels = this.buildHierarchyLevels(nodes);

    // Position nodes level by level
    for (const [level, levelNodes] of levels) {
      const levelWidth = levelNodes.length * config.getHorizontalSpacing().getValue();
      const startX = treeOffset.x - levelWidth / 2;

      levelNodes.forEach((nodeId, index) => {
        const x = startX + index * config.getHorizontalSpacing().getValue();
        const y = treeOffset.y + level * config.getVerticalSpacing().getValue();
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
      queue.push({ nodeId: node.nodeId.getValue(), level: 0 });
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
      const children = nodes.filter((n) => n.parentId && n.parentId.getValue() === nodeId);
      children.forEach((child) => {
        queue.push({ nodeId: child.nodeId.getValue(), level: level + 1 });
      });
    }

    return levels;
  }

  private getStatementsFromIds(statementIds: StatementId[], document: DocumentDTO): StatementDTO[] {
    if (!statementIds || statementIds.length === 0) return [];

    return statementIds
      .map((id) => document.statements[id.getValue()])
      .filter((stmt): stmt is StatementDTO => stmt != null);
  }

  private getStatementsForOrderedSet(
    orderedSetId: string | null,
    document: DocumentDTO,
  ): StatementDTO[] {
    // This method appears to be unused and references a non-existent property
    // Returning empty array for now
    return [];
  }

  private calculateConnections(
    renderedNodes: RenderedNodeDTO[],
    nodeData: TreeNodeData[],
  ): ConnectionDTO[] {
    const connections: ConnectionDTO[] = [];

    for (const node of nodeData) {
      if (!node.parentId) continue;

      const childNode = renderedNodes.find((n) => n.id.getValue() === node.nodeId.getValue());
      const parentNode = renderedNodes.find(
        (n) => node.parentId && n.id.getValue() === node.parentId.getValue(),
      );

      if (!childNode || !parentNode) continue;

      connections.push({
        fromNodeId: node.nodeId,
        toNodeId: node.parentId,
        fromPosition: 0,
        toPosition: node.premisePosition || 0,
        coordinates: {
          startX: childNode.position.getX() + childNode.dimensions.getWidth() / 2,
          startY: childNode.position.getY(),
          endX: parentNode.position.getX() + parentNode.dimensions.getWidth() / 2,
          endY: parentNode.position.getY() + parentNode.dimensions.getHeight(),
        },
      });
    }

    return connections;
  }

  private calculateTreeBounds(
    nodes: RenderedNodeDTO[],
    config: TypedTreeLayoutConfig,
  ): { width: number; height: number } {
    if (nodes.length === 0) {
      return { width: 400, height: 200 };
    }

    const maxX = Math.max(...nodes.map((n) => n.position.getX() + n.dimensions.getWidth()));
    const maxY = Math.max(...nodes.map((n) => n.position.getY() + n.dimensions.getHeight()));
    const minX = Math.min(...nodes.map((n) => n.position.getX()));
    const minY = Math.min(...nodes.map((n) => n.position.getY()));

    return {
      width: maxX - minX + config.getCanvasMargin().getValue() * 2,
      height: maxY - minY + config.getCanvasMargin().getValue() * 2,
    };
  }

  private createEmptyTreeLayout(
    treeId: string,
    treeDTO: TreeDTO,
    config: TypedTreeLayoutConfig,
    startY: number,
  ): Result<TreeRenderDTO, ValidationError> {
    // Calculate minimum dimensions for empty tree
    // For empty trees, provide a reasonable default size based on node dimensions plus spacing
    // When canvasMargin is customized (larger than default), add both canvasMargin and minimum spacing
    const canvasMargin = config.getCanvasMargin().getValue();
    const nodeWidth = config.getNodeWidth().getValue();
    const nodeHeight = config.getNodeHeight().getValue();
    const horizontalSpacing = config.getHorizontalSpacing().getValue();
    const verticalSpacing = config.getVerticalSpacing().getValue();

    const isCustomCanvasMargin = canvasMargin > 50; // 50 is default
    const width = Math.max(
      400,
      isCustomCanvasMargin
        ? nodeWidth + canvasMargin * 2 + 100 // extra spacing for custom margins
        : nodeWidth + horizontalSpacing,
    );
    const height = Math.max(200, nodeHeight + verticalSpacing);

    const positionResult = Position2D.create(treeDTO.position.getX(), startY);
    if (positionResult.isErr()) {
      return err(positionResult.error);
    }
    const dimensionsResult = Dimensions.create(width, height);
    if (dimensionsResult.isErr()) {
      return err(dimensionsResult.error);
    }
    const treeIdResult = TreeId.create(treeId);
    if (treeIdResult.isErr()) {
      return err(treeIdResult.error);
    }
    return ok({
      id: treeIdResult.value,
      position: positionResult.value,
      layout: {
        nodes: [],
        connections: [],
        dimensions: dimensionsResult.value,
      },
      bounds: dimensionsResult.value,
    });
  }

  /**
   * Get the default layout configuration
   */
  getDefaultConfig(): TypedTreeLayoutConfig {
    return this.defaultConfig;
  }

  /**
   * Create a custom layout configuration with typed overrides
   */
  createTypedConfig(
    config?: Partial<{
      nodeWidth: number;
      nodeHeight: number;
      verticalSpacing: number;
      horizontalSpacing: number;
      treeSpacing: number;
      canvasMargin: number;
    }>,
  ): Result<TypedTreeLayoutConfig, ValidationError> {
    if (!config) {
      return ok(this.defaultConfig);
    }

    const defaultRaw = this.defaultConfig.toRaw();
    const configResult = TypedTreeLayoutConfig.create({
      nodeWidth: config.nodeWidth ?? defaultRaw.nodeWidth,
      nodeHeight: config.nodeHeight ?? defaultRaw.nodeHeight,
      verticalSpacing: config.verticalSpacing ?? defaultRaw.verticalSpacing,
      horizontalSpacing: config.horizontalSpacing ?? defaultRaw.horizontalSpacing,
      treeSpacing: config.treeSpacing ?? defaultRaw.treeSpacing,
      canvasMargin: config.canvasMargin ?? defaultRaw.canvasMargin,
    });

    return configResult;
  }
}
