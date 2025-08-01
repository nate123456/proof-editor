import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../result.js';
import { isFiniteNumber, isInteger, ValueObject } from './common.js';
import type { NodeId } from './identifiers.js';
import { AlignmentMode, ExpansionDirection, LayoutStyle } from './ui.js';

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

export class Dimensions {
  private constructor(
    private readonly width: number,
    private readonly height: number,
  ) {}

  static create(width: number, height: number): Result<Dimensions, ValidationError> {
    if (!isFiniteNumber(width) || width <= 0) {
      return err(
        new ValidationError('Width must be a positive finite number', {
          field: 'width',
          value: width,
        }),
      );
    }

    if (!isFiniteNumber(height) || height <= 0) {
      return err(
        new ValidationError('Height must be a positive finite number', {
          field: 'height',
          value: height,
        }),
      );
    }

    if (width > 100000 || height > 100000) {
      return err(
        new ValidationError('Dimensions cannot exceed 100,000 pixels', {
          field: 'dimensions',
          value: `${width}x${height}`,
        }),
      );
    }

    return ok(new Dimensions(width, height));
  }

  static square(size: number): Result<Dimensions, ValidationError> {
    return Dimensions.create(size, size);
  }

  static fullHD(): Dimensions {
    return new Dimensions(1920, 1080);
  }

  static fourK(): Dimensions {
    return new Dimensions(3840, 2160);
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getAspectRatio(): number {
    return this.width / this.height;
  }

  getArea(): number {
    return this.width * this.height;
  }

  isSquare(): boolean {
    return this.width === this.height;
  }

  isLandscape(): boolean {
    return this.width > this.height;
  }

  isPortrait(): boolean {
    return this.height > this.width;
  }

  scale(factor: number): Result<Dimensions, ValidationError> {
    if (!isFiniteNumber(factor) || factor <= 0) {
      return err(
        new ValidationError('Scale factor must be a positive finite number', {
          field: 'factor',
          value: factor,
        }),
      );
    }

    return Dimensions.create(this.width * factor, this.height * factor);
  }

  withWidth(width: number): Result<Dimensions, ValidationError> {
    return Dimensions.create(width, this.height);
  }

  withHeight(height: number): Result<Dimensions, ValidationError> {
    return Dimensions.create(this.width, height);
  }

  equals(other: Dimensions): boolean {
    return this.width === other.width && this.height === other.height;
  }

  toString(): string {
    return `${this.width}×${this.height}`;
  }
}

export class Spacing extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<Spacing, ValidationError> {
    if (!isFiniteNumber(value) || value < 0) {
      return err(
        new ValidationError('Spacing must be a non-negative finite number', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 10000) {
      return err(
        new ValidationError('Spacing cannot exceed 10,000 pixels', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new Spacing(value));
  }

  static zero(): Spacing {
    return new Spacing(0);
  }

  static small(): Spacing {
    return new Spacing(20);
  }

  static medium(): Spacing {
    return new Spacing(50);
  }

  static large(): Spacing {
    return new Spacing(100);
  }

  static fromNumber(value: number): Result<Spacing, ValidationError> {
    return Spacing.create(value);
  }

  add(other: Spacing): Result<Spacing, ValidationError> {
    return Spacing.create(this.value + other.value);
  }

  multiply(factor: number): Result<Spacing, ValidationError> {
    if (!isFiniteNumber(factor) || factor < 0) {
      return err(
        new ValidationError('Spacing multiplier must be a non-negative finite number', {
          field: 'factor',
          value: factor,
        }),
      );
    }
    return Spacing.create(this.value * factor);
  }

  isZero(): boolean {
    return this.value === 0;
  }
}

export class NodeDimension extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<NodeDimension, ValidationError> {
    if (!isFiniteNumber(value) || value <= 0) {
      return err(
        new ValidationError('Node dimension must be a positive finite number', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 5000) {
      return err(
        new ValidationError('Node dimension cannot exceed 5,000 pixels', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new NodeDimension(value));
  }

  static standard(): NodeDimension {
    return new NodeDimension(150);
  }

  static compact(): NodeDimension {
    return new NodeDimension(100);
  }

  static large(): NodeDimension {
    return new NodeDimension(250);
  }

  static fromNumber(value: number): Result<NodeDimension, ValidationError> {
    return NodeDimension.create(value);
  }

  scale(factor: number): Result<NodeDimension, ValidationError> {
    if (!isFiniteNumber(factor) || factor <= 0) {
      return err(
        new ValidationError('Scale factor must be a positive finite number', {
          field: 'factor',
          value: factor,
        }),
      );
    }
    return NodeDimension.create(this.value * factor);
  }
}

export class Margin extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<Margin, ValidationError> {
    if (!isFiniteNumber(value) || value < 0) {
      return err(
        new ValidationError('Margin must be a non-negative finite number', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 1000) {
      return err(
        new ValidationError('Margin cannot exceed 1,000 pixels', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new Margin(value));
  }

  static zero(): Margin {
    return new Margin(0);
  }

  static small(): Margin {
    return new Margin(10);
  }

  static medium(): Margin {
    return new Margin(25);
  }

  static large(): Margin {
    return new Margin(50);
  }

  static fromNumber(value: number): Result<Margin, ValidationError> {
    return Margin.create(value);
  }
}

export class PanelSize extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<PanelSize, ValidationError> {
    if (!isFiniteNumber(value) || value < 0) {
      return err(
        new ValidationError('Panel size must be a non-negative finite number', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 5000) {
      return err(
        new ValidationError('Panel size cannot exceed 5,000 pixels', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new PanelSize(value));
  }

  static fromNumber(value: number): Result<PanelSize, ValidationError> {
    return PanelSize.create(value);
  }

  static defaultSidebar(): PanelSize {
    return new PanelSize(300);
  }

  static collapsed(): PanelSize {
    return new PanelSize(0);
  }

  isCollapsed(): boolean {
    return this.value === 0;
  }

  isExpanded(): boolean {
    return this.value > 50;
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
    layoutStyle: LayoutStyle = LayoutStyle.bottomUp(),
    spacingX = 50,
    spacingY = 40,
    minWidth = 100,
    minHeight = 80,
    expansionDirection: ExpansionDirection = ExpansionDirection.vertical(),
    alignmentMode: AlignmentMode = AlignmentMode.center(),
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
    return new PhysicalProperties(
      LayoutStyle.bottomUp(),
      50,
      40,
      100,
      80,
      ExpansionDirection.vertical(),
      AlignmentMode.center(),
    );
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
    return this.layoutStyle.getValue() === 'bottom-up';
  }

  isTopDownFlow(): boolean {
    return this.layoutStyle.getValue() === 'top-down';
  }

  isHorizontalFlow(): boolean {
    return (
      this.layoutStyle.getValue() === 'left-right' || this.layoutStyle.getValue() === 'right-left'
    );
  }

  isVerticalFlow(): boolean {
    return (
      this.layoutStyle.getValue() === 'bottom-up' || this.layoutStyle.getValue() === 'top-down'
    );
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

export class NodePosition {
  private constructor(
    private readonly nodeId: NodeId,
    private readonly position: Position2D,
    private readonly level: number,
  ) {}

  static create(
    nodeId: NodeId,
    position: Position2D,
    level: number,
  ): Result<NodePosition, ValidationError> {
    if (!isInteger(level) || level < 0) {
      return err(
        new ValidationError('Level must be a non-negative integer', {
          field: 'level',
          value: level,
        }),
      );
    }

    if (level > 1000) {
      return err(
        new ValidationError('Level cannot exceed 1000 (depth protection)', {
          field: 'level',
          value: level,
        }),
      );
    }

    return ok(new NodePosition(nodeId, position, level));
  }

  static root(nodeId: NodeId, position: Position2D): NodePosition {
    return new NodePosition(nodeId, position, 0);
  }

  getNodeId(): NodeId {
    return this.nodeId;
  }

  getPosition(): Position2D {
    return this.position;
  }

  getLevel(): number {
    return this.level;
  }

  isRoot(): boolean {
    return this.level === 0;
  }

  isLeaf(): boolean {
    // This is a placeholder - actual leaf detection would require tree structure
    return false;
  }

  withPosition(position: Position2D): NodePosition {
    return new NodePosition(this.nodeId, position, this.level);
  }

  withLevel(level: number): Result<NodePosition, ValidationError> {
    return NodePosition.create(this.nodeId, this.position, level);
  }

  moveBy(deltaX: number, deltaY: number): Result<NodePosition, ValidationError> {
    const newPositionResult = this.position.moveBy(deltaX, deltaY);
    if (newPositionResult.isErr()) {
      return err(newPositionResult.error);
    }

    return ok(new NodePosition(this.nodeId, newPositionResult.value, this.level));
  }

  distanceTo(other: NodePosition): number {
    return this.position.distanceTo(other.position);
  }

  isSameLevel(other: NodePosition): boolean {
    return this.level === other.level;
  }

  isAbove(other: NodePosition): boolean {
    return this.level < other.level;
  }

  isBelow(other: NodePosition): boolean {
    return this.level > other.level;
  }

  equals(other: NodePosition): boolean {
    return (
      this.nodeId.equals(other.nodeId) &&
      this.position.equals(other.position) &&
      this.level === other.level
    );
  }

  toString(): string {
    return `Node ${this.nodeId.getValue()} at ${this.position.toString()}, level ${this.level}`;
  }
}
