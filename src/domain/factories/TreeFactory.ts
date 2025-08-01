import { err, ok, type Result } from 'neverthrow';
import { Tree } from '../entities/Tree.js';
import { TreeBoundsCalculationService } from '../services/TreeBoundsCalculationService.js';
import type { ValidationError } from '../shared/result.js';
import {
  DocumentId,
  type NodeId,
  PhysicalProperties,
  Timestamp,
  Title,
  TreeId,
} from '../shared/value-objects/index.js';
import { TreePosition } from '../value-objects/TreePosition.js';

export const createTree = (
  documentId: string,
  position: TreePosition = TreePosition.origin(),
  physicalProperties: PhysicalProperties = PhysicalProperties.default(),
  title?: string,
): Result<Tree, ValidationError> => {
  const documentIdResult = DocumentId.create(documentId);
  if (documentIdResult.isErr()) {
    return err(documentIdResult.error);
  }

  let titleResult: Title | undefined;
  if (title !== undefined) {
    const titleCreateResult = Title.create(title);
    if (titleCreateResult.isErr()) {
      return err(titleCreateResult.error);
    }
    titleResult = titleCreateResult.value;
  }

  const now = Timestamp.now();
  const id = TreeId.generate();

  return createTreeInternal(
    id,
    documentIdResult.value,
    position,
    physicalProperties,
    new Set(),
    now,
    now,
    titleResult,
  );
};

export const reconstructTree = (
  id: TreeId,
  documentId: string,
  position: TreePosition,
  physicalProperties: PhysicalProperties,
  nodeIds: NodeId[],
  createdAt: number,
  modifiedAt: number,
  title?: string,
): Result<Tree, ValidationError> => {
  const documentIdResult = DocumentId.create(documentId);
  if (documentIdResult.isErr()) {
    return err(documentIdResult.error);
  }

  const timestampCreatedResult = Timestamp.create(createdAt);
  if (timestampCreatedResult.isErr()) {
    return err(timestampCreatedResult.error);
  }

  const timestampModifiedResult = Timestamp.create(modifiedAt);
  if (timestampModifiedResult.isErr()) {
    return err(timestampModifiedResult.error);
  }

  let titleResult: Title | undefined;
  if (title !== undefined) {
    const titleCreateResult = Title.create(title);
    if (titleCreateResult.isErr()) {
      return err(titleCreateResult.error);
    }
    titleResult = titleCreateResult.value;
  }

  return createTreeInternal(
    id,
    documentIdResult.value,
    position,
    physicalProperties,
    new Set(nodeIds),
    timestampCreatedResult.value,
    timestampModifiedResult.value,
    titleResult,
  );
};

const createTreeInternal = (
  id: TreeId,
  documentId: DocumentId,
  position: TreePosition,
  physicalProperties: PhysicalProperties,
  nodeIds: Set<NodeId>,
  createdAt: Timestamp,
  modifiedAt: Timestamp,
  title?: Title,
): Result<Tree, ValidationError> => {
  try {
    const tree = Tree.fromFactory(
      id,
      documentId,
      position,
      physicalProperties,
      nodeIds,
      createdAt,
      modifiedAt,
      title,
      new TreeBoundsCalculationService(),
    );
    return ok(tree);
  } catch (error) {
    return err(error as ValidationError);
  }
};
