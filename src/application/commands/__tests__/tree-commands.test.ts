import { describe, expect, test } from 'vitest';
import type {
  AttachNodeCommand,
  BatchAttachNodesCommand,
  BatchCreateStatementsCommand,
  CreateBranchFromSelectionCommand,
  CreateRootNodeCommand,
  CreateTreeCommand,
  DetachNodeCommand,
  MoveTreeCommand,
} from '../tree-commands.js';

describe('Tree Commands', () => {
  describe('CreateTreeCommand', () => {
    test('should have required documentId and position properties', () => {
      const command: CreateTreeCommand = {
        documentId: 'doc-123',
        position: { x: 100, y: 200 },
      };

      expect(command).toHaveProperty('documentId');
      expect(command).toHaveProperty('position');
      expect(command.documentId).toBe('doc-123');
      expect(command.position).toEqual({ x: 100, y: 200 });
    });

    test('should handle different position values', () => {
      const commands = [
        { documentId: 'doc-1', position: { x: 0, y: 0 } },
        { documentId: 'doc-2', position: { x: -50, y: 100 } },
        { documentId: 'doc-3', position: { x: 1000, y: 2000 } },
        { documentId: 'doc-4', position: { x: 50.5, y: 75.25 } },
      ];

      commands.forEach((command) => {
        expect(command.position.x).toBeTypeOf('number');
        expect(command.position.y).toBeTypeOf('number');
      });
    });

    test('should handle position coordinate types', () => {
      const intCommand: CreateTreeCommand = {
        documentId: 'doc-123',
        position: { x: 100, y: 200 },
      };

      const floatCommand: CreateTreeCommand = {
        documentId: 'doc-123',
        position: { x: 100.5, y: 200.75 },
      };

      expect(intCommand.position.x).toBe(100);
      expect(floatCommand.position.x).toBe(100.5);
    });
  });

  describe('MoveTreeCommand', () => {
    test('should have required documentId, treeId, and position properties', () => {
      const command: MoveTreeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        position: { x: 300, y: 400 },
      };

      expect(command).toHaveProperty('documentId');
      expect(command).toHaveProperty('treeId');
      expect(command).toHaveProperty('position');
      expect(command.documentId).toBe('doc-123');
      expect(command.treeId).toBe('tree-456');
      expect(command.position).toEqual({ x: 300, y: 400 });
    });

    test('should handle various tree ID formats', () => {
      const commands = [
        { documentId: 'doc-123', treeId: 'tree-1', position: { x: 0, y: 0 } },
        { documentId: 'doc-123', treeId: 'tree_123', position: { x: 0, y: 0 } },
        {
          documentId: 'doc-123',
          treeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          position: { x: 0, y: 0 },
        },
        { documentId: 'doc-123', treeId: 'TREE-UPPER', position: { x: 0, y: 0 } },
      ];

      commands.forEach((command) => {
        expect(command.treeId).toBeDefined();
        expect(typeof command.treeId).toBe('string');
        expect(command.treeId.length).toBeGreaterThan(0);
      });
    });

    test('should handle position updates', () => {
      const initialPosition = { x: 100, y: 200 };
      const newPosition = { x: 300, y: 400 };

      const command: MoveTreeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        position: newPosition,
      };

      expect(command.position).toEqual(newPosition);
      expect(command.position).not.toEqual(initialPosition);
    });
  });

  describe('CreateRootNodeCommand', () => {
    test('should have required documentId, treeId, and argumentId properties', () => {
      const command: CreateRootNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        argumentId: 'arg-789',
      };

      expect(command).toHaveProperty('documentId');
      expect(command).toHaveProperty('treeId');
      expect(command).toHaveProperty('argumentId');
      expect(command.documentId).toBe('doc-123');
      expect(command.treeId).toBe('tree-456');
      expect(command.argumentId).toBe('arg-789');
    });

    test('should handle various argument ID formats', () => {
      const commands = [
        { documentId: 'doc-123', treeId: 'tree-456', argumentId: 'arg-1' },
        { documentId: 'doc-123', treeId: 'tree-456', argumentId: 'argument_123' },
        {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        },
        { documentId: 'doc-123', treeId: 'tree-456', argumentId: 'ARG-UPPER' },
      ];

      commands.forEach((command) => {
        expect(command.argumentId).toBeDefined();
        expect(typeof command.argumentId).toBe('string');
        expect(command.argumentId.length).toBeGreaterThan(0);
      });
    });
  });

  describe('AttachNodeCommand', () => {
    test('should have required documentId, treeId, argumentId, parentNodeId, and premisePosition properties', () => {
      const command: AttachNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        argumentId: 'arg-789',
        parentNodeId: 'node-101',
        premisePosition: 0,
      };

      expect(command).toHaveProperty('documentId');
      expect(command).toHaveProperty('treeId');
      expect(command).toHaveProperty('argumentId');
      expect(command).toHaveProperty('parentNodeId');
      expect(command).toHaveProperty('premisePosition');
      expect(command.documentId).toBe('doc-123');
      expect(command.treeId).toBe('tree-456');
      expect(command.argumentId).toBe('arg-789');
      expect(command.parentNodeId).toBe('node-101');
      expect(command.premisePosition).toBe(0);
    });

    test('should handle different premise positions', () => {
      const commands = [
        {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'arg-789',
          parentNodeId: 'node-101',
          premisePosition: 0,
        },
        {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'arg-789',
          parentNodeId: 'node-101',
          premisePosition: 1,
        },
        {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'arg-789',
          parentNodeId: 'node-101',
          premisePosition: 5,
        },
      ];

      commands.forEach((command) => {
        expect(command.premisePosition).toBeTypeOf('number');
        expect(command.premisePosition).toBeGreaterThanOrEqual(0);
      });
    });

    test('should handle optional fromPosition for multi-conclusion arguments', () => {
      const commandWithoutFromPosition: AttachNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        argumentId: 'arg-789',
        parentNodeId: 'node-101',
        premisePosition: 0,
      };

      const commandWithFromPosition: AttachNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        argumentId: 'arg-789',
        parentNodeId: 'node-101',
        premisePosition: 1,
        fromPosition: 2,
      };

      expect(commandWithoutFromPosition.fromPosition).toBeUndefined();
      expect(commandWithFromPosition.fromPosition).toBe(2);
    });

    test('should handle various node ID formats', () => {
      const commands = [
        {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'arg-789',
          parentNodeId: 'node-1',
          premisePosition: 0,
        },
        {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'arg-789',
          parentNodeId: 'node_123',
          premisePosition: 0,
        },
        {
          documentId: 'doc-123',
          treeId: 'tree-456',
          argumentId: 'arg-789',
          parentNodeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          premisePosition: 0,
        },
      ];

      commands.forEach((command) => {
        expect(command.parentNodeId).toBeDefined();
        expect(typeof command.parentNodeId).toBe('string');
        expect(command.parentNodeId.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DetachNodeCommand', () => {
    test('should have required documentId, treeId, and nodeId properties', () => {
      const command: DetachNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        nodeId: 'node-789',
      };

      expect(command).toHaveProperty('documentId');
      expect(command).toHaveProperty('treeId');
      expect(command).toHaveProperty('nodeId');
      expect(command.documentId).toBe('doc-123');
      expect(command.treeId).toBe('tree-456');
      expect(command.nodeId).toBe('node-789');
    });

    test('should handle various node ID formats', () => {
      const commands = [
        { documentId: 'doc-123', treeId: 'tree-456', nodeId: 'node-1' },
        { documentId: 'doc-123', treeId: 'tree-456', nodeId: 'node_123' },
        {
          documentId: 'doc-123',
          treeId: 'tree-456',
          nodeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        },
        { documentId: 'doc-123', treeId: 'tree-456', nodeId: 'NODE-UPPER' },
      ];

      commands.forEach((command) => {
        expect(command.nodeId).toBeDefined();
        expect(typeof command.nodeId).toBe('string');
        expect(command.nodeId.length).toBeGreaterThan(0);
      });
    });
  });

  describe('CreateBranchFromSelectionCommand', () => {
    test('should have required documentId, sourceArgumentId, selectedText, and position properties', () => {
      const command: CreateBranchFromSelectionCommand = {
        documentId: 'doc-123',
        sourceArgumentId: 'arg-456',
        selectedText: 'All men are mortal',
        position: 'premise',
      };

      expect(command).toHaveProperty('documentId');
      expect(command).toHaveProperty('sourceArgumentId');
      expect(command).toHaveProperty('selectedText');
      expect(command).toHaveProperty('position');
      expect(command.documentId).toBe('doc-123');
      expect(command.sourceArgumentId).toBe('arg-456');
      expect(command.selectedText).toBe('All men are mortal');
      expect(command.position).toBe('premise');
    });

    test('should handle both premise and conclusion positions', () => {
      const premiseCommand: CreateBranchFromSelectionCommand = {
        documentId: 'doc-123',
        sourceArgumentId: 'arg-456',
        selectedText: 'Selected premise text',
        position: 'premise',
      };

      const conclusionCommand: CreateBranchFromSelectionCommand = {
        documentId: 'doc-123',
        sourceArgumentId: 'arg-456',
        selectedText: 'Selected conclusion text',
        position: 'conclusion',
      };

      expect(premiseCommand.position).toBe('premise');
      expect(conclusionCommand.position).toBe('conclusion');
    });

    test('should handle various selected text formats', () => {
      const commands = [
        {
          documentId: 'doc-123',
          sourceArgumentId: 'arg-456',
          selectedText: 'Simple text',
          position: 'premise' as const,
        },
        {
          documentId: 'doc-123',
          sourceArgumentId: 'arg-456',
          selectedText: 'Text with special chars: ∀x, P(x) → Q(x)',
          position: 'premise' as const,
        },
        {
          documentId: 'doc-123',
          sourceArgumentId: 'arg-456',
          selectedText: 'Multi-line\ntext\nwith\nbreaks',
          position: 'conclusion' as const,
        },
        {
          documentId: 'doc-123',
          sourceArgumentId: 'arg-456',
          selectedText: '',
          position: 'premise' as const,
        },
      ];

      commands.forEach((command) => {
        expect(command.selectedText).toBeDefined();
        expect(typeof command.selectedText).toBe('string');
      });
    });

    test('should handle optional newTreeId property', () => {
      const commandWithoutNewTreeId: CreateBranchFromSelectionCommand = {
        documentId: 'doc-123',
        sourceArgumentId: 'arg-456',
        selectedText: 'Selected text',
        position: 'premise',
      };

      const commandWithNewTreeId: CreateBranchFromSelectionCommand = {
        documentId: 'doc-123',
        sourceArgumentId: 'arg-456',
        selectedText: 'Selected text',
        position: 'premise',
        newTreeId: 'new-tree-789',
      };

      expect(commandWithoutNewTreeId.newTreeId).toBeUndefined();
      expect(commandWithNewTreeId.newTreeId).toBe('new-tree-789');
    });
  });

  describe('BatchCreateStatementsCommand', () => {
    test('should have required documentId and statements properties', () => {
      const command: BatchCreateStatementsCommand = {
        documentId: 'doc-123',
        statements: [{ content: 'Statement 1' }, { content: 'Statement 2' }],
      };

      expect(command).toHaveProperty('documentId');
      expect(command).toHaveProperty('statements');
      expect(command.documentId).toBe('doc-123');
      expect(command.statements).toHaveLength(2);
    });

    test('should handle empty statements array', () => {
      const command: BatchCreateStatementsCommand = {
        documentId: 'doc-123',
        statements: [],
      };

      expect(command.statements).toEqual([]);
      expect(Array.isArray(command.statements)).toBe(true);
    });

    test('should handle single statement', () => {
      const command: BatchCreateStatementsCommand = {
        documentId: 'doc-123',
        statements: [{ content: 'Single statement' }],
      };

      expect(command.statements).toHaveLength(1);
      expect(command.statements[0]?.content).toBe('Single statement');
    });

    test('should handle multiple statements', () => {
      const command: BatchCreateStatementsCommand = {
        documentId: 'doc-123',
        statements: [
          { content: 'First statement' },
          { content: 'Second statement' },
          { content: 'Third statement' },
          { content: 'Fourth statement' },
        ],
      };

      expect(command.statements).toHaveLength(4);
      expect(command.statements[0]?.content).toBe('First statement');
      expect(command.statements[3]?.content).toBe('Fourth statement');
    });

    test('should handle statements with optional externalId', () => {
      const command: BatchCreateStatementsCommand = {
        documentId: 'doc-123',
        statements: [
          { content: 'Statement without external ID' },
          { content: 'Statement with external ID', externalId: 'ext-123' },
          { content: 'Another statement', externalId: 'import-456' },
        ],
      };

      expect(command.statements[0]?.externalId).toBeUndefined();
      expect(command.statements[1]?.externalId).toBe('ext-123');
      expect(command.statements[2]?.externalId).toBe('import-456');
    });

    test('should handle various statement content formats', () => {
      const command: BatchCreateStatementsCommand = {
        documentId: 'doc-123',
        statements: [
          { content: 'Simple statement' },
          { content: 'Statement with symbols: ∀x, P(x) → Q(x)' },
          { content: 'Multi-line\nstatement\nwith\nbreaks' },
          { content: '' },
          {
            content:
              'A very long statement that spans multiple lines and contains detailed logical content that might be used in complex formal proofs',
          },
        ],
      };

      expect(command.statements).toHaveLength(5);
      command.statements.forEach((stmt) => {
        expect(stmt.content).toBeDefined();
        expect(typeof stmt.content).toBe('string');
      });
    });

    test('should handle import tracking with external IDs', () => {
      const command: BatchCreateStatementsCommand = {
        documentId: 'doc-123',
        statements: [
          { content: 'Imported statement 1', externalId: 'import-source-1' },
          { content: 'Imported statement 2', externalId: 'import-source-2' },
          { content: 'Imported statement 3', externalId: 'yaml-ref-123' },
        ],
      };

      expect(command.statements.every((stmt) => stmt.externalId)).toBe(true);
      expect(command.statements.map((stmt) => stmt.externalId)).toEqual([
        'import-source-1',
        'import-source-2',
        'yaml-ref-123',
      ]);
    });
  });

  describe('BatchAttachNodesCommand', () => {
    test('should have required documentId, treeId, and attachments properties', () => {
      const command: BatchAttachNodesCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        attachments: [
          { argumentId: 'arg-1', parentNodeId: 'node-1', premisePosition: 0 },
          { argumentId: 'arg-2', parentNodeId: 'node-1', premisePosition: 1 },
        ],
      };

      expect(command).toHaveProperty('documentId');
      expect(command).toHaveProperty('treeId');
      expect(command).toHaveProperty('attachments');
      expect(command.documentId).toBe('doc-123');
      expect(command.treeId).toBe('tree-456');
      expect(command.attachments).toHaveLength(2);
    });

    test('should handle empty attachments array', () => {
      const command: BatchAttachNodesCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        attachments: [],
      };

      expect(command.attachments).toEqual([]);
      expect(Array.isArray(command.attachments)).toBe(true);
    });

    test('should handle single attachment', () => {
      const command: BatchAttachNodesCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        attachments: [{ argumentId: 'arg-1', parentNodeId: 'node-1', premisePosition: 0 }],
      };

      expect(command.attachments).toHaveLength(1);
      expect(command.attachments[0]?.argumentId).toBe('arg-1');
    });

    test('should handle multiple attachments', () => {
      const command: BatchAttachNodesCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        attachments: [
          { argumentId: 'arg-1', parentNodeId: 'node-1', premisePosition: 0 },
          { argumentId: 'arg-2', parentNodeId: 'node-1', premisePosition: 1 },
          { argumentId: 'arg-3', parentNodeId: 'node-2', premisePosition: 0 },
          { argumentId: 'arg-4', parentNodeId: 'node-2', premisePosition: 1 },
        ],
      };

      expect(command.attachments).toHaveLength(4);
      expect(command.attachments[0]?.argumentId).toBe('arg-1');
      expect(command.attachments[3]?.argumentId).toBe('arg-4');
    });

    test('should handle different premise positions in attachments', () => {
      const command: BatchAttachNodesCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        attachments: [
          { argumentId: 'arg-1', parentNodeId: 'node-1', premisePosition: 0 },
          { argumentId: 'arg-2', parentNodeId: 'node-1', premisePosition: 1 },
          { argumentId: 'arg-3', parentNodeId: 'node-1', premisePosition: 2 },
          { argumentId: 'arg-4', parentNodeId: 'node-2', premisePosition: 0 },
        ],
      };

      const positions = command.attachments.map((att) => att.premisePosition);
      expect(positions).toEqual([0, 1, 2, 0]);
    });

    test('should handle various ID formats in attachments', () => {
      const command: BatchAttachNodesCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        attachments: [
          { argumentId: 'arg-1', parentNodeId: 'node-1', premisePosition: 0 },
          { argumentId: 'argument_123', parentNodeId: 'node_456', premisePosition: 0 },
          {
            argumentId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            parentNodeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
            premisePosition: 0,
          },
        ],
      };

      command.attachments.forEach((attachment) => {
        expect(attachment.argumentId).toBeDefined();
        expect(attachment.parentNodeId).toBeDefined();
        expect(typeof attachment.argumentId).toBe('string');
        expect(typeof attachment.parentNodeId).toBe('string');
        expect(attachment.argumentId.length).toBeGreaterThan(0);
        expect(attachment.parentNodeId.length).toBeGreaterThan(0);
      });
    });

    test('should handle complex tree structure attachments', () => {
      const command: BatchAttachNodesCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        attachments: [
          // Multiple children for root node
          { argumentId: 'child-1', parentNodeId: 'root', premisePosition: 0 },
          { argumentId: 'child-2', parentNodeId: 'root', premisePosition: 1 },
          // Grandchildren
          { argumentId: 'grandchild-1', parentNodeId: 'child-1', premisePosition: 0 },
          { argumentId: 'grandchild-2', parentNodeId: 'child-1', premisePosition: 1 },
          { argumentId: 'grandchild-3', parentNodeId: 'child-2', premisePosition: 0 },
        ],
      };

      expect(command.attachments).toHaveLength(5);
      // Check root children
      const rootChildren = command.attachments.filter((att) => att.parentNodeId === 'root');
      expect(rootChildren).toHaveLength(2);
      // Check grandchildren
      const grandchildren = command.attachments.filter((att) =>
        att.parentNodeId.startsWith('child-'),
      );
      expect(grandchildren).toHaveLength(3);
    });
  });

  describe('Type safety and structure validation', () => {
    test('should enforce required properties for all command types', () => {
      // These would cause TypeScript errors if uncommented:
      // const invalidCreateTree: CreateTreeCommand = { documentId: 'doc-123' }; // Missing position
      // const invalidMoveTree: MoveTreeCommand = { documentId: 'doc-123', treeId: 'tree-456' }; // Missing position
      // const invalidAttachNode: AttachNodeCommand = { documentId: 'doc-123', treeId: 'tree-456' }; // Missing other required props

      // Valid commands should compile without errors
      const validCreateTree: CreateTreeCommand = {
        documentId: 'doc-123',
        position: { x: 0, y: 0 },
      };
      const validMoveTree: MoveTreeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        position: { x: 0, y: 0 },
      };
      const validAttachNode: AttachNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        argumentId: 'arg-789',
        parentNodeId: 'node-101',
        premisePosition: 0,
      };

      expect(validCreateTree).toBeDefined();
      expect(validMoveTree).toBeDefined();
      expect(validAttachNode).toBeDefined();
    });

    test('should handle command serialization and deserialization', () => {
      const command: CreateBranchFromSelectionCommand = {
        documentId: 'doc-123',
        sourceArgumentId: 'arg-456',
        selectedText: 'Selected text for branching',
        position: 'premise',
        newTreeId: 'new-tree-789',
      };

      const serialized = JSON.stringify(command);
      const deserialized = JSON.parse(serialized) as CreateBranchFromSelectionCommand;

      expect(deserialized).toEqual(command);
      expect(deserialized.documentId).toBe(command.documentId);
      expect(deserialized.sourceArgumentId).toBe(command.sourceArgumentId);
      expect(deserialized.selectedText).toBe(command.selectedText);
      expect(deserialized.position).toBe(command.position);
      expect(deserialized.newTreeId).toBe(command.newTreeId);
    });

    test('should handle batch command serialization', () => {
      const batchCommand: BatchCreateStatementsCommand = {
        documentId: 'doc-123',
        statements: [
          { content: 'First statement', externalId: 'ext-1' },
          { content: 'Second statement' },
        ],
      };

      const serialized = JSON.stringify(batchCommand);
      const deserialized = JSON.parse(serialized) as BatchCreateStatementsCommand;

      expect(deserialized).toEqual(batchCommand);
      expect(deserialized.statements).toHaveLength(2);
      expect(deserialized.statements[0]?.content).toBe('First statement');
      expect(deserialized.statements[0]?.externalId).toBe('ext-1');
    });
  });

  describe('Tree workflow patterns', () => {
    test('should support tree creation workflow', () => {
      const createTreeCommand: CreateTreeCommand = {
        documentId: 'doc-123',
        position: { x: 100, y: 200 },
      };

      const createRootCommand: CreateRootNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        argumentId: 'root-arg',
      };

      expect(createTreeCommand.documentId).toBe(createRootCommand.documentId);
      expect(createRootCommand.treeId).toBe('tree-456');
      expect(createRootCommand.argumentId).toBe('root-arg');
    });

    test('should support node attachment workflow', () => {
      const attachCommand: AttachNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        argumentId: 'child-arg',
        parentNodeId: 'parent-node',
        premisePosition: 0,
      };

      const detachCommand: DetachNodeCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        nodeId: 'child-node',
      };

      expect(attachCommand.documentId).toBe(detachCommand.documentId);
      expect(attachCommand.treeId).toBe(detachCommand.treeId);
    });

    test('should support branching workflow', () => {
      const branchCommand: CreateBranchFromSelectionCommand = {
        documentId: 'doc-123',
        sourceArgumentId: 'source-arg',
        selectedText: 'All men are mortal',
        position: 'premise',
        newTreeId: 'new-tree',
      };

      const createTreeCommand: CreateTreeCommand = {
        documentId: 'doc-123',
        position: { x: 300, y: 400 },
      };

      expect(branchCommand.documentId).toBe(createTreeCommand.documentId);
      expect(branchCommand.newTreeId).toBe('new-tree');
      expect(branchCommand.position).toBe('premise');
    });

    test('should support batch operations workflow', () => {
      const batchStatementsCommand: BatchCreateStatementsCommand = {
        documentId: 'doc-123',
        statements: [
          { content: 'Statement 1', externalId: 'import-1' },
          { content: 'Statement 2', externalId: 'import-2' },
        ],
      };

      const batchAttachCommand: BatchAttachNodesCommand = {
        documentId: 'doc-123',
        treeId: 'tree-456',
        attachments: [
          { argumentId: 'arg-1', parentNodeId: 'parent', premisePosition: 0 },
          { argumentId: 'arg-2', parentNodeId: 'parent', premisePosition: 1 },
        ],
      };

      expect(batchStatementsCommand.documentId).toBe(batchAttachCommand.documentId);
      expect(batchStatementsCommand.statements).toHaveLength(2);
      expect(batchAttachCommand.attachments).toHaveLength(2);
    });
  });

  describe('Core workflow: Branching from selection', () => {
    test('should handle premise branching', () => {
      const command: CreateBranchFromSelectionCommand = {
        documentId: 'doc-123',
        sourceArgumentId: 'source-arg',
        selectedText: 'All men are mortal',
        position: 'premise',
      };

      expect(command.position).toBe('premise');
      expect(command.selectedText).toBe('All men are mortal');
    });

    test('should handle conclusion branching', () => {
      const command: CreateBranchFromSelectionCommand = {
        documentId: 'doc-123',
        sourceArgumentId: 'source-arg',
        selectedText: 'Socrates is mortal',
        position: 'conclusion',
      };

      expect(command.position).toBe('conclusion');
      expect(command.selectedText).toBe('Socrates is mortal');
    });

    test('should handle branching into existing tree', () => {
      const command: CreateBranchFromSelectionCommand = {
        documentId: 'doc-123',
        sourceArgumentId: 'source-arg',
        selectedText: 'Selected text',
        position: 'premise',
        // No newTreeId means branch into existing tree
      };

      expect(command.newTreeId).toBeUndefined();
    });

    test('should handle branching into new tree', () => {
      const command: CreateBranchFromSelectionCommand = {
        documentId: 'doc-123',
        sourceArgumentId: 'source-arg',
        selectedText: 'Selected text',
        position: 'premise',
        newTreeId: 'new-independent-tree',
      };

      expect(command.newTreeId).toBe('new-independent-tree');
    });
  });
});
