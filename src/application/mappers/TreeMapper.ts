import { err, ok, type Result } from 'neverthrow';
import { Tree } from '../../domain/entities/Tree.js';
import type { ValidationError } from '../../domain/shared/result.js';
import {
  AlignmentMode,
  Dimensions,
  ExpansionDirection,
  LayoutStyle,
  NodeCount,
  PhysicalProperties,
  Position2D,
  TreeId,
} from '../../domain/shared/value-objects/index.js';
import { TreePosition } from '../../domain/value-objects/TreePosition.js';
import type { TreeDTO } from '../queries/shared-types.js';

/**
 * Converts a Tree domain entity to a TreeDTO
 */
export function treeToDTO(tree: Tree): TreeDTO {
  const treePosition = tree.getPosition();
  const physicalProperties = tree.getPhysicalProperties();

  // Convert TreePosition to Position2D for DTO
  const position2DResult = Position2D.create(treePosition.getX(), treePosition.getY());
  if (position2DResult.isErr()) {
    // This should never happen with valid tree data
    throw new Error(`Invalid position in tree: ${position2DResult.error.message}`);
  }

  // Convert physical properties to Dimensions for DTO
  const dimensionsResult = Dimensions.create(
    physicalProperties.getMinWidth(),
    physicalProperties.getMinHeight(),
  );
  if (dimensionsResult.isErr()) {
    // This should never happen with valid tree data
    throw new Error(`Invalid dimensions in tree: ${dimensionsResult.error.message}`);
  }

  // Create NodeCount value object
  const nodeCountResult = NodeCount.create(tree.getNodeCount());
  if (nodeCountResult.isErr()) {
    // This should never happen with valid tree data
    throw new Error(`Invalid node count in tree: ${nodeCountResult.error.message}`);
  }

  return {
    id: tree.getId(),
    position: position2DResult.value,
    bounds: dimensionsResult.value,
    nodeCount: nodeCountResult.value,
    rootNodeIds: tree.getNodeIds().filter((nodeId) => {
      const node = tree.getNode(nodeId);
      return node && node.getParentId() === null;
    }),
  };
}

/**
 * Converts a TreeDTO to a Tree domain entity
 * Note: This creates a Tree without nodes since TreeDTO doesn't contain node data
 */
export function treeToDomain(dto: TreeDTO, documentId: string): Result<Tree, ValidationError> {
  // Parse the tree ID
  const treeIdResult = TreeId.create(dto.id.getValue());
  if (treeIdResult.isErr()) {
    return err(treeIdResult.error);
  }

  // Parse position - TreeDTO uses Position2D but Tree entity needs TreePosition
  const treePositionResult = TreePosition.create(dto.position.getX(), dto.position.getY());
  if (treePositionResult.isErr()) {
    return err(treePositionResult.error);
  }

  // Create physical properties using bounds if available, otherwise use defaults
  let physicalProperties: PhysicalProperties;
  if (dto.bounds) {
    const physicalPropsResult = PhysicalProperties.create(
      LayoutStyle.bottomUp(), // Default layout style
      20, // Default spacing X
      20, // Default spacing Y
      dto.bounds.getWidth(),
      dto.bounds.getHeight(),
      ExpansionDirection.horizontal(), // Default expansion direction
      AlignmentMode.center(), // Default alignment mode
    );
    if (physicalPropsResult.isErr()) {
      return err(physicalPropsResult.error);
    }
    physicalProperties = physicalPropsResult.value;
  } else {
    physicalProperties = PhysicalProperties.default();
  }

  // Note: We don't have creation/modification timestamps in TreeDTO, so we use current time
  const now = Date.now();

  // Reconstruct the tree (without nodes since TreeDTO doesn't contain node structure)
  return Tree.reconstruct(
    treeIdResult.value,
    documentId,
    treePositionResult.value,
    physicalProperties,
    [], // Empty node list - TreeDTO doesn't contain node structure
    now,
    now,
  );
}

/**
 * Converts multiple Trees to DTOs
 */
export function treesToDTOs(trees: Tree[]): TreeDTO[] {
  return trees.map((tree) => treeToDTO(tree));
}

/**
 * Converts multiple TreeDTOs to Trees
 */
export function treesToDomains(
  dtos: TreeDTO[],
  documentId: string,
): Result<Tree[], ValidationError> {
  const trees: Tree[] = [];

  for (const dto of dtos) {
    const result = treeToDomain(dto, documentId);
    if (result.isErr()) {
      return err(result.error);
    }
    trees.push(result.value);
  }

  return ok(trees);
}
