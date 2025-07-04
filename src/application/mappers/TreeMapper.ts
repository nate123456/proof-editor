import { err, ok, type Result } from 'neverthrow';
import { Tree } from '../../domain/entities/Tree.js';
import type { ValidationError } from '../../domain/shared/result.js';
import { PhysicalProperties, Position2D, TreeId } from '../../domain/shared/value-objects.js';
import type { TreeDTO } from '../queries/shared-types.js';

/**
 * Converts a Tree domain entity to a TreeDTO
 */
export function treeToDTO(tree: Tree): TreeDTO {
  const position = tree.getPosition();
  const physicalProperties = tree.getPhysicalProperties();

  return {
    id: tree.getId().getValue(),
    position: {
      x: position.getX(),
      y: position.getY(),
    },
    bounds: {
      width: physicalProperties.getMinWidth(),
      height: physicalProperties.getMinHeight(),
    },
    nodeCount: tree.getNodeCount(),
    rootNodeIds: tree
      .getNodeIds()
      .filter((nodeId) => {
        const node = tree.getNode(nodeId);
        return node && node.getParentId() === null;
      })
      .map((nodeId) => nodeId.getValue()),
  };
}

/**
 * Converts a TreeDTO to a Tree domain entity
 * Note: This creates a Tree without nodes since TreeDTO doesn't contain node data
 */
export function treeToDomain(dto: TreeDTO, documentId: string): Result<Tree, ValidationError> {
  // Parse the tree ID
  const treeIdResult = TreeId.create(dto.id);
  if (treeIdResult.isErr()) {
    return err(treeIdResult.error);
  }

  // Parse position
  const positionResult = Position2D.create(dto.position.x, dto.position.y);
  if (positionResult.isErr()) {
    return err(positionResult.error);
  }

  // Create physical properties using bounds if available, otherwise use defaults
  let physicalProperties: PhysicalProperties;
  if (dto.bounds) {
    const physicalPropsResult = PhysicalProperties.create(
      'bottom-up', // Default layout style
      20, // Default spacing X
      20, // Default spacing Y
      dto.bounds.width,
      dto.bounds.height,
      'horizontal', // Default expansion direction
      'center', // Default alignment mode
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
    positionResult.value,
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
