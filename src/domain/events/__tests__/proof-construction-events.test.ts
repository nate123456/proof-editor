import { describe, expect, it } from 'vitest';

import {
  type AtomicArgumentId,
  type DocumentId,
  type NodeId,
  type OrderedSetId,
  type TreeId,
} from '../../shared/value-objects.js';
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
  type TreeModification,
  type TreePhysicalProperties,
  TreePhysicalPropertiesChanged,
  type TreePosition,
  TreePositionChanged,
  TreeStructureModified,
} from '../proof-construction-events.js';

const mockAtomicArgumentId = { getValue: () => 'arg-123' } as AtomicArgumentId;
const mockDocumentId = { getValue: () => 'doc-123' } as DocumentId;
const mockNodeId = { getValue: () => 'node-123' } as NodeId;
const mockOrderedSetId = { getValue: () => 'set-123' } as OrderedSetId;
const mockTreeId = { getValue: () => 'tree-123' } as TreeId;

describe('AtomicArgumentCreated', () => {
  const mockSideLabels: SideLabels = {
    left: 'Modus Ponens',
    right: 'Classical Logic',
  };

  it('should create event with all properties', () => {
    const event = new AtomicArgumentCreated(
      mockAtomicArgumentId,
      mockOrderedSetId,
      mockOrderedSetId,
      mockSideLabels,
      'test-user'
    );

    expect(event.eventType).toBe('AtomicArgumentCreated');
    expect(event.aggregateId).toBe('arg-123');
    expect(event.aggregateType).toBe('AtomicArgument');
    expect(event.argumentId).toBe(mockAtomicArgumentId);
    expect(event.premiseSetId).toBe(mockOrderedSetId);
    expect(event.conclusionSetId).toBe(mockOrderedSetId);
    expect(event.sideLabels).toBe(mockSideLabels);
    expect(event.createdBy).toBe('test-user');
  });

  it('should create event with null premise and conclusion sets', () => {
    const event = new AtomicArgumentCreated(mockAtomicArgumentId, null, null, null, 'test-user');

    expect(event.premiseSetId).toBeNull();
    expect(event.conclusionSetId).toBeNull();
    expect(event.sideLabels).toBeNull();
  });

  it('should serialize event data correctly', () => {
    const event = new AtomicArgumentCreated(
      mockAtomicArgumentId,
      mockOrderedSetId,
      null,
      mockSideLabels,
      'test-user'
    );

    const data = event.eventData;

    expect(data).toEqual({
      argumentId: 'arg-123',
      premiseSetId: 'set-123',
      conclusionSetId: null,
      sideLabels: mockSideLabels,
      createdBy: 'test-user',
    });
  });

  it('should create valid event record', () => {
    const event = new AtomicArgumentCreated(
      mockAtomicArgumentId,
      mockOrderedSetId,
      mockOrderedSetId,
      mockSideLabels,
      'test-user'
    );

    const record = event.toEventRecord();

    expect(record.eventType).toBe('AtomicArgumentCreated');
    expect(record.aggregateId).toBe('arg-123');
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
    details: { statementId: 'stmt-123' },
  };

  it('should create event with correct properties', () => {
    const event = new AtomicArgumentModified(mockAtomicArgumentId, mockModification, 'test-user');

    expect(event.eventType).toBe('AtomicArgumentModified');
    expect(event.aggregateId).toBe('arg-123');
    expect(event.aggregateType).toBe('AtomicArgument');
    expect(event.argumentId).toBe(mockAtomicArgumentId);
    expect(event.changes).toBe(mockModification);
    expect(event.modifiedBy).toBe('test-user');
  });

  it('should serialize event data correctly', () => {
    const event = new AtomicArgumentModified(mockAtomicArgumentId, mockModification, 'test-user');

    const data = event.eventData;

    expect(data).toEqual({
      argumentId: 'arg-123',
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
      'editor'
    );

    expect(event['changes'].type).toBe('conclusion_modified');
    expect(event.eventData['changes']).toBe(conclusionModification);
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
    expect(event.aggregateId).toBe('arg-123');
    expect(event.aggregateType).toBe('AtomicArgument');
    expect(event.argumentId).toBe(mockAtomicArgumentId);
    expect(event.deletedBy).toBe('test-user');
    expect(event['cascadeEffects']).toBe(mockCascadeEffects);
  });

  it('should serialize event data correctly', () => {
    const event = new AtomicArgumentDeleted(mockAtomicArgumentId, 'test-user', mockCascadeEffects);

    const data = event.eventData;

    expect(data).toEqual({
      argumentId: 'arg-123',
      deletedBy: 'test-user',
      cascadeEffects: mockCascadeEffects,
    });
  });

  it('should handle empty cascade effects', () => {
    const event = new AtomicArgumentDeleted(mockAtomicArgumentId, 'test-user', []);

    expect(event['cascadeEffects']).toEqual([]);
    expect(event.eventData['cascadeEffects']).toEqual([]);
  });
});

describe('ProofTreeCreated', () => {
  const mockPosition: TreePosition = {
    x: 100,
    y: 200,
  };

  const mockPhysicalProperties: TreePhysicalProperties = {
    layoutStyle: 'bottom-up',
    spacingX: 50,
    spacingY: 30,
    minWidth: 200,
    minHeight: 150,
    expansionDirection: 'vertical',
    alignmentMode: 'center',
  };

  it('should create event with correct properties', () => {
    const event = new ProofTreeCreated(
      mockTreeId,
      mockDocumentId,
      mockPosition,
      mockPhysicalProperties,
      'test-user'
    );

    expect(event.eventType).toBe('ProofTreeCreated');
    expect(event.aggregateId).toBe('tree-123');
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
      'test-user'
    );

    const data = event.eventData;

    expect(data).toEqual({
      treeId: 'tree-123',
      documentId: 'doc-123',
      position: mockPosition,
      physicalProperties: mockPhysicalProperties,
      createdBy: 'test-user',
    });
  });
});

describe('NodeAddedToTree', () => {
  const mockParentNodeId = { getValue: () => 'parent-node-123' } as NodeId;

  it('should create event with parent node', () => {
    const event = new NodeAddedToTree(
      mockTreeId,
      mockNodeId,
      mockAtomicArgumentId,
      mockParentNodeId,
      1,
      0,
      'test-user'
    );

    expect(event.eventType).toBe('NodeAddedToTree');
    expect(event.aggregateId).toBe('tree-123');
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
      'test-user'
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
      'test-user'
    );

    const data = event.eventData;

    expect(data).toEqual({
      treeId: 'tree-123',
      nodeId: 'node-123',
      argumentId: 'arg-123',
      parentNodeId: 'parent-node-123',
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
    expect(event.aggregateId).toBe('tree-123');
    expect(event.aggregateType).toBe('ProofTree');
    expect(event.treeId).toBe(mockTreeId);
    expect(event.nodeId).toBe(mockNodeId);
    expect(event.removedBy).toBe('test-user');
    expect(event['cascadeEffects']).toBe(mockCascadeEffects);
  });

  it('should serialize event data correctly', () => {
    const event = new NodeRemovedFromTree(mockTreeId, mockNodeId, 'test-user', mockCascadeEffects);

    const data = event.eventData;

    expect(data).toEqual({
      treeId: 'tree-123',
      nodeId: 'node-123',
      removedBy: 'test-user',
      cascadeEffects: mockCascadeEffects,
    });
  });
});

describe('TreeStructureModified', () => {
  const mockModification: TreeModification = {
    type: 'structure_reorganized',
    changes: [
      {
        nodeId: mockNodeId,
        previousParent: null,
        newParent: mockNodeId,
        previousPosition: 0,
        newPosition: 1,
      },
    ],
    reason: 'User reorganized proof structure',
  };

  it('should create event with correct properties', () => {
    const event = new TreeStructureModified(mockTreeId, mockModification, 'test-user');

    expect(event.eventType).toBe('TreeStructureModified');
    expect(event.aggregateId).toBe('tree-123');
    expect(event.aggregateType).toBe('ProofTree');
    expect(event.treeId).toBe(mockTreeId);
    expect(event.modification).toBe(mockModification);
    expect(event.modifiedBy).toBe('test-user');
  });

  it('should serialize event data correctly', () => {
    const event = new TreeStructureModified(mockTreeId, mockModification, 'test-user');

    const data = event.eventData;

    expect(data).toEqual({
      treeId: 'tree-123',
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
      'test-user'
    );

    expect(event.eventType).toBe('TreePositionChanged');
    expect(event.aggregateId).toBe('tree-123');
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
      'test-user'
    );

    const data = event.eventData;

    expect(data).toEqual({
      treeId: 'tree-123',
      previousPosition: mockPreviousPosition,
      newPosition: mockNewPosition,
      movedBy: 'test-user',
    });
  });
});

describe('TreePhysicalPropertiesChanged', () => {
  const mockPreviousProperties: TreePhysicalProperties = {
    layoutStyle: 'top-down',
    spacingX: 40,
    spacingY: 25,
    minWidth: 150,
    minHeight: 100,
    expansionDirection: 'horizontal',
    alignmentMode: 'left',
  };

  const mockNewProperties: TreePhysicalProperties = {
    layoutStyle: 'bottom-up',
    spacingX: 60,
    spacingY: 35,
    minWidth: 200,
    minHeight: 150,
    expansionDirection: 'vertical',
    alignmentMode: 'center',
  };

  it('should create event with correct properties', () => {
    const event = new TreePhysicalPropertiesChanged(
      mockTreeId,
      mockPreviousProperties,
      mockNewProperties,
      'test-user'
    );

    expect(event.eventType).toBe('TreePhysicalPropertiesChanged');
    expect(event.aggregateId).toBe('tree-123');
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
      'test-user'
    );

    const data = event.eventData;

    expect(data).toEqual({
      treeId: 'tree-123',
      previousProperties: mockPreviousProperties,
      newProperties: mockNewProperties,
      changedBy: 'test-user',
    });
  });
});

describe('BranchCreated', () => {
  const mockParentNodeId = { getValue: () => 'parent-node-123' } as NodeId;
  const mockNewNodeId = { getValue: () => 'new-node-123' } as NodeId;

  it('should create event with correct properties', () => {
    const event = new BranchCreated(
      mockTreeId,
      mockParentNodeId,
      mockNewNodeId,
      'from_conclusion',
      'test-user'
    );

    expect(event.eventType).toBe('BranchCreated');
    expect(event.aggregateId).toBe('tree-123');
    expect(event.aggregateType).toBe('ProofTree');
    expect(event.treeId).toBe(mockTreeId);
    expect(event.parentNodeId).toBe(mockParentNodeId);
    expect(event.newNodeId).toBe(mockNewNodeId);
    expect(event['branchType']).toBe('from_conclusion');
    expect(event.createdBy).toBe('test-user');
  });

  it('should serialize event data correctly for different branch types', () => {
    const event = new BranchCreated(
      mockTreeId,
      mockParentNodeId,
      mockNewNodeId,
      'from_selected_text',
      'test-user'
    );

    const data = event.eventData;

    expect(data).toEqual({
      treeId: 'tree-123',
      parentNodeId: 'parent-node-123',
      newNodeId: 'new-node-123',
      branchType: 'from_selected_text',
      createdBy: 'test-user',
    });
  });

  it('should handle independent branch creation', () => {
    const event = new BranchCreated(
      mockTreeId,
      mockParentNodeId,
      mockNewNodeId,
      'independent',
      'test-user'
    );

    expect(event['branchType']).toBe('independent');
    expect(event.eventData['branchType']).toBe('independent');
  });
});
