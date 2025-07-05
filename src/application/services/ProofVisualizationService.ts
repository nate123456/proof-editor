import { err, ok, type Result } from 'neverthrow';
import { inject, injectable } from 'tsyringe';
import { ValidationError } from '../../domain/shared/result.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { ProofVisualizationConfig, ProofVisualizationDTO } from '../dtos/view-dtos.js';
import type { DocumentDTO } from '../queries/document-queries.js';
import type { TreeLayoutService } from './TreeLayoutService.js';

@injectable()
export class ProofVisualizationService {
  private readonly defaultConfig: ProofVisualizationConfig = {
    layout: {
      nodeWidth: 220,
      nodeHeight: 120,
      verticalSpacing: 180,
      horizontalSpacing: 280,
      treeSpacing: 150,
      canvasMargin: 50,
    },
    performance: {
      maxTreesRendered: 50,
      maxNodesPerTree: 100,
      enableVirtualization: true,
    },
    visual: {
      showConnectionLabels: false,
      highlightCriticalPath: false,
      showValidationErrors: true,
    },
  };

  constructor(
    @inject(TOKENS.TreeLayoutService) private readonly layoutService: TreeLayoutService,
  ) {}

  /**
   * Generate complete visualization data for a proof document
   */
  generateVisualization(
    document: DocumentDTO,
    config: Partial<ProofVisualizationConfig> = {},
  ): Result<ProofVisualizationDTO, ValidationError> {
    try {
      const visualizationConfig = this.mergeConfigs(config);

      // Validate document before processing
      const validationResult = this.validateDocument(document, visualizationConfig);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      // Calculate layouts for all trees
      const layoutResult = this.layoutService.calculateDocumentLayout(
        document,
        visualizationConfig.layout,
      );
      if (layoutResult.isErr()) {
        return err(layoutResult.error);
      }

      const trees = layoutResult.value;
      const isEmpty = trees.length === 0 || trees.every((t) => t.layout.nodes.length === 0);

      // Calculate total canvas dimensions
      const totalDimensions = this.calculateTotalDimensions(trees);

      // Apply post-processing enhancements
      const enhancedTrees = this.applyVisualEnhancements(trees, visualizationConfig);

      return ok({
        documentId: document.id,
        version: document.version,
        trees: enhancedTrees,
        totalDimensions,
        isEmpty,
      });
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to generate proof visualization: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Generate visualization with performance optimizations for large documents
   */
  generateOptimizedVisualization(
    document: DocumentDTO,
    viewport: { width: number; height: number; offsetX: number; offsetY: number },
    config: Partial<ProofVisualizationConfig> = {},
  ): Result<ProofVisualizationDTO, ValidationError> {
    try {
      const visualizationConfig = this.mergeConfigs(config);

      if (!visualizationConfig.performance.enableVirtualization) {
        return this.generateVisualization(document, config);
      }

      // Filter trees that are visible in the viewport
      const visibleTrees = this.filterVisibleTrees(document, viewport);

      // Create a filtered document with only visible content
      const filteredDocument: DocumentDTO = {
        ...document,
        trees: visibleTrees,
      };

      return this.generateVisualization(filteredDocument, config);
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to generate optimized visualization: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Validate document constraints for visualization
   */
  private validateDocument(
    document: DocumentDTO,
    config: ProofVisualizationConfig,
  ): Result<void, ValidationError> {
    const treeCount = Object.keys(document.trees).length;
    if (treeCount > config.performance.maxTreesRendered) {
      return err(
        new ValidationError(
          `Document contains ${treeCount} trees, exceeding maximum of ${config.performance.maxTreesRendered}. Use optimized visualization instead.`,
        ),
      );
    }

    // Validate each tree doesn't exceed node limits
    for (const [treeId, tree] of Object.entries(document.trees)) {
      if (tree.nodeCount > config.performance.maxNodesPerTree) {
        return err(
          new ValidationError(
            `Tree ${treeId} contains ${tree.nodeCount} nodes, exceeding maximum of ${config.performance.maxNodesPerTree}.`,
          ),
        );
      }
    }

    return ok(undefined);
  }

  /**
   * Calculate total canvas dimensions for all trees
   */
  private calculateTotalDimensions(trees: import('../dtos/view-dtos.js').TreeRenderDTO[]): {
    width: number;
    height: number;
  } {
    if (trees.length === 0) {
      return { width: 400, height: 200 };
    }

    const maxWidth = Math.max(...trees.map((t) => t.bounds.width));
    const totalHeight = trees.reduce((sum, t) => sum + t.bounds.height, 0);
    const spacingBetweenTrees = (trees.length - 1) * this.defaultConfig.layout.treeSpacing;

    return {
      width: maxWidth + 100, // Add margin
      height: totalHeight + spacingBetweenTrees + 100, // Add spacing and margin
    };
  }

  /**
   * Apply visual enhancements to rendered trees
   */
  private applyVisualEnhancements(
    trees: import('../dtos/view-dtos.js').TreeRenderDTO[],
    config: ProofVisualizationConfig,
  ): import('../dtos/view-dtos.js').TreeRenderDTO[] {
    if (!config.visual.showConnectionLabels && !config.visual.highlightCriticalPath) {
      return trees; // No enhancements needed
    }

    return trees.map((tree) => ({
      ...tree,
      layout: {
        ...tree.layout,
        connections: tree.layout.connections.map((connection) => {
          // Add connection enhancements here if needed
          return connection;
        }),
      },
    }));
  }

  /**
   * Filter trees that are visible within the given viewport
   */
  private filterVisibleTrees(
    document: DocumentDTO,
    viewport: { width: number; height: number; offsetX: number; offsetY: number },
  ): Record<string, import('../queries/shared-types.js').TreeDTO> {
    const visibleTrees: Record<string, import('../queries/shared-types.js').TreeDTO> = {};

    for (const [treeId, tree] of Object.entries(document.trees)) {
      if (this.isTreeInViewport(tree, viewport)) {
        visibleTrees[treeId] = tree;
      }
    }

    return visibleTrees;
  }

  /**
   * Check if a tree intersects with the viewport
   */
  private isTreeInViewport(
    tree: import('../queries/shared-types.js').TreeDTO,
    viewport: { width: number; height: number; offsetX: number; offsetY: number },
  ): boolean {
    const treeBounds = tree.bounds || { width: 400, height: 200 };

    const treeLeft = tree.position.x;
    const treeRight = tree.position.x + treeBounds.width;
    const treeTop = tree.position.y;
    const treeBottom = tree.position.y + treeBounds.height;

    const viewportLeft = viewport.offsetX;
    const viewportRight = viewport.offsetX + viewport.width;
    const viewportTop = viewport.offsetY;
    const viewportBottom = viewport.offsetY + viewport.height;

    // Check for intersection
    return (
      treeLeft < viewportRight &&
      treeRight > viewportLeft &&
      treeTop < viewportBottom &&
      treeBottom > viewportTop
    );
  }

  /**
   * Merge user configuration with defaults
   */
  private mergeConfigs(config: Partial<ProofVisualizationConfig>): ProofVisualizationConfig {
    return {
      layout: { ...this.defaultConfig.layout, ...config.layout },
      performance: { ...this.defaultConfig.performance, ...config.performance },
      visual: { ...this.defaultConfig.visual, ...config.visual },
    };
  }

  /**
   * Get default visualization configuration
   */
  getDefaultConfig(): ProofVisualizationConfig {
    return JSON.parse(JSON.stringify(this.defaultConfig));
  }

  /**
   * Create a custom visualization configuration
   */
  createConfig(overrides: Partial<ProofVisualizationConfig>): ProofVisualizationConfig {
    return this.mergeConfigs(overrides);
  }

  /**
   * Get visualization statistics for analysis
   */
  getVisualizationStats(document: DocumentDTO): Result<
    {
      totalTrees: number;
      totalNodes: number;
      totalConnections: number;
      largestTree: { id: string; nodeCount: number };
      estimatedRenderTime: number;
    },
    ValidationError
  > {
    try {
      const totalTrees = Object.keys(document.trees).length;
      let totalNodes = 0;
      let totalConnections = 0;
      let largestTree = { id: '', nodeCount: 0 };

      for (const [treeId, tree] of Object.entries(document.trees)) {
        totalNodes += tree.nodeCount;
        // Estimate connections as nodeCount - rootNodeCount for tree structures
        const treeConnections = Math.max(0, tree.nodeCount - tree.rootNodeIds.length);
        totalConnections += treeConnections;

        if (tree.nodeCount > largestTree.nodeCount) {
          largestTree = { id: treeId, nodeCount: tree.nodeCount };
        }
      }

      // Rough estimation: 1ms per node + 0.5ms per connection
      const estimatedRenderTime = totalNodes * 1 + totalConnections * 0.5;

      return ok({
        totalTrees,
        totalNodes,
        totalConnections,
        largestTree,
        estimatedRenderTime,
      });
    } catch (error) {
      return err(
        new ValidationError(
          `Failed to calculate visualization stats: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
