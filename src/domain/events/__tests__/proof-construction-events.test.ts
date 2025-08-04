import { describe, expect, it } from 'vitest';
import {
  atomicArgumentIdFactory,
  nodeIdFactory,
  statementIdFactory,
  treeIdFactory,
} from '../../__tests__/factories/index.js';
import {
  AlignmentMode,
  BranchType,
  DocumentId,
  ExpansionDirection,
  LayoutStyle,
} from '../../shared/value-objects/index.js';
import {
  type ArgumentModification,
  AtomicArgumentCreated,
  AtomicArgumentDeleted,
  AtomicArgumentModified,
  BranchCreated,
  type CascadeEffect,
  NodeAddedToTree,
  type NodeCascadeEffect,
  NodeRemovedFromTree,
  ProofTreeCreated,
  type SideLabels,
  type StructuralChange,
  type TreeModification,
  type TreePhysicalProperties,
  TreePhysicalPropertiesChanged,
  type TreePosition,
  TreePositionChanged,
  TreeStructureModified,
} from '../proof-construction-events.js';

const mockAtomicArgumentId = atomicArgumentIdFactory.build();
const documentIdResult = DocumentId.fromString('doc-123');
if (documentIdResult.isErr()) {
  throw new Error('Failed to create mock DocumentId');
}
const mockDocumentId = documentIdResult.value;
const mockNodeId = nodeIdFactory.build();
const mockStatementId = statementIdFactory.build();
const mockTreeId = treeIdFactory.build();

describe('AtomicArgumentCreated', () => {
  const mockSideLabels: SideLabels = {
    left: 'Modus Ponens',
    right: 'Classical Logic',
  };

  const mockPremiseIds = [statementIdFactory.build(), statementIdFactory.build()];
  const mockConclusionIds = [statementIdFactory.build()];

  it('should create event with all properties', () => {
    const event = new AtomicArgumentCreated(
      mockAtomicArgumentId,
      mockPremiseIds,
      mockConclusionIds,
      mockSideLabels,
      'test-user',
    );

    expect(event.eventType).toBe('AtomicArgumentCreated');
    expect(event.aggregateId).toBe(mockAtomicArgumentId.getValue());
    expect(event.aggregateType).toBe('AtomicArgument');
    expect(event.argumentId).toBe(mockAtomicArgumentId);
    expect(event.premiseIds).toEqual(mockPremiseIds);
    expect(event.conclusionIds).toEqual(mockConclusionIds);
    expect(event.sideLabels).toBe(mockSideLabels);
    expect(event.createdBy).toBe('test-user');
  });

  it('should create event with empty premise and conclusion arrays', () => {
    const event = new AtomicArgumentCreated(mockAtomicArgumentId, [], [], null, 'test-user');

    expect(event.premiseIds).toEqual([]);
    expect(event.conclusionIds).toEqual([]);
    expect(event.sideLabels).toBeNull();
  });

  it('should serialize event data correctly', () => {
    const event = new AtomicArgumentCreated(
      mockAtomicArgumentId,
      mockPremiseIds,
      [],
      mockSideLabels,
      'test-user',
    );

    const data = event.eventData;

    expect(data).toEqual({
      argumentId: mockAtomicArgumentId.getValue(),
      premiseIds: mockPremiseIds.map((id) => id.getValue()),
      conclusionIds: [],
      sideLabels: mockSideLabels,
      createdBy: 'test-user',
    });
  });

  it('should create valid event record', () => {
    const event = new AtomicArgumentCreated(
      mockAtomicArgumentId,
      mockPremiseIds,
      mockConclusionIds,
      mockSideLabels,
      'test-user',
    );

    const record = event.toEventRecord();

    expect(record.eventType).toBe('AtomicArgumentCreated');
    expect(record.aggregateId).toBe(mockAtomicArgumentId.getValue());
    expect(record.aggregateType).toBe('AtomicArgument');
    expect(record.eventVersion).toBe(1);
    expect(record.eventData).toEqual(event.eventData);
    expect(record.metadata).toEqual({});
  });
});

describe('AtomicArgumentModified', () => {
  const mockModification: ArgumentModification = {
    type: 'premise_modified',
    previousValue: 'All men are mortal',
    newValue: 'All humans are mortal',
    details: { statementId: mockStatementId.getValue() },
  };

  it('should create event with correct properties', () => {
    const event = new AtomicArgumentModified(mockAtomicArgumentId, mockModification, 'test-user');

    expect(event.eventType).toBe('AtomicArgumentModified');
    expect(event.aggregateId).toBe(mockAtomicArgumentId.getValue());
    expect(event.aggregateType).toBe('AtomicArgument');
    expect(event.argumentId).toBe(mockAtomicArgumentId);
    expect(event.changes).toBe(mockModification);
    expect(event.modifiedBy).toBe('test-user');
  });

  it('should serialize event data correctly', () => {
    const event = new AtomicArgumentModified(mockAtomicArgumentId, mockModification, 'test-user');

    const data = event.eventData;

    expect(data).toEqual({
      argumentId: mockAtomicArgumentId.getValue(),
      changes: mockModification,
      modifiedBy: 'test-user',
    });
  });

  it('should handle conclusion modifications', () => {
    const conclusionModification: ArgumentModification = {
      type: 'conclusion_modified',
      previousValue: 'Therefore, Socrates is mortal',
      newValue: 'Therefore, Socrates will die',
    };

    const event = new AtomicArgumentModified(
      mockAtomicArgumentId,
      conclusionModification,
      'editor',
    );

    expect(event.changes.type).toBe('conclusion_modified');
    expect(event.eventData.changes).toBe(conclusionModification);
  });
});

describe('AtomicArgumentDeleted', () => {
  const mockCascadeEffects: CascadeEffect[] = [
    {
      type: 'flow_broken',
      affectedId: 'flow-123',
      description: 'Statement flow was interrupted',
    },
    {
      type: 'node_orphaned',
      affectedId: 'node-456',
      description: 'Node lost its argument reference',
    },
  ];

  it('should create event with correct properties', () => {
    const event = new AtomicArgumentDeleted(mockAtomicArgumentId, 'test-user', mockCascadeEffects);

    expect(event.eventType).toBe('AtomicArgumentDeleted');
    expect(event.aggregateId).toBe(mockAtomicArgumentId.getValue());
    expect(event.aggregateType).toBe('AtomicArgument');
    expect(event.argumentId).toBe(mockAtomicArgumentId);
    expect(event.deletedBy).toBe('test-user');
    expect(event.cascadeEffects).toBe(mockCascadeEffects);
  });

  it('should serialize event data correctly', () => {
    const event = new AtomicArgumentDeleted(mockAtomicArgumentId, 'test-user', mockCascadeEffects);

    const data = event.eventData;

    expect(data).toEqual({
      argumentId: mockAtomicArgumentId.getValue(),
      deletedBy: 'test-user',
      cascadeEffects: mockCascadeEffects,
    });
  });

  it('should handle empty cascade effects', () => {
    const event = new AtomicArgumentDeleted(mockAtomicArgumentId, 'test-user', []);

    expect(event.cascadeEffects).toEqual([]);
    expect(event.eventData.cascadeEffects).toEqual([]);
  });
});

describe('ProofTreeCreated', () => {
  const mockPosition: TreePosition = {
    x: 100,
    y: 200,
  };

  const mockPhysicalProperties: TreePhysicalProperties = {
    layoutStyle: LayoutStyle.bottomUp(),
    spacingX: 50,
    spacingY: 30,
    minWidth: 200,
    minHeight: 150,
    expansionDirection: ExpansionDirection.vertical(),
    alignmentMode: AlignmentMode.center(),
  };

  it('should create event with correct properties', () => {
    const event = new ProofTreeCreated(
      mockTreeId,
      mockDocumentId,
      mockPosition,
      mockPhysicalProperties,
      'test-user',
    );

    expect(event.eventType).toBe('ProofTreeCreated');
    expect(event.aggregateId).toBe(mockTreeId.getValue());
    expect(event.aggregateType).toBe('ProofTree');
    expect(event.treeId).toBe(mockTreeId);
    expect(event.documentId).toBe(mockDocumentId);
    expect(event.position).toBe(mockPosition);
    expect(event.physicalProperties).toBe(mockPhysicalProperties);
    expect(event.createdBy).toBe('test-user');
  });

  it('should serialize event data correctly', () => {
    const event = new ProofTreeCreated(
      mockTreeId,
      mockDocumentId,
      mockPosition,
      mockPhysicalProperties,
      'test-user',
    );

    const data = event.eventData;

    expect(data).toEqual({
      treeId: mockTreeId.getValue(),
      documentId: mockDocumentId.getValue(),
      position: mockPosition,
      physicalProperties: mockPhysicalProperties,
      createdBy: 'test-user',
    });
  });
});

describe('NodeAddedToTree', () => {
  const mockParentNodeId = nodeIdFactory.build();

  it('should create event with parent node', () => {
    const event = new NodeAddedToTree(
      mockTreeId,
      mockNodeId,
      mockAtomicArgumentId,
      mockParentNodeId,
      1,
      0,
      'test-user',
    );

    expect(event.eventType).toBe('NodeAddedToTree');
    expect(event.aggregateId).toBe(mockTreeId.getValue());
    expect(event.aggregateType).toBe('ProofTree');
    expect(event.treeId).toBe(mockTreeId);
    expect(event.nodeId).toBe(mockNodeId);
    expect(event.argumentId).toBe(mockAtomicArgumentId);
    expect(event.parentNodeId).toBe(mockParentNodeId);
    expect(event.premisePosition).toBe(1);
    expect(event.fromPosition).toBe(0);
    expect(event.addedBy).toBe('test-user');
  });

  it('should create event for root node', () => {
    const event = new NodeAddedToTree(
      mockTreeId,
      mockNodeId,
      mockAtomicArgumentId,
      null,
      0,
      undefined,
      'test-user',
    );

    expect(event.parentNodeId).toBeNull();
    expect(event.fromPosition).toBeUndefined();
  });

  it('should serialize event data correctly', () => {
    const event = new NodeAddedToTree(
      mockTreeId,
      mockNodeId,
      mockAtomicArgumentId,
      mockParentNodeId,
      2,
      1,
      'test-user',
    );

    const data = event.eventData;

    expect(data).toEqual({
      treeId: mockTreeId.getValue(),
      nodeId: mockNodeId.getValue(),
      argumentId: mockAtomicArgumentId.getValue(),
      parentNodeId: mockParentNodeId.getValue(),
      premisePosition: 2,
      fromPosition: 1,
      addedBy: 'test-user',
    });
  });
});

describe('NodeRemovedFromTree', () => {
  const mockCascadeEffects: NodeCascadeEffect[] = [
    {
      type: 'child_orphaned',
      affectedNodeId: mockNodeId,
      description: 'Child node lost parent connection',
      requiresUserAction: true,
    },
  ];

  it('should create event with correct properties', () => {
    const event = new NodeRemovedFromTree(mockTreeId, mockNodeId, 'test-user', mockCascadeEffects);

    expect(event.eventType).toBe('NodeRemovedFromTree');
    expect(event.aggregateId).toBe(mockTreeId.getValue());
    expect(event.aggregateType).toBe('ProofTree');
    expect(event.treeId).toBe(mockTreeId);
    expect(event.nodeId).toBe(mockNodeId);
    expect(event.removedBy).toBe('test-user');
    expect(event.cascadeEffects).toBe(mockCascadeEffects);
  });

  it('should serialize event data correctly', () => {
    const event = new NodeRemovedFromTree(mockTreeId, mockNodeId, 'test-user', mockCascadeEffects);

    const data = event.eventData;

    expect(data).toEqual({
      treeId: mockTreeId.getValue(),
      nodeId: mockNodeId.getValue(),
      removedBy: 'test-user',
      cascadeEffects: mockCascadeEffects,
    });
  });
});

describe('TreeStructureModified', () => {
  const mockParentNodeId = nodeIdFactory.build();
  const mockModification: TreeModification = {
    type: 'structure_reorganized',
    changes: [
      {
        nodeId: mockNodeId,
        previousParent: null,
        newParent: mockParentNodeId,
        previousPosition: 0,
        newPosition: 1,
      } as StructuralChange,
    ],
    reason: 'User reorganized proof structure',
  };

  it('should create event with correct properties', () => {
    const event = new TreeStructureModified(mockTreeId, mockModification, 'test-user');

    expect(event.eventType).toBe('TreeStructureModified');
    expect(event.aggregateId).toBe(mockTreeId.getValue());
    expect(event.aggregateType).toBe('ProofTree');
    expect(event.treeId).toBe(mockTreeId);
    expect(event.modification).toBe(mockModification);
    expect(event.modifiedBy).toBe('test-user');
  });

  it('should serialize event data correctly', () => {
    const event = new TreeStructureModified(mockTreeId, mockModification, 'test-user');

    const data = event.eventData;

    expect(data).toEqual({
      treeId: mockTreeId.getValue(),
      modification: mockModification,
      modifiedBy: 'test-user',
    });
  });
});

describe('TreePositionChanged', () => {
  const mockPreviousPosition: TreePosition = { x: 50, y: 75 };
  const mockNewPosition: TreePosition = { x: 150, y: 225 };

  it('should create event with correct properties', () => {
    const event = new TreePositionChanged(
      mockTreeId,
      mockPreviousPosition,
      mockNewPosition,
      'test-user',
    );

    expect(event.eventType).toBe('TreePositionChanged');
    expect(event.aggregateId).toBe(mockTreeId.getValue());
    expect(event.aggregateType).toBe('ProofTree');
    expect(event.treeId).toBe(mockTreeId);
    expect(event.previousPosition).toBe(mockPreviousPosition);
    expect(event.newPosition).toBe(mockNewPosition);
    expect(event.movedBy).toBe('test-user');
  });

  it('should serialize event data correctly', () => {
    const event = new TreePositionChanged(
      mockTreeId,
      mockPreviousPosition,
      mockNewPosition,
      'test-user',
    );

    const data = event.eventData;

    expect(data).toEqual({
      treeId: mockTreeId.getValue(),
      previousPosition: mockPreviousPosition,
      newPosition: mockNewPosition,
      movedBy: 'test-user',
    });
  });
});

describe('TreePhysicalPropertiesChanged', () => {
  const mockPreviousProperties: TreePhysicalProperties = {
    layoutStyle: LayoutStyle.topDown(),
    spacingX: 40,
    spacingY: 25,
    minWidth: 150,
    minHeight: 100,
    expansionDirection: ExpansionDirection.horizontal(),
    alignmentMode: AlignmentMode.left(),
  };

  const mockNewProperties: TreePhysicalProperties = {
    layoutStyle: LayoutStyle.bottomUp(),
    spacingX: 60,
    spacingY: 35,
    minWidth: 200,
    minHeight: 150,
    expansionDirection: ExpansionDirection.vertical(),
    alignmentMode: AlignmentMode.center(),
  };

  it('should create event with correct properties', () => {
    const event = new TreePhysicalPropertiesChanged(
      mockTreeId,
      mockPreviousProperties,
      mockNewProperties,
      'test-user',
    );

    expect(event.eventType).toBe('TreePhysicalPropertiesChanged');
    expect(event.aggregateId).toBe(mockTreeId.getValue());
    expect(event.aggregateType).toBe('ProofTree');
    expect(event.treeId).toBe(mockTreeId);
    expect(event.previousProperties).toBe(mockPreviousProperties);
    expect(event.newProperties).toBe(mockNewProperties);
    expect(event.changedBy).toBe('test-user');
  });

  it('should serialize event data correctly', () => {
    const event = new TreePhysicalPropertiesChanged(
      mockTreeId,
      mockPreviousProperties,
      mockNewProperties,
      'test-user',
    );

    const data = event.eventData;

    expect(data).toEqual({
      treeId: mockTreeId.getValue(),
      previousProperties: mockPreviousProperties,
      newProperties: mockNewProperties,
      changedBy: 'test-user',
    });
  });
});

describe('BranchCreated', () => {
  const mockParentNodeId = nodeIdFactory.build();
  const mockNewNodeId = nodeIdFactory.build();

  it('should create event with correct properties', () => {
    const event = new BranchCreated(
      mockTreeId,
      mockParentNodeId,
      mockNewNodeId,
      BranchType.fromConclusion(),
      'test-user',
    );

    expect(event.eventType).toBe('BranchCreated');
    expect(event.aggregateId).toBe(mockTreeId.getValue());
    expect(event.aggregateType).toBe('ProofTree');
    expect(event.treeId).toBe(mockTreeId);
    expect(event.parentNodeId).toBe(mockParentNodeId);
    expect(event.newNodeId).toBe(mockNewNodeId);
    expect(event.branchType).toEqual(BranchType.fromConclusion());
    expect(event.createdBy).toBe('test-user');
  });

  it('should serialize event data correctly for different branch types', () => {
    const event = new BranchCreated(
      mockTreeId,
      mockParentNodeId,
      mockNewNodeId,
      BranchType.fromSelectedText(),
      'test-user',
    );

    const data = event.eventData;

    expect(data).toEqual({
      treeId: mockTreeId.getValue(),
      parentNodeId: mockParentNodeId.getValue(),
      newNodeId: mockNewNodeId.getValue(),
      branchType: BranchType.fromSelectedText(),
      createdBy: 'test-user',
    });
  });

  it('should handle independent branch creation', () => {
    const event = new BranchCreated(
      mockTreeId,
      mockParentNodeId,
      mockNewNodeId,
      BranchType.independent(),
      'test-user',
    );

    expect(event.branchType).toEqual(BranchType.independent());
    expect(event.eventData.branchType).toEqual(BranchType.independent());
  });
});
