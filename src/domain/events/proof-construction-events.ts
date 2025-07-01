import {
  type AtomicArgumentId,
  type DocumentId,
  type NodeId,
  type OrderedSetId,
  // StatementId,
  type TreeId,
} from '../shared/value-objects.js';
import { DomainEvent } from './base-event.js';

export class AtomicArgumentCreated extends DomainEvent {
  readonly eventType = 'AtomicArgumentCreated';

  constructor(
    public readonly argumentId: AtomicArgumentId,
    public readonly premiseSetId: OrderedSetId | null,
    public readonly conclusionSetId: OrderedSetId | null,
    public readonly sideLabels: SideLabels | null,
    public readonly createdBy: string
  ) {
    super(argumentId.getValue(), 'AtomicArgument');
  }

  get eventData(): Record<string, unknown> {
    return {
      argumentId: this.argumentId.getValue(),
      premiseSetId: this.premiseSetId?.getValue() ?? null,
      conclusionSetId: this.conclusionSetId?.getValue() ?? null,
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
    public readonly modifiedBy: string
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
    public readonly cascadeEffects: CascadeEffect[]
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
    public readonly createdBy: string
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
    public readonly addedBy: string
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
    public readonly cascadeEffects: NodeCascadeEffect[]
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
    public readonly modifiedBy: string
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
    public readonly movedBy: string
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
    public readonly changedBy: string
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
    public readonly createdBy: string
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

export type LayoutStyle = 'bottom-up' | 'top-down' | 'left-right' | 'right-left';
export type ExpansionDirection = 'horizontal' | 'vertical' | 'radial';
export type AlignmentMode = 'left' | 'center' | 'right' | 'justify';
export type BranchType = 'from_conclusion' | 'independent' | 'from_selected_text';
