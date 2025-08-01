import { err, ok, type Result } from 'neverthrow';
import { Node } from '../entities/Node.js';
import type { ValidationError } from '../shared/result.js';
import {
  type AtomicArgumentId,
  type Attachment,
  NodeId,
  Timestamp,
} from '../shared/value-objects/index.js';

export const createRootNode = (argumentId: AtomicArgumentId): Result<Node, ValidationError> => {
  const now = Timestamp.now();
  const id = NodeId.generate();

  return createNodeInternal(id, argumentId, null, now, now);
};

export const createChildNode = (
  argumentId: AtomicArgumentId,
  attachment: Attachment,
): Result<Node, ValidationError> => {
  const now = Timestamp.now();
  const id = NodeId.generate();

  return createNodeInternal(id, argumentId, attachment, now, now);
};

export const reconstructNode = (
  id: NodeId,
  argumentId: AtomicArgumentId,
  attachment: Attachment | null,
  createdAt: number,
  modifiedAt: number,
): Result<Node, ValidationError> => {
  const createdAtTimestamp = Timestamp.create(createdAt);
  if (createdAtTimestamp.isErr()) {
    return err(createdAtTimestamp.error);
  }

  const modifiedAtTimestamp = Timestamp.create(modifiedAt);
  if (modifiedAtTimestamp.isErr()) {
    return err(modifiedAtTimestamp.error);
  }

  return createNodeInternal(
    id,
    argumentId,
    attachment,
    createdAtTimestamp.value,
    modifiedAtTimestamp.value,
  );
};

const createNodeInternal = (
  id: NodeId,
  argumentId: AtomicArgumentId,
  attachment: Attachment | null,
  createdAt: Timestamp,
  modifiedAt: Timestamp,
): Result<Node, ValidationError> => {
  try {
    const node = Node.fromFactory(id, argumentId, attachment, createdAt, modifiedAt);
    return ok(node);
  } catch (error) {
    return err(error as ValidationError);
  }
};
