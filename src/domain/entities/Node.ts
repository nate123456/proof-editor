import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../shared/result.js';
import {
  type AtomicArgumentId,
  type Attachment,
  NodeId,
  Timestamp,
} from '../shared/value-objects/index.js';

export class Node {
  private constructor(
    private readonly id: NodeId,
    private readonly argumentId: AtomicArgumentId,
    private attachment: Attachment | null,
    private readonly createdAt: Timestamp,
    private modifiedAt: Timestamp,
  ) {}

  /**
   * @deprecated Use NodeFactory.createRoot() instead
   */
  static createRoot(argumentId: AtomicArgumentId): Result<Node, ValidationError> {
    const now = Timestamp.now();

    return ok(new Node(NodeId.generate(), argumentId, null, now, now));
  }

  /**
   * @deprecated Use NodeFactory.createChild() instead
   */
  static createChild(
    argumentId: AtomicArgumentId,
    attachment: Attachment,
  ): Result<Node, ValidationError> {
    const now = Timestamp.now();

    return ok(new Node(NodeId.generate(), argumentId, attachment, now, now));
  }

  static reconstruct(
    id: NodeId,
    argumentId: AtomicArgumentId,
    attachment: Attachment | null,
    createdAt: number,
    modifiedAt: number,
  ): Result<Node, ValidationError> {
    const createdAtTimestamp = Timestamp.create(createdAt);
    if (createdAtTimestamp.isErr()) {
      return err(createdAtTimestamp.error);
    }

    const modifiedAtTimestamp = Timestamp.create(modifiedAt);
    if (modifiedAtTimestamp.isErr()) {
      return err(modifiedAtTimestamp.error);
    }

    return ok(
      new Node(id, argumentId, attachment, createdAtTimestamp.value, modifiedAtTimestamp.value),
    );
  }

  getId(): NodeId {
    return this.id;
  }

  getArgumentId(): AtomicArgumentId {
    return this.argumentId;
  }

  getAttachment(): Attachment | null {
    return this.attachment;
  }

  getCreatedAt(): number {
    return this.createdAt.getValue();
  }

  getModifiedAt(): number {
    return this.modifiedAt.getValue();
  }

  isRoot(): boolean {
    return this.attachment === null;
  }

  isChild(): boolean {
    return this.attachment !== null;
  }

  getParentNodeId(): NodeId | null {
    return this.attachment?.getParentNodeId() ?? null;
  }

  getPremisePosition(): number | null {
    return this.attachment?.getPremisePosition() ?? null;
  }

  getFromPosition(): number | null {
    return this.attachment?.getFromPosition() ?? null;
  }

  hasMultipleConclusionSource(): boolean {
    return this.attachment?.hasMultipleConclusionSource() ?? false;
  }

  attachToParent(attachment: Attachment): Result<void, ValidationError> {
    if (this.attachment !== null) {
      return err(new ValidationError('Node is already attached to a parent'));
    }

    this.attachment = attachment;
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  detachFromParent(): Result<void, ValidationError> {
    if (this.attachment === null) {
      return err(new ValidationError('Node is not attached to a parent'));
    }

    this.attachment = null;
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  changeAttachment(newAttachment: Attachment): Result<void, ValidationError> {
    if (this.attachment === null) {
      return err(new ValidationError('Cannot change attachment of root node'));
    }

    this.attachment = newAttachment;
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  isChildOf(parentNodeId: NodeId): boolean {
    return this.attachment?.getParentNodeId().equals(parentNodeId) ?? false;
  }

  feedsInputToParentAt(position: number): boolean {
    return this.attachment?.getPremisePosition() === position;
  }

  usesParentsConclusionFrom(position: number): boolean {
    return this.attachment?.getFromPosition() === position;
  }

  canProvideInputToParent(): boolean {
    return this.attachment !== null;
  }

  providesBottomUpFlow(): boolean {
    return this.isChild();
  }

  equals(other: Node): boolean {
    return this.id.equals(other.id);
  }

  toString(): string {
    if (this.isRoot()) {
      return `Root[${this.argumentId.getValue()}]`;
    }

    const parentId = this.attachment?.getParentNodeId().getValue();
    const position = this.attachment?.getPremisePosition();
    const fromPos = this.attachment?.getFromPosition();

    return fromPos !== undefined
      ? `Child[${this.argumentId.getValue()}→${parentId}:${position}:${fromPos}]`
      : `Child[${this.argumentId.getValue()}→${parentId}:${position}]`;
  }

  static fromFactory(
    id: NodeId,
    argumentId: AtomicArgumentId,
    attachment: Attachment | null,
    createdAt: Timestamp,
    modifiedAt: Timestamp,
  ): Node {
    return new Node(id, argumentId, attachment, createdAt, modifiedAt);
  }
}
