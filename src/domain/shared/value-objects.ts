// Simple UUID generation for development
function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Number compatibility functions
function isInteger(value: number): boolean {
  return (
    typeof value === 'number' && globalThis.Number.isFinite(value) && Math.floor(value) === value
  );
}

function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && globalThis.Number.isFinite(value);
}

import { err, ok, type Result, ValidationError } from './result.js';

export abstract class ValueObject<T> {
  constructor(protected readonly value: T) {}

  equals(other: ValueObject<T>): boolean {
    return this.value === other.value;
  }

  getValue(): T {
    return this.value;
  }

  toString(): string {
    return String(this.value);
  }
}

declare const StatementIdBrand: unique symbol;
declare const OrderedSetIdBrand: unique symbol;
declare const AtomicArgumentIdBrand: unique symbol;
declare const NodeIdBrand: unique symbol;
declare const TreeIdBrand: unique symbol;
declare const DocumentIdBrand: unique symbol;
declare const PackageIdBrand: unique symbol;
declare const ProofIdBrand: unique symbol;
declare const ProofTreeIdBrand: unique symbol;

type BrandedStatementId = string & { readonly [StatementIdBrand]: never };
type BrandedOrderedSetId = string & { readonly [OrderedSetIdBrand]: never };
type BrandedAtomicArgumentId = string & { readonly [AtomicArgumentIdBrand]: never };
type BrandedNodeId = string & { readonly [NodeIdBrand]: never };
type BrandedTreeId = string & { readonly [TreeIdBrand]: never };
type BrandedDocumentId = string & { readonly [DocumentIdBrand]: never };
type BrandedPackageId = string & { readonly [PackageIdBrand]: never };
type BrandedProofId = string & { readonly [ProofIdBrand]: never };
type BrandedProofTreeId = string & { readonly [ProofTreeIdBrand]: never };

export class StatementId extends ValueObject<BrandedStatementId> {
  private constructor(value: string) {
    super(value as BrandedStatementId);
  }

  static create(value: string): Result<StatementId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('StatementId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('StatementId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new StatementId(value.trim()));
  }

  static generate(): StatementId {
    return new StatementId(randomUUID());
  }

  static fromString(value: string): StatementId {
    const result = StatementId.create(value);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
}

export class OrderedSetId extends ValueObject<BrandedOrderedSetId> {
  private constructor(value: string) {
    super(value as BrandedOrderedSetId);
  }

  static create(value: string): Result<OrderedSetId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('OrderedSetId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('OrderedSetId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new OrderedSetId(value.trim()));
  }

  static generate(): OrderedSetId {
    return new OrderedSetId(randomUUID());
  }

  static fromString(value: string): OrderedSetId {
    const result = OrderedSetId.create(value);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
}

export class AtomicArgumentId extends ValueObject<BrandedAtomicArgumentId> {
  private constructor(value: string) {
    super(value as BrandedAtomicArgumentId);
  }

  static create(value: string): Result<AtomicArgumentId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(
        new ValidationError('AtomicArgumentId cannot be empty', { field: 'value', value }),
      );
    }

    if (value.length > 255) {
      return err(
        new ValidationError('AtomicArgumentId cannot exceed 255 characters', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new AtomicArgumentId(value.trim()));
  }

  static generate(): AtomicArgumentId {
    return new AtomicArgumentId(randomUUID());
  }

  static fromString(value: string): AtomicArgumentId {
    const result = AtomicArgumentId.create(value);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
}

export class NodeId extends ValueObject<BrandedNodeId> {
  private constructor(value: string) {
    super(value as BrandedNodeId);
  }

  static create(value: string): Result<NodeId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('NodeId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('NodeId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new NodeId(value.trim()));
  }

  static generate(): NodeId {
    return new NodeId(randomUUID());
  }

  static fromString(value: string): NodeId {
    const result = NodeId.create(value);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
}

export class TreeId extends ValueObject<BrandedTreeId> {
  private constructor(value: string) {
    super(value as BrandedTreeId);
  }

  static create(value: string): Result<TreeId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('TreeId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('TreeId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new TreeId(value.trim()));
  }

  static generate(): TreeId {
    return new TreeId(randomUUID());
  }

  static fromString(value: string): TreeId {
    const result = TreeId.create(value);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
}

export class DocumentId extends ValueObject<BrandedDocumentId> {
  private constructor(value: string) {
    super(value as BrandedDocumentId);
  }

  static create(value: string): Result<DocumentId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('DocumentId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('DocumentId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new DocumentId(value.trim()));
  }

  static generate(): DocumentId {
    return new DocumentId(randomUUID());
  }

  static fromString(value: string): DocumentId {
    const result = DocumentId.create(value);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
}

export class PackageId extends ValueObject<BrandedPackageId> {
  private constructor(value: string) {
    super(value as BrandedPackageId);
  }

  static create(value: string): Result<PackageId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('PackageId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('PackageId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new PackageId(value.trim()));
  }

  static generate(): PackageId {
    return new PackageId(randomUUID());
  }

  static fromString(value: string): PackageId {
    const result = PackageId.create(value);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
}

export class StatementContent extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<StatementContent, ValidationError> {
    if (value === null || value === undefined) {
      return err(
        new ValidationError('StatementContent cannot be null or undefined', {
          field: 'value',
          value,
        }),
      );
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return err(
        new ValidationError('StatementContent cannot be empty', { field: 'value', value }),
      );
    }

    if (trimmed.length > 10000) {
      return err(
        new ValidationError('StatementContent cannot exceed 10000 characters', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new StatementContent(trimmed));
  }

  static fromString(value: string): StatementContent {
    const result = StatementContent.create(value);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }

  get isEmpty(): boolean {
    return this.value.length === 0;
  }

  get wordCount(): number {
    return this.value.split(/\s+/).filter((word) => word.length > 0).length;
  }
}

export class Version extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<Version, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('Version must be a non-negative integer', { field: 'value', value }),
      );
    }

    return ok(new Version(value));
  }

  static initial(): Version {
    return new Version(0);
  }

  nextVersion(): Version {
    return new Version(this.value + 1);
  }

  isAfter(other: Version): boolean {
    return this.value > other.value;
  }

  isBefore(other: Version): boolean {
    return this.value < other.value;
  }
}

export class Timestamp extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<Timestamp, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('Timestamp must be a non-negative integer', { field: 'value', value }),
      );
    }

    return ok(new Timestamp(value));
  }

  static now(): Timestamp {
    return new Timestamp(Date.now());
  }

  static fromDate(date: Date): Timestamp {
    return new Timestamp(date.getTime());
  }

  toDate(): Date {
    return new Date(this.value);
  }

  isAfter(other: Timestamp): boolean {
    return this.value > other.value;
  }

  isBefore(other: Timestamp): boolean {
    return this.value < other.value;
  }
}

export class Position2D {
  private constructor(
    private readonly x: number,
    private readonly y: number,
  ) {}

  static create(x: number, y: number): Result<Position2D, ValidationError> {
    if (!isFiniteNumber(x)) {
      return err(
        new ValidationError('X coordinate must be a finite number', { field: 'x', value: x }),
      );
    }

    if (!isFiniteNumber(y)) {
      return err(
        new ValidationError('Y coordinate must be a finite number', { field: 'y', value: y }),
      );
    }

    return ok(new Position2D(x, y));
  }

  static origin(): Position2D {
    return new Position2D(0, 0);
  }

  getX(): number {
    return this.x;
  }

  getY(): number {
    return this.y;
  }

  moveBy(deltaX: number, deltaY: number): Result<Position2D, ValidationError> {
    return Position2D.create(this.x + deltaX, this.y + deltaY);
  }

  distanceTo(other: Position2D): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  equals(other: Position2D): boolean {
    return this.x === other.x && this.y === other.y;
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}

export class Attachment {
  private constructor(
    private readonly parentNodeId: NodeId,
    private readonly premisePosition: number,
    private readonly fromPosition?: number,
  ) {}

  static create(
    parentNodeId: NodeId,
    premisePosition: number,
    fromPosition?: number,
  ): Result<Attachment, ValidationError> {
    if (premisePosition < 0 || !isInteger(premisePosition)) {
      return err(
        new ValidationError('Premise position must be a non-negative integer', {
          field: 'premisePosition',
          value: premisePosition,
        }),
      );
    }

    if (fromPosition !== undefined && (fromPosition < 0 || !isInteger(fromPosition))) {
      return err(
        new ValidationError('From position must be a non-negative integer', {
          field: 'fromPosition',
          value: fromPosition,
        }),
      );
    }

    return ok(new Attachment(parentNodeId, premisePosition, fromPosition));
  }

  getParentNodeId(): NodeId {
    return this.parentNodeId;
  }

  getPremisePosition(): number {
    return this.premisePosition;
  }

  getFromPosition(): number | undefined {
    return this.fromPosition;
  }

  hasMultipleConclusionSource(): boolean {
    return this.fromPosition !== undefined;
  }

  equals(other: Attachment): boolean {
    return (
      this.parentNodeId.equals(other.parentNodeId) &&
      this.premisePosition === other.premisePosition &&
      this.fromPosition === other.fromPosition
    );
  }

  toString(): string {
    const baseInfo = `parent=${this.parentNodeId.getValue()}, position=${this.premisePosition}`;
    return this.fromPosition !== undefined ? `${baseInfo}, from=${this.fromPosition}` : baseInfo;
  }
}

export type LayoutStyle = 'bottom-up' | 'top-down' | 'left-right' | 'right-left';
export type ExpansionDirection = 'horizontal' | 'vertical' | 'radial';
export type AlignmentMode = 'left' | 'center' | 'right' | 'justify';

export class PhysicalProperties {
  private constructor(
    private readonly layoutStyle: LayoutStyle,
    private readonly spacingX: number,
    private readonly spacingY: number,
    private readonly minWidth: number,
    private readonly minHeight: number,
    private readonly expansionDirection: ExpansionDirection,
    private readonly alignmentMode: AlignmentMode,
  ) {}

  static create(
    layoutStyle: LayoutStyle = 'bottom-up',
    spacingX = 50,
    spacingY = 40,
    minWidth = 100,
    minHeight = 80,
    expansionDirection: ExpansionDirection = 'vertical',
    alignmentMode: AlignmentMode = 'center',
  ): Result<PhysicalProperties, ValidationError> {
    if (spacingX < 0 || !isFiniteNumber(spacingX)) {
      return err(
        new ValidationError('Horizontal spacing must be non-negative and finite', {
          field: 'spacingX',
          value: spacingX,
        }),
      );
    }

    if (spacingY < 0 || !isFiniteNumber(spacingY)) {
      return err(
        new ValidationError('Vertical spacing must be non-negative and finite', {
          field: 'spacingY',
          value: spacingY,
        }),
      );
    }

    if (minWidth <= 0 || !isFiniteNumber(minWidth)) {
      return err(
        new ValidationError('Minimum width must be positive and finite', {
          field: 'minWidth',
          value: minWidth,
        }),
      );
    }

    if (minHeight <= 0 || !isFiniteNumber(minHeight)) {
      return err(
        new ValidationError('Minimum height must be positive and finite', {
          field: 'minHeight',
          value: minHeight,
        }),
      );
    }

    return ok(
      new PhysicalProperties(
        layoutStyle,
        spacingX,
        spacingY,
        minWidth,
        minHeight,
        expansionDirection,
        alignmentMode,
      ),
    );
  }

  static default(): PhysicalProperties {
    return new PhysicalProperties('bottom-up', 50, 40, 100, 80, 'vertical', 'center');
  }

  getLayoutStyle(): LayoutStyle {
    return this.layoutStyle;
  }

  getSpacingX(): number {
    return this.spacingX;
  }

  getSpacingY(): number {
    return this.spacingY;
  }

  getMinWidth(): number {
    return this.minWidth;
  }

  getMinHeight(): number {
    return this.minHeight;
  }

  getExpansionDirection(): ExpansionDirection {
    return this.expansionDirection;
  }

  getAlignmentMode(): AlignmentMode {
    return this.alignmentMode;
  }

  withLayoutStyle(layoutStyle: LayoutStyle): Result<PhysicalProperties, ValidationError> {
    return PhysicalProperties.create(
      layoutStyle,
      this.spacingX,
      this.spacingY,
      this.minWidth,
      this.minHeight,
      this.expansionDirection,
      this.alignmentMode,
    );
  }

  withSpacing(spacingX: number, spacingY: number): Result<PhysicalProperties, ValidationError> {
    return PhysicalProperties.create(
      this.layoutStyle,
      spacingX,
      spacingY,
      this.minWidth,
      this.minHeight,
      this.expansionDirection,
      this.alignmentMode,
    );
  }

  withMinDimensions(
    minWidth: number,
    minHeight: number,
  ): Result<PhysicalProperties, ValidationError> {
    return PhysicalProperties.create(
      this.layoutStyle,
      this.spacingX,
      this.spacingY,
      minWidth,
      minHeight,
      this.expansionDirection,
      this.alignmentMode,
    );
  }

  withExpansionDirection(
    expansionDirection: ExpansionDirection,
  ): Result<PhysicalProperties, ValidationError> {
    return PhysicalProperties.create(
      this.layoutStyle,
      this.spacingX,
      this.spacingY,
      this.minWidth,
      this.minHeight,
      expansionDirection,
      this.alignmentMode,
    );
  }

  withAlignmentMode(alignmentMode: AlignmentMode): Result<PhysicalProperties, ValidationError> {
    return PhysicalProperties.create(
      this.layoutStyle,
      this.spacingX,
      this.spacingY,
      this.minWidth,
      this.minHeight,
      this.expansionDirection,
      alignmentMode,
    );
  }

  isBottomUpFlow(): boolean {
    return this.layoutStyle === 'bottom-up';
  }

  isTopDownFlow(): boolean {
    return this.layoutStyle === 'top-down';
  }

  isHorizontalFlow(): boolean {
    return this.layoutStyle === 'left-right' || this.layoutStyle === 'right-left';
  }

  isVerticalFlow(): boolean {
    return this.layoutStyle === 'bottom-up' || this.layoutStyle === 'top-down';
  }

  equals(other: PhysicalProperties): boolean {
    return (
      this.layoutStyle === other.layoutStyle &&
      this.spacingX === other.spacingX &&
      this.spacingY === other.spacingY &&
      this.minWidth === other.minWidth &&
      this.minHeight === other.minHeight &&
      this.expansionDirection === other.expansionDirection &&
      this.alignmentMode === other.alignmentMode
    );
  }

  toString(): string {
    return `${this.layoutStyle}(${this.spacingX}×${this.spacingY}, min:${this.minWidth}×${this.minHeight})`;
  }
}

export class ProofId extends ValueObject<BrandedProofId> {
  private constructor(value: string) {
    super(value as BrandedProofId);
  }

  static create(value: string): Result<ProofId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('ProofId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('ProofId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new ProofId(value.trim()));
  }

  static generate(): ProofId {
    return new ProofId(randomUUID());
  }

  static fromString(value: string): ProofId {
    const result = ProofId.create(value);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
}

export class ProofTreeId extends ValueObject<BrandedProofTreeId> {
  private constructor(value: string) {
    super(value as BrandedProofTreeId);
  }

  static create(value: string): Result<ProofTreeId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('ProofTreeId cannot be empty', { field: 'value', value }));
    }

    if (value.length > 255) {
      return err(
        new ValidationError('ProofTreeId cannot exceed 255 characters', { field: 'value', value }),
      );
    }

    return ok(new ProofTreeId(value.trim()));
  }

  static generate(): ProofTreeId {
    return new ProofTreeId(randomUUID());
  }

  static fromString(value: string): ProofTreeId {
    const result = ProofTreeId.create(value);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
}
