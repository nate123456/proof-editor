import { err, ok, type Result } from 'neverthrow';
import type { ValidationError } from '../shared/result.js';
import type {
  AtomicArgumentId,
  DocumentId,
  NodeId,
  StatementId,
  TreeId,
} from '../shared/value-objects/index.js';
import { NodeDimension, Position2D, Spacing } from '../shared/value-objects/index.js';
import { DomainEvent } from './base-event.js';

export class AtomicArgumentCreated extends DomainEvent {
  readonly eventType = 'AtomicArgumentCreated';

  constructor(
    public readonly argumentId: AtomicArgumentId,
    public readonly premiseIds: StatementId[],
    public readonly conclusionIds: StatementId[],
    public readonly sideLabels: SideLabels | null,
    public readonly createdBy: string,
  ) {
    super(argumentId.getValue(), 'AtomicArgument');
  }

  get eventData(): Record<string, unknown> {
    return {
      argumentId: this.argumentId.getValue(),
      premiseIds: this.premiseIds.map((id) => id.getValue()),
      conclusionIds: this.conclusionIds.map((id) => id.getValue()),
      sideLabels: this.sideLabels,
      createdBy: this.createdBy,
    };
  }
}

export class AtomicArgumentModified extends DomainEvent {
  readonly eventType = 'AtomicArgumentModified';

  constructor(
    public readonly argumentId: AtomicArgumentId,
    public readonly changes: ArgumentModification,
    public readonly modifiedBy: string,
  ) {
    super(argumentId.getValue(), 'AtomicArgument');
  }

  get eventData(): Record<string, unknown> {
    return {
      argumentId: this.argumentId.getValue(),
      changes: this.changes,
      modifiedBy: this.modifiedBy,
    };
  }
}

export class AtomicArgumentDeleted extends DomainEvent {
  readonly eventType = 'AtomicArgumentDeleted';

  constructor(
    public readonly argumentId: AtomicArgumentId,
    public readonly deletedBy: string,
    public readonly cascadeEffects: CascadeEffect[],
  ) {
    super(argumentId.getValue(), 'AtomicArgument');
  }

  get eventData(): Record<string, unknown> {
    return {
      argumentId: this.argumentId.getValue(),
      deletedBy: this.deletedBy,
      cascadeEffects: this.cascadeEffects,
    };
  }
}

export class ProofTreeCreated extends DomainEvent {
  readonly eventType = 'ProofTreeCreated';

  constructor(
    public readonly treeId: TreeId,
    public readonly documentId: DocumentId,
    public readonly position: TreePosition,
    public readonly physicalProperties: TreePhysicalProperties,
    public readonly createdBy: string,
  ) {
    super(treeId.getValue(), 'ProofTree');
  }

  get eventData(): Record<string, unknown> {
    return {
      treeId: this.treeId.getValue(),
      documentId: this.documentId.getValue(),
      position: this.position,
      physicalProperties: this.physicalProperties,
      createdBy: this.createdBy,
    };
  }
}

export class NodeAddedToTree extends DomainEvent {
  readonly eventType = 'NodeAddedToTree';

  constructor(
    public readonly treeId: TreeId,
    public readonly nodeId: NodeId,
    public readonly argumentId: AtomicArgumentId,
    public readonly parentNodeId: NodeId | null,
    public readonly premisePosition: number,
    public readonly fromPosition: number | undefined,
    public readonly addedBy: string,
  ) {
    super(treeId.getValue(), 'ProofTree');
  }

  get eventData(): Record<string, unknown> {
    return {
      treeId: this.treeId.getValue(),
      nodeId: this.nodeId.getValue(),
      argumentId: this.argumentId.getValue(),
      parentNodeId: this.parentNodeId?.getValue() ?? null,
      premisePosition: this.premisePosition,
      fromPosition: this.fromPosition,
      addedBy: this.addedBy,
    };
  }
}

export class NodeRemovedFromTree extends DomainEvent {
  readonly eventType = 'NodeRemovedFromTree';

  constructor(
    public readonly treeId: TreeId,
    public readonly nodeId: NodeId,
    public readonly removedBy: string,
    public readonly cascadeEffects: NodeCascadeEffect[],
  ) {
    super(treeId.getValue(), 'ProofTree');
  }

  get eventData(): Record<string, unknown> {
    return {
      treeId: this.treeId.getValue(),
      nodeId: this.nodeId.getValue(),
      removedBy: this.removedBy,
      cascadeEffects: this.cascadeEffects,
    };
  }
}

export class TreeStructureModified extends DomainEvent {
  readonly eventType = 'TreeStructureModified';

  constructor(
    public readonly treeId: TreeId,
    public readonly modification: TreeModification,
    public readonly modifiedBy: string,
  ) {
    super(treeId.getValue(), 'ProofTree');
  }

  get eventData(): Record<string, unknown> {
    return {
      treeId: this.treeId.getValue(),
      modification: this.modification,
      modifiedBy: this.modifiedBy,
    };
  }
}

export class TreePositionChanged extends DomainEvent {
  readonly eventType = 'TreePositionChanged';

  constructor(
    public readonly treeId: TreeId,
    public readonly previousPosition: TreePosition,
    public readonly newPosition: TreePosition,
    public readonly movedBy: string,
  ) {
    super(treeId.getValue(), 'ProofTree');
  }

  get eventData(): Record<string, unknown> {
    return {
      treeId: this.treeId.getValue(),
      previousPosition: this.previousPosition,
      newPosition: this.newPosition,
      movedBy: this.movedBy,
    };
  }
}

export class TreePhysicalPropertiesChanged extends DomainEvent {
  readonly eventType = 'TreePhysicalPropertiesChanged';

  constructor(
    public readonly treeId: TreeId,
    public readonly previousProperties: TreePhysicalProperties,
    public readonly newProperties: TreePhysicalProperties,
    public readonly changedBy: string,
  ) {
    super(treeId.getValue(), 'ProofTree');
  }

  get eventData(): Record<string, unknown> {
    return {
      treeId: this.treeId.getValue(),
      previousProperties: this.previousProperties,
      newProperties: this.newProperties,
      changedBy: this.changedBy,
    };
  }
}

export class BranchCreated extends DomainEvent {
  readonly eventType = 'BranchCreated';

  constructor(
    public readonly treeId: TreeId,
    public readonly parentNodeId: NodeId,
    public readonly newNodeId: NodeId,
    public readonly branchType: BranchType,
    public readonly createdBy: string,
  ) {
    super(treeId.getValue(), 'ProofTree');
  }

  get eventData(): Record<string, unknown> {
    return {
      treeId: this.treeId.getValue(),
      parentNodeId: this.parentNodeId.getValue(),
      newNodeId: this.newNodeId.getValue(),
      branchType: this.branchType,
      createdBy: this.createdBy,
    };
  }
}

export interface SideLabels {
  left?: string;
  right?: string;
}

export interface ArgumentModification {
  type: 'premise_modified' | 'conclusion_modified' | 'side_labels_changed';
  previousValue: unknown;
  newValue: unknown;
  details?: Record<string, unknown>;
}

export interface CascadeEffect {
  type: 'flow_broken' | 'node_orphaned' | 'tree_fragmented';
  affectedId: string;
  description: string;
}

export interface TreePosition {
  x: number;
  y: number;
}

export interface TreePhysicalProperties {
  layoutStyle: LayoutStyle;
  spacingX: number;
  spacingY: number;
  minWidth: number;
  minHeight: number;
  expansionDirection: ExpansionDirection;
  alignmentMode: AlignmentMode;
}

export class TypedTreePosition {
  private constructor(private readonly position: Position2D) {}

  static create(x: number, y: number): Result<TypedTreePosition, ValidationError> {
    const positionResult = Position2D.create(x, y);
    if (positionResult.isErr()) {
      return err(positionResult.error);
    }
    return ok(new TypedTreePosition(positionResult.value));
  }

  static fromPosition2D(position: Position2D): TypedTreePosition {
    return new TypedTreePosition(position);
  }

  getPosition(): Position2D {
    return this.position;
  }

  toRaw(): TreePosition {
    return {
      x: this.position.getX(),
      y: this.position.getY(),
    };
  }
}

export class TypedTreePhysicalProperties {
  private constructor(
    private readonly layoutStyle: LayoutStyle,
    private readonly spacingX: Spacing,
    private readonly spacingY: Spacing,
    private readonly minWidth: NodeDimension,
    private readonly minHeight: NodeDimension,
    private readonly expansionDirection: ExpansionDirection,
    private readonly alignmentMode: AlignmentMode,
  ) {}

  static create(props: {
    layoutStyle: LayoutStyle;
    spacingX: number;
    spacingY: number;
    minWidth: number;
    minHeight: number;
    expansionDirection: ExpansionDirection;
    alignmentMode: AlignmentMode;
  }): Result<TypedTreePhysicalProperties, ValidationError> {
    const spacingXResult = Spacing.create(props.spacingX);
    if (spacingXResult.isErr()) {
      return err(spacingXResult.error);
    }

    const spacingYResult = Spacing.create(props.spacingY);
    if (spacingYResult.isErr()) {
      return err(spacingYResult.error);
    }

    const minWidthResult = NodeDimension.create(props.minWidth);
    if (minWidthResult.isErr()) {
      return err(minWidthResult.error);
    }

    const minHeightResult = NodeDimension.create(props.minHeight);
    if (minHeightResult.isErr()) {
      return err(minHeightResult.error);
    }

    return ok(
      new TypedTreePhysicalProperties(
        props.layoutStyle,
        spacingXResult.value,
        spacingYResult.value,
        minWidthResult.value,
        minHeightResult.value,
        props.expansionDirection,
        props.alignmentMode,
      ),
    );
  }

  getLayoutStyle(): LayoutStyle {
    return this.layoutStyle;
  }

  getSpacingX(): Spacing {
    return this.spacingX;
  }

  getSpacingY(): Spacing {
    return this.spacingY;
  }

  getMinWidth(): NodeDimension {
    return this.minWidth;
  }

  getMinHeight(): NodeDimension {
    return this.minHeight;
  }

  getExpansionDirection(): ExpansionDirection {
    return this.expansionDirection;
  }

  getAlignmentMode(): AlignmentMode {
    return this.alignmentMode;
  }

  toRaw(): TreePhysicalProperties {
    return {
      layoutStyle: this.layoutStyle,
      spacingX: this.spacingX.getValue(),
      spacingY: this.spacingY.getValue(),
      minWidth: this.minWidth.getValue(),
      minHeight: this.minHeight.getValue(),
      expansionDirection: this.expansionDirection,
      alignmentMode: this.alignmentMode,
    };
  }
}

export interface NodeCascadeEffect {
  type: 'child_orphaned' | 'parent_connection_lost' | 'flow_interrupted';
  affectedNodeId: NodeId;
  description: string;
  requiresUserAction: boolean;
}

export interface TreeModification {
  type: 'node_moved' | 'structure_reorganized' | 'multiple_changes';
  changes: StructuralChange[];
  reason: string;
}

export interface StructuralChange {
  nodeId: NodeId;
  previousParent: NodeId | null;
  newParent: NodeId | null;
  previousPosition: number;
  newPosition: number;
}

import type {
  AlignmentMode,
  BranchType,
  ExpansionDirection,
  LayoutStyle,
} from '../shared/value-objects/ui.js';
