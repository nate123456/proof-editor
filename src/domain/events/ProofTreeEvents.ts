import type { AtomicArgumentId, NodeId, ProofTreeId } from '../shared/value-objects/index.js';
import { DomainEvent } from './base-event.js';

export class ProofTreeCreated extends DomainEvent {
  readonly eventType = 'ProofTreeCreated';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      treeId: ProofTreeId;
      initialLayout: {
        offset: { x: number; y: number };
        scale: number;
      };
    },
  ) {
    super(aggregateId, 'ProofTreeAggregate');
  }
}

export class NodeAdded extends DomainEvent {
  readonly eventType = 'NodeAdded';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      nodeId: NodeId;
      argumentId: AtomicArgumentId;
      parentNodeId?: NodeId;
      position?: number;
      fromPosition?: number;
    },
  ) {
    super(aggregateId, 'ProofTreeAggregate');
  }
}

export class NodeRemoved extends DomainEvent {
  readonly eventType = 'NodeRemoved';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      nodeId: NodeId;
      argumentId: AtomicArgumentId;
    },
  ) {
    super(aggregateId, 'ProofTreeAggregate');
  }
}

export class NodesConnected extends DomainEvent {
  readonly eventType = 'NodesConnected';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      parentNodeId: NodeId;
      childNodeId: NodeId;
      position: number;
      fromPosition?: number;
    },
  ) {
    super(aggregateId, 'ProofTreeAggregate');
  }
}

export class NodeMoved extends DomainEvent {
  readonly eventType = 'NodeMoved';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      nodeId: NodeId;
      newPosition: { x: number; y: number };
      previousPosition: { x: number; y: number };
    },
  ) {
    super(aggregateId, 'ProofTreeAggregate');
  }
}

export class TreeValidated extends DomainEvent {
  readonly eventType = 'TreeValidated';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      treeId: ProofTreeId;
      isValid: boolean;
      validationErrors?: string[];
    },
  ) {
    super(aggregateId, 'ProofTreeAggregate');
  }
}
