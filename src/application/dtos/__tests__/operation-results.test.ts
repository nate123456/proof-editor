/**
 * Comprehensive test suite for operation-results.ts DTOs
 *
 * Tests data structure validation, type integrity, and boundary conditions
 * for application layer DTOs used for command/query results and operation metadata.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { SideLabel } from '../../../domain/shared/value-objects/content.js';
import { ErrorSeverity } from '../../../domain/shared/value-objects/enums.js';
import {
  AtomicArgumentId,
  NodeId,
  StatementId,
  TreeId,
} from '../../../domain/shared/value-objects/identifiers.js';
import { ErrorCode, ErrorMessage } from '../../../domain/shared/value-objects/ui.js';
import type {
  AttachNodeResult,
  BootstrapResult,
  BranchCreationResult,
  CommandResult,
  CommandWithMetadata,
  CreateArgumentResult,
  CreateStatementResult,
  ErrorDTO,
  EventDTO,
  ImportResult,
  OperationMetadata,
  QueryResult,
  ValidationResult,
} from '../operation-results.js';
import {
  createErrorResult,
  createEvent,
  createOperationMetadata,
  createSuccessResult,
  getBootstrapNextSteps,
  hasValidationErrors,
  isBootstrapResult,
  isCommandResult,
  isErrorDTO,
  isEventDTO,
  isOperationMetadata,
  isQueryResult,
  isValidationResult,
  mergeValidationResults,
} from '../operation-results.js';

describe('OperationMetadata', () => {
  it('should handle complete operation metadata', () => {
    const metadata: OperationMetadata = {
      operationId: 'op_123456',
      timestamp: '2023-01-01T00:00:00.000Z',
      userId: 'user_789',
      correlationId: 'correlation_abc',
      source: 'user',
    };

    expect(metadata.operationId).toBe('op_123456');
    expect(metadata.timestamp).toBe('2023-01-01T00:00:00.000Z');
    expect(metadata.userId).toBe('user_789');
    expect(metadata.correlationId).toBe('correlation_abc');
    expect(metadata.source).toBe('user');
  });

  it('should handle minimal operation metadata', () => {
    const metadata: OperationMetadata = {
      operationId: 'op_123456',
      timestamp: '2023-01-01T00:00:00.000Z',
    };

    expect(metadata.operationId).toBe('op_123456');
    expect(metadata.timestamp).toBe('2023-01-01T00:00:00.000Z');
    expect(metadata.userId).toBeUndefined();
    expect(metadata.correlationId).toBeUndefined();
    expect(metadata.source).toBeUndefined();
  });

  it('should handle all valid source types', () => {
    const sources: Array<'user' | 'system' | 'import'> = ['user', 'system', 'import'];

    sources.forEach((source) => {
      const metadata: OperationMetadata = {
        operationId: 'op_123456',
        timestamp: '2023-01-01T00:00:00.000Z',
        source,
      };

      expect(metadata.source).toBe(source);
    });
  });

  it('should handle empty string IDs', () => {
    const metadata: OperationMetadata = {
      operationId: '',
      timestamp: '2023-01-01T00:00:00.000Z',
      userId: '',
      correlationId: '',
    };

    expect(metadata.operationId).toBe('');
    expect(metadata.userId).toBe('');
    expect(metadata.correlationId).toBe('');
  });

  it('should handle various timestamp formats', () => {
    const timestamps = [
      '2023-01-01T00:00:00.000Z',
      '2023-12-31T23:59:59.999Z',
      new Date().toISOString(),
      '2023-06-15T12:30:45.123Z',
    ];

    timestamps.forEach((timestamp) => {
      const metadata: OperationMetadata = {
        operationId: 'op_123456',
        timestamp,
      };

      expect(metadata.timestamp).toBe(timestamp);
      expect(() => new Date(metadata.timestamp)).not.toThrow();
    });
  });

  it('should handle long IDs and correlation IDs', () => {
    const longId = `op_${'a'.repeat(100)}`;
    const longCorrelationId = `correlation_${'b'.repeat(100)}`;

    const metadata: OperationMetadata = {
      operationId: longId,
      timestamp: '2023-01-01T00:00:00.000Z',
      correlationId: longCorrelationId,
    };

    expect(metadata.operationId).toBe(longId);
    expect(metadata.correlationId).toBe(longCorrelationId);
  });
});

describe('CommandWithMetadata', () => {
  it('should handle command with metadata', () => {
    interface TestCommand {
      action: string;
      target: string;
    }

    const command: CommandWithMetadata<TestCommand> = {
      metadata: {
        operationId: 'op_123456',
        timestamp: '2023-01-01T00:00:00.000Z',
        userId: 'user_789',
        source: 'user',
      },
      payload: {
        action: 'create',
        target: 'statement',
      },
    };

    expect(command.metadata.operationId).toBe('op_123456');
    expect(command.payload.action).toBe('create');
    expect(command.payload.target).toBe('statement');
  });

  it('should handle complex payload types', () => {
    interface ComplexPayload {
      id: string;
      data: {
        properties: Record<string, unknown>;
        tags: string[];
      };
      options?: {
        validate: boolean;
        persist: boolean;
      };
    }

    const command: CommandWithMetadata<ComplexPayload> = {
      metadata: {
        operationId: 'op_123456',
        timestamp: '2023-01-01T00:00:00.000Z',
      },
      payload: {
        id: 'test_id',
        data: {
          properties: { name: 'test', value: 42 },
          tags: ['tag1', 'tag2'],
        },
        options: {
          validate: true,
          persist: false,
        },
      },
    };

    expect(command.payload.id).toBe('test_id');
    expect(command.payload.data.properties.name).toBe('test');
    expect(command.payload.data.tags).toContain('tag1');
    expect(command.payload.options?.validate).toBe(true);
  });
});

describe('CommandResult', () => {
  it('should handle successful command result without data', () => {
    const result: CommandResult = {
      success: true,
    };

    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(result.events).toBeUndefined();
  });

  it('should handle successful command result with data', () => {
    interface TestData {
      id: string;
      name: string;
    }

    const result: CommandResult<TestData> = {
      success: true,
      data: {
        id: 'test_id',
        name: 'test_name',
      },
    };

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('test_id');
    expect(result.data?.name).toBe('test_name');
  });

  it('should handle failed command result', () => {
    const result: CommandResult = {
      success: false,
      error: {
        code: ErrorCode.create('VALIDATION_ERROR').unwrapOr(null)?.getValue() ?? '',
        message: ErrorMessage.create('Invalid input provided').unwrapOr(null)?.getValue() ?? '',
        details: { field: 'name', reason: 'required' },
      },
    };

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(result.error?.message).toBe('Invalid input provided');
    expect(result.error?.details).toEqual({ field: 'name', reason: 'required' });
  });

  it('should handle command result with events', () => {
    const result: CommandResult<{ id: string }> = {
      success: true,
      data: { id: 'test_id' },
      events: [
        {
          type: 'ENTITY_CREATED',
          payload: { entityId: 'test_id' },
          timestamp: '2023-01-01T00:00:00.000Z',
        },
        {
          type: 'VALIDATION_PASSED',
          payload: { validationRules: ['required', 'format'] },
          timestamp: '2023-01-01T00:00:01.000Z',
        },
      ],
    };

    expect(result.success).toBe(true);
    expect(result.events).toHaveLength(2);
    expect(result.events?.[0]?.type).toBe('ENTITY_CREATED');
    expect(result.events?.[1]?.type).toBe('VALIDATION_PASSED');
  });

  it('should handle command result with multiple errors', () => {
    const result: CommandResult = {
      success: false,
      error: {
        code: ErrorCode.create('MULTIPLE_ERRORS').unwrapOr(null)?.getValue() ?? '',
        message:
          ErrorMessage.create('Multiple validation errors occurred').unwrapOr(null)?.getValue() ??
          '',
        details: [
          { field: 'name', error: 'required' },
          { field: 'email', error: 'invalid format' },
        ],
      },
    };

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('MULTIPLE_ERRORS');
    expect(Array.isArray(result.error?.details)).toBe(true);
  });
});

describe('QueryResult', () => {
  it('should handle successful query result', () => {
    interface TestData {
      items: Array<{ id: string; name: string }>;
      total: number;
    }

    const result: QueryResult<TestData> = {
      success: true,
      data: {
        items: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ],
        total: 2,
      },
    };

    expect(result.success).toBe(true);
    expect(result.data?.items).toHaveLength(2);
    expect(result.data?.total).toBe(2);
  });

  it('should handle failed query result', () => {
    const result: QueryResult<unknown> = {
      success: false,
      error: {
        code: ErrorCode.create('NOT_FOUND').unwrapOr(null)?.getValue() ?? '',
        message: ErrorMessage.create('Resource not found').unwrapOr(null)?.getValue() ?? '',
      },
    };

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NOT_FOUND');
    expect(result.error?.message).toBe('Resource not found');
  });

  it('should handle query result with null data', () => {
    const result: QueryResult<null> = {
      success: true,
      data: null,
    };

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});

describe('ErrorDTO', () => {
  it('should handle basic error', () => {
    const error: ErrorDTO = {
      code: ErrorCode.create('VALIDATION_ERROR').unwrapOr(null)?.getValue() ?? '',
      message: ErrorMessage.create('Validation failed').unwrapOr(null)?.getValue() ?? '',
    };

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Validation failed');
    expect(error.details).toBeUndefined();
  });

  it('should handle error with details', () => {
    const error: ErrorDTO = {
      code: ErrorCode.create('VALIDATION_ERROR').unwrapOr(null)?.getValue() ?? '',
      message: ErrorMessage.create('Validation failed').unwrapOr(null)?.getValue() ?? '',
      details: {
        field: 'email',
        providedValue: 'invalid-email',
        expectedFormat: 'email',
      },
    };

    expect(error.details).toEqual({
      field: 'email',
      providedValue: 'invalid-email',
      expectedFormat: 'email',
    });
  });

  it('should handle error with array details', () => {
    const error: ErrorDTO = {
      code: ErrorCode.create('MULTIPLE_ERRORS').unwrapOr(null)?.getValue() ?? '',
      message: ErrorMessage.create('Multiple validation errors').unwrapOr(null)?.getValue() ?? '',
      details: [
        { field: 'name', error: 'required' },
        { field: 'age', error: 'must be positive' },
      ],
    };

    expect(Array.isArray(error.details)).toBe(true);
    expect(error.details).toHaveLength(2);
  });

  it('should handle error with primitive details', () => {
    const errorWithString: ErrorDTO = {
      code: ErrorCode.create('SIMPLE_ERROR').unwrapOr(null)?.getValue() ?? '',
      message: ErrorMessage.create('Simple error').unwrapOr(null)?.getValue() ?? '',
      details: 'Additional info',
    };

    const errorWithNumber: ErrorDTO = {
      code: ErrorCode.create('NUMERIC_ERROR').unwrapOr(null)?.getValue() ?? '',
      message: ErrorMessage.create('Numeric error').unwrapOr(null)?.getValue() ?? '',
      details: 404,
    };

    expect(errorWithString.details).toBe('Additional info');
    expect(errorWithNumber.details).toBe(404);
  });
});

describe('EventDTO', () => {
  it('should handle basic event', () => {
    const event: EventDTO = {
      type: 'USER_CREATED',
      payload: { userId: 'user_123', name: 'John Doe' },
      timestamp: '2023-01-01T00:00:00.000Z',
    };

    expect(event.type).toBe('USER_CREATED');
    expect(event.payload.userId).toBe('user_123');
    expect(event.timestamp).toBe('2023-01-01T00:00:00.000Z');
  });

  it('should handle event with empty payload', () => {
    const event: EventDTO = {
      type: 'SYSTEM_STARTUP',
      payload: {},
      timestamp: '2023-01-01T00:00:00.000Z',
    };

    expect(event.type).toBe('SYSTEM_STARTUP');
    expect(event.payload).toEqual({});
  });

  it('should handle event with complex payload', () => {
    const event: EventDTO = {
      type: 'COMPLEX_EVENT',
      payload: {
        entity: { id: 'entity_123', type: 'statement' },
        changes: [
          { field: 'content', from: 'old', to: 'new' },
          { field: 'updatedAt', from: '2023-01-01', to: '2023-01-02' },
        ],
        metadata: { userId: 'user_123', source: 'ui' },
      },
      timestamp: '2023-01-01T00:00:00.000Z',
    };

    expect((event.payload as any).entity.id).toBe('entity_123');
    expect((event.payload as any).changes).toHaveLength(2);
    expect((event.payload as any).metadata.userId).toBe('user_123');
  });
});

describe('CreateStatementResult', () => {
  it('should handle create statement result', () => {
    const result: CreateStatementResult = {
      statementId: 'stmt_123',
      statement: {
        id: 'stmt_123',
        content: 'Test statement',
        usageCount: 0,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-01T00:00:00.000Z',
      },
    };

    expect(result.statementId).toBe('stmt_123');
    expect(result.statement.id).toBe('stmt_123');
    expect(result.statement.content).toBe('Test statement');
    expect(result.statement.usageCount).toBe(0);
  });

  it('should handle statement with usage count', () => {
    const result: CreateStatementResult = {
      statementId: 'stmt_123',
      statement: {
        id: 'stmt_123',
        content: 'Reused statement',
        usageCount: 5,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-02T00:00:00.000Z',
      },
    };

    expect(result.statement.usageCount).toBe(5);
    expect(result.statement.modifiedAt).toBe('2023-01-02T00:00:00.000Z');
  });
});

describe('CreateArgumentResult', () => {
  it('should handle create argument result without created ordered sets', () => {
    const argumentId = AtomicArgumentId.create('arg_123').unwrapOr(null)!;
    const premiseId1 = StatementId.create('stmt_1').unwrapOr(null)!;
    const premiseId2 = StatementId.create('stmt_2').unwrapOr(null)!;
    const conclusionId = StatementId.create('stmt_3').unwrapOr(null)!;
    const result: CreateArgumentResult = {
      argumentId: 'arg_123',
      argument: {
        id: argumentId,
        premiseIds: [premiseId1, premiseId2],
        conclusionIds: [conclusionId],
        sideLabels: {
          left: SideLabel.create('Modus Ponens').unwrapOr(null)!,
          right: SideLabel.create('Rule 1').unwrapOr(null)!,
        },
      },
    };

    expect(result.argumentId).toBe('arg_123');
    expect(result.argument.id.getValue()).toBe('arg_123');
    expect(result.argument.premiseIds.map((id) => id.getValue())).toEqual(['stmt_1', 'stmt_2']);
    expect(result.argument.conclusionIds.map((id) => id.getValue())).toEqual(['stmt_3']);
    // createdOrderedSets removed in Statement-level paradigm
  });

  // Test removed - createdOrderedSets property no longer exists in Statement-level paradigm

  it('should handle bootstrap argument result', () => {
    const argumentId = AtomicArgumentId.create('arg_bootstrap').unwrapOr(null)!;
    const result: CreateArgumentResult = {
      argumentId: 'arg_bootstrap',
      argument: {
        id: argumentId,
        premiseIds: [],
        conclusionIds: [],
      },
    };

    expect(result.argument.premiseIds).toEqual([]);
    expect(result.argument.conclusionIds).toEqual([]);
  });
});

describe('AttachNodeResult', () => {
  it('should handle attach node result', () => {
    const result: AttachNodeResult = {
      nodeId: 'node_123',
      treeStructure: {
        treeId: 'tree_456',
        nodes: [
          {
            nodeId: 'node_123',
            argumentId: 'arg_789',
            isRoot: false,
          },
        ],
        connections: [
          {
            fromNodeId: 'node_123',
            toNodeId: 'node_456',
            premisePosition: 0,
          },
        ],
        depth: 2,
        breadth: 3,
      },
    };

    expect(result.nodeId).toBe('node_123');
    expect(result.treeStructure.treeId).toBe('tree_456');
    expect(result.treeStructure.nodes).toHaveLength(1);
    expect(result.treeStructure.connections).toHaveLength(1);
    expect(result.treeStructure.depth).toBe(2);
    expect(result.treeStructure.breadth).toBe(3);
  });

  it('should handle attach root node result', () => {
    const result: AttachNodeResult = {
      nodeId: 'root_node',
      treeStructure: {
        treeId: 'tree_456',
        nodes: [
          {
            nodeId: 'root_node',
            argumentId: 'arg_789',
            isRoot: true,
          },
        ],
        connections: [],
        depth: 1,
        breadth: 1,
      },
    };

    expect(result.treeStructure.nodes[0]?.isRoot).toBe(true);
    expect(result.treeStructure.connections).toHaveLength(0);
    expect(result.treeStructure.depth).toBe(1);
    expect(result.treeStructure.breadth).toBe(1);
  });
});

describe('BranchCreationResult', () => {
  it('should handle branch creation result without new tree', () => {
    const argNewId = AtomicArgumentId.create('arg_new').unwrapOr(null)!;
    const sharedStatementId = StatementId.create('stmt_shared').unwrapOr(null)!;
    const result: BranchCreationResult = {
      newStatement: {
        id: 'stmt_new',
        content: 'New statement',
        usageCount: 0,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-01T00:00:00.000Z',
      },
      newArgument: {
        id: argNewId,
        premiseIds: [sharedStatementId],
        conclusionIds: [StatementId.create('stmt_new').unwrapOr(null)!],
      },
      connectionPoint: {
        sourceArgumentId: 'arg_source',
        targetArgumentId: 'arg_new',
        sharedStatementId: 'stmt_shared',
        connectionType: 'conclusion-to-premise' as const,
      },
    };

    expect(result.newStatement.id).toBe('stmt_new');
    expect(result.newArgument.id.getValue()).toBe('arg_new');
    expect(result.connectionPoint.sourceArgumentId).toBe('arg_source');
    expect(result.connectionPoint.targetArgumentId).toBe('arg_new');
    expect(result.connectionPoint.sharedStatementId).toBe('stmt_shared');
    expect(result.connectionPoint.connectionType).toBe('conclusion-to-premise');
    expect(result.newTreeId).toBeUndefined();
  });

  it('should handle branch creation result with new tree', () => {
    const argNewId = AtomicArgumentId.create('arg_new').unwrapOr(null)!;
    const sharedStatementId = StatementId.create('stmt_shared').unwrapOr(null)!;
    const result: BranchCreationResult = {
      newStatement: {
        id: 'stmt_new',
        content: 'New statement',
        usageCount: 0,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-01T00:00:00.000Z',
      },
      newArgument: {
        id: argNewId,
        premiseIds: [sharedStatementId],
        conclusionIds: [StatementId.create('stmt_new').unwrapOr(null)!],
      },
      connectionPoint: {
        sourceArgumentId: 'arg_source',
        targetArgumentId: 'arg_new',
        sharedStatementId: 'stmt_shared',
        connectionType: 'conclusion-to-premise' as const,
      },
      newTreeId: 'tree_new',
    };

    expect(result.newTreeId).toBe('tree_new');
  });
});

describe('ValidationResult', () => {
  it('should handle valid result', () => {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.customScriptResults).toBeUndefined();
  });

  it('should handle invalid result with errors', () => {
    const result: ValidationResult = {
      isValid: false,
      errors: [
        {
          code: ErrorCode.create('REQUIRED_FIELD').unwrapOr(null)!,
          message: ErrorMessage.create('Field is required').unwrapOr(null)!,
          severity: ErrorSeverity.ERROR,
          location: {
            treeId: TreeId.create('tree_123').unwrapOr(null)!,
            nodeId: NodeId.create('node_456').unwrapOr(null)!,
            argumentId: AtomicArgumentId.create('arg_789').unwrapOr(null)!,
          },
        },
      ],
      warnings: [
        {
          code: ErrorCode.create('DEPRECATED_USAGE').unwrapOr(null)!,
          message: ErrorMessage.create('Usage is deprecated').unwrapOr(null)!,
          severity: ErrorSeverity.WARNING,
        },
      ],
    };

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.errors[0]?.code.getValue()).toBe('REQUIRED_FIELD');
    expect(result.warnings[0]?.code.getValue()).toBe('DEPRECATED_USAGE');
  });

  it('should handle result with custom script results', () => {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      customScriptResults: [
        {
          scriptId: 'logic_checker',
          passed: true,
          messages: ['All logic rules validated successfully'],
        },
        {
          scriptId: 'style_checker',
          passed: false,
          messages: ['Style violation: inconsistent naming', 'Style violation: missing labels'],
        },
      ],
    };

    expect(result.customScriptResults).toHaveLength(2);
    expect(result.customScriptResults?.[0]?.passed).toBe(true);
    expect(result.customScriptResults?.[1]?.passed).toBe(false);
    expect(result.customScriptResults?.[1]?.messages).toHaveLength(2);
  });
});

describe('ImportResult', () => {
  it('should handle successful import result', () => {
    const result: ImportResult = {
      documentId: 'doc_123',
      stats: {
        statementsImported: 25,
        argumentsImported: 15,
        treesImported: 3,
        errors: [],
      },
    };

    expect(result.documentId).toBe('doc_123');
    expect(result.stats.statementsImported).toBe(25);
    expect(result.stats.argumentsImported).toBe(15);
    expect(result.stats.treesImported).toBe(3);
    expect(result.stats.errors).toEqual([]);
  });

  it('should handle import result with errors', () => {
    const result: ImportResult = {
      documentId: 'doc_123',
      stats: {
        statementsImported: 20,
        argumentsImported: 10,
        treesImported: 2,
        errors: [
          'Failed to import statement on line 25: invalid format',
          'Failed to import argument on line 30: missing conclusion',
        ],
      },
    };

    expect(result.stats.errors).toHaveLength(2);
    expect(result.stats.errors[0]).toContain('line 25');
    expect(result.stats.errors[1]).toContain('line 30');
  });

  it('should handle import result with zero imports', () => {
    const result: ImportResult = {
      documentId: 'doc_123',
      stats: {
        statementsImported: 0,
        argumentsImported: 0,
        treesImported: 0,
        errors: ['No valid data found in import file'],
      },
    };

    expect(result.stats.statementsImported).toBe(0);
    expect(result.stats.argumentsImported).toBe(0);
    expect(result.stats.treesImported).toBe(0);
    expect(result.stats.errors).toHaveLength(1);
  });
});

describe('BootstrapResult', () => {
  it('should handle empty bootstrap result', () => {
    const result: BootstrapResult = {
      success: true,
      phase: 'empty',
      nextSteps: ['Create your first statement', 'Add premises and conclusions'],
    };

    expect(result.success).toBe(true);
    expect(result.phase).toBe('empty');
    expect(result.nextSteps).toHaveLength(2);
    expect(result.createdEntities).toBeUndefined();
  });

  it('should handle first argument bootstrap result', () => {
    const result: BootstrapResult = {
      success: true,
      phase: 'first_argument',
      createdEntities: {
        argumentId: 'arg_bootstrap',
        treeId: 'tree_bootstrap',
      },
      nextSteps: ['Add statements to your argument', 'Create premise and conclusion sets'],
    };

    expect(result.phase).toBe('first_argument');
    expect(result.createdEntities?.argumentId).toBe('arg_bootstrap');
    expect(result.createdEntities?.treeId).toBe('tree_bootstrap');
    expect(result.createdEntities?.statementIds).toBeUndefined();
    // orderedSetIds removed in Statement-level paradigm
  });

  it('should handle populating bootstrap result', () => {
    const result: BootstrapResult = {
      success: true,
      phase: 'populating',
      createdEntities: {
        argumentId: 'arg_bootstrap',
        treeId: 'tree_bootstrap',
        statementIds: ['stmt_1', 'stmt_2', 'stmt_3'],
      },
      nextSteps: ['Connect arguments', 'Add more statements'],
    };

    expect(result.phase).toBe('populating');
    expect(result.createdEntities?.statementIds).toHaveLength(3);
    // orderedSetIds removed in Statement-level paradigm
  });

  it('should handle complete bootstrap result', () => {
    const result: BootstrapResult = {
      success: true,
      phase: 'complete',
      createdEntities: {
        argumentId: 'arg_bootstrap',
        treeId: 'tree_bootstrap',
        statementIds: ['stmt_1', 'stmt_2', 'stmt_3'],
      },
      nextSteps: ['Continue building your proof', 'Add validation rules'],
    };

    expect(result.phase).toBe('complete');
    expect(result.nextSteps).toContain('Continue building your proof');
  });

  it('should handle failed bootstrap result', () => {
    const result: BootstrapResult = {
      success: false,
      phase: 'empty',
      nextSteps: ['Fix validation errors', 'Try again'],
    };

    expect(result.success).toBe(false);
    expect(result.phase).toBe('empty');
    expect(result.nextSteps).toContain('Fix validation errors');
  });
});

describe('property-based testing', () => {
  it('should handle arbitrary operation metadata', () => {
    fc.assert(
      fc.property(
        fc.record({
          operationId: fc.string(),
          timestamp: fc
            .integer({ min: 0, max: 4102444800000 })
            .map((ms) => new Date(ms).toISOString()),
          userId: fc.option(fc.string(), { nil: undefined }),
          correlationId: fc.option(fc.string(), { nil: undefined }),
          source: fc.option(fc.constantFrom('user', 'system', 'import'), { nil: undefined }),
        }),
        (params) => {
          const metadata: OperationMetadata = {
            operationId: params.operationId,
            timestamp: params.timestamp,
            ...(params.userId !== undefined ? { userId: params.userId } : {}),
            ...(params.correlationId !== undefined ? { correlationId: params.correlationId } : {}),
            ...(params.source !== undefined ? { source: params.source } : {}),
          };

          expect(typeof metadata.operationId).toBe('string');
          expect(typeof metadata.timestamp).toBe('string');
          expect(() => new Date(metadata.timestamp)).not.toThrow();

          if (metadata.userId !== undefined) {
            expect(typeof metadata.userId).toBe('string');
          }
          if (metadata.correlationId !== undefined) {
            expect(typeof metadata.correlationId).toBe('string');
          }
          if (metadata.source !== undefined) {
            expect(['user', 'system', 'import']).toContain(metadata.source);
          }
        },
      ),
    );
  });

  it('should handle arbitrary command results', () => {
    fc.assert(
      fc.property(
        fc.record({
          success: fc.boolean(),
          data: fc.option(fc.record({ id: fc.string() }), { nil: undefined }),
          error: fc.option(
            fc.record({
              code: fc.string(),
              message: fc.string(),
              details: fc.option(fc.anything(), { nil: undefined }),
            }),
            { nil: undefined },
          ),
          events: fc.option(
            fc.array(
              fc.record({
                type: fc.string(),
                payload: fc.record({}),
                timestamp: fc
                  .integer({ min: 0, max: 4102444800000 })
                  .map((ms) => new Date(ms).toISOString()),
              }),
            ),
            { nil: undefined },
          ),
        }),
        (params) => {
          const result: CommandResult<{ id: string }> = {
            success: params.success,
            ...(params.data !== undefined ? { data: params.data } : {}),
            ...(params.error !== undefined ? { error: params.error } : {}),
            ...(params.events !== undefined ? { events: params.events } : {}),
          };

          expect(typeof result.success).toBe('boolean');

          if (result.data !== undefined) {
            expect(typeof result.data.id).toBe('string');
          }

          if (result.error !== undefined) {
            expect(typeof result.error.code).toBe('string');
            expect(typeof result.error.message).toBe('string');
          }

          if (result.events !== undefined) {
            expect(Array.isArray(result.events)).toBe(true);
            result.events.forEach((event) => {
              expect(typeof event.type).toBe('string');
              expect(typeof event.timestamp).toBe('string');
            });
          }
        },
      ),
    );
  });

  it('should handle arbitrary validation results', () => {
    const validationErrorArb = fc.record({
      code: fc
        .string({ minLength: 1 })
        .map((s) => ErrorCode.create(s).unwrapOr(ErrorCode.create('DEFAULT_CODE').unwrapOr(null)!)),
      message: fc
        .string({ minLength: 1 })
        .map((s) =>
          ErrorMessage.create(s).unwrapOr(ErrorMessage.create('Default message').unwrapOr(null)!),
        ),
      severity: fc.constantFrom(ErrorSeverity.ERROR, ErrorSeverity.WARNING, ErrorSeverity.INFO),
    });

    fc.assert(
      fc.property(
        fc.record({
          isValid: fc.boolean(),
          errors: fc.array(validationErrorArb),
          warnings: fc.array(validationErrorArb),
        }),
        (params) => {
          const result: ValidationResult = params;

          expect(typeof result.isValid).toBe('boolean');
          expect(Array.isArray(result.errors)).toBe(true);
          expect(Array.isArray(result.warnings)).toBe(true);

          result.errors.forEach((error) => {
            expect(error.code).toBeDefined();
            expect(error.code.getValue).toBeDefined();
            expect(typeof error.code.getValue()).toBe('string');
            expect(error.message).toBeDefined();
            expect(error.message.getValue).toBeDefined();
            expect(typeof error.message.getValue()).toBe('string');
            expect([ErrorSeverity.ERROR, ErrorSeverity.WARNING, ErrorSeverity.INFO]).toContain(
              error.severity,
            );
          });

          result.warnings.forEach((warning) => {
            expect(warning.code).toBeDefined();
            expect(warning.code.getValue).toBeDefined();
            expect(typeof warning.code.getValue()).toBe('string');
            expect(warning.message).toBeDefined();
            expect(warning.message.getValue).toBeDefined();
            expect(typeof warning.message.getValue()).toBe('string');
            expect([ErrorSeverity.ERROR, ErrorSeverity.WARNING, ErrorSeverity.INFO]).toContain(
              warning.severity,
            );
          });
        },
      ),
    );
  });
});

describe('integration scenarios', () => {
  it('should handle complete command workflow', () => {
    // Command with metadata
    const command: CommandWithMetadata<{ action: string }> = {
      metadata: {
        operationId: 'op_123',
        timestamp: new Date().toISOString(),
        userId: 'user_123',
        source: 'user',
      },
      payload: {
        action: 'create_statement',
      },
    };

    // Successful result
    const result: CommandResult<CreateStatementResult> = {
      success: true,
      data: {
        statementId: 'stmt_123',
        statement: {
          id: 'stmt_123',
          content: 'Test statement',
          usageCount: 0,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        },
      },
      events: [
        {
          type: 'STATEMENT_CREATED',
          payload: { statementId: 'stmt_123' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    expect(command.metadata.operationId).toBe('op_123');
    expect(result.success).toBe(true);
    expect(result.data?.statementId).toBe('stmt_123');
    expect(result.events).toHaveLength(1);
  });

  it('should handle bootstrap workflow', () => {
    // Empty phase
    const emptyResult: BootstrapResult = {
      success: true,
      phase: 'empty',
      nextSteps: ['Create first argument'],
    };

    // First argument phase
    const firstArgResult: BootstrapResult = {
      success: true,
      phase: 'first_argument',
      createdEntities: {
        argumentId: 'arg_bootstrap',
        treeId: 'tree_bootstrap',
      },
      nextSteps: ['Add statements'],
    };

    // Complete phase
    const completeResult: BootstrapResult = {
      success: true,
      phase: 'complete',
      createdEntities: {
        argumentId: 'arg_bootstrap',
        treeId: 'tree_bootstrap',
        statementIds: ['stmt_1', 'stmt_2'],
      },
      nextSteps: ['Continue building proof'],
    };

    expect(emptyResult.phase).toBe('empty');
    expect(firstArgResult.createdEntities?.argumentId).toBe('arg_bootstrap');
    expect(completeResult.createdEntities?.statementIds).toHaveLength(2);
  });

  it('should handle validation workflow', () => {
    // Failed validation
    const failedValidation: ValidationResult = {
      isValid: false,
      errors: [
        {
          code: ErrorCode.create('MISSING_CONCLUSION').unwrapOr(null)!,
          message: ErrorMessage.create('Argument missing conclusion').unwrapOr(null)!,
          severity: ErrorSeverity.ERROR,
          location: {
            argumentId: AtomicArgumentId.create('arg_123').unwrapOr(null)!,
          },
        },
      ],
      warnings: [
        {
          code: ErrorCode.create('UNUSED_STATEMENT').unwrapOr(null)!,
          message: ErrorMessage.create('Statement not used in any argument').unwrapOr(null)!,
          severity: ErrorSeverity.WARNING,
        },
      ],
      customScriptResults: [
        {
          scriptId: 'logic_checker',
          passed: false,
          messages: ['Invalid logical structure'],
        },
      ],
    };

    // Successful validation
    const successfulValidation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      customScriptResults: [
        {
          scriptId: 'logic_checker',
          passed: true,
          messages: ['All checks passed'],
        },
      ],
    };

    expect(failedValidation.isValid).toBe(false);
    expect(failedValidation.errors).toHaveLength(1);
    expect(failedValidation.customScriptResults?.[0]?.passed).toBe(false);

    expect(successfulValidation.isValid).toBe(true);
    expect(successfulValidation.errors).toHaveLength(0);
    expect(successfulValidation.customScriptResults?.[0]?.passed).toBe(true);
  });
});

describe('Utility Functions Coverage', () => {
  describe('isOperationMetadata', () => {
    it('should return true for valid operation metadata', () => {
      const validMetadata = {
        operationId: 'op_123',
        timestamp: '2023-01-01T00:00:00.000Z',
        userId: 'user_456',
        correlationId: 'corr_789',
        source: 'user' as const,
      };
      expect(isOperationMetadata(validMetadata)).toBe(true);
    });

    it('should return false for invalid operation metadata', () => {
      expect(isOperationMetadata(null)).toBe(false);
      expect(isOperationMetadata(undefined)).toBe(false);
      expect(isOperationMetadata({})).toBe(false);
      expect(isOperationMetadata({ operationId: '' })).toBe(false);
      expect(isOperationMetadata({ operationId: 'op_123' })).toBe(false); // missing timestamp
      expect(isOperationMetadata({ operationId: 'op_123', timestamp: 'invalid-date' })).toBe(false);
      expect(
        isOperationMetadata({
          operationId: 'op_123',
          timestamp: '2023-01-01T00:00:00.000Z',
          source: 'invalid',
        }),
      ).toBe(false);
    });

    it('should handle optional fields correctly', () => {
      const minimal = {
        operationId: 'op_123',
        timestamp: '2023-01-01T00:00:00.000Z',
      };
      expect(isOperationMetadata(minimal)).toBe(true);

      const withOptionals = {
        ...minimal,
        userId: 'user_456',
        correlationId: 'corr_789',
        source: 'system' as const,
      };
      expect(isOperationMetadata(withOptionals)).toBe(true);
    });
  });

  describe('isCommandResult', () => {
    it('should return true for valid command results', () => {
      expect(isCommandResult({ success: true })).toBe(true);
      expect(isCommandResult({ success: false, error: { code: 'ERR', message: 'Error' } })).toBe(
        true,
      );
      expect(isCommandResult({ success: true, data: { id: '123' }, events: [] })).toBe(true);
    });

    it('should return false for invalid command results', () => {
      expect(isCommandResult(null)).toBe(false);
      expect(isCommandResult({})).toBe(false);
      expect(isCommandResult({ success: 'true' })).toBe(false);
      expect(isCommandResult({ success: true, error: { code: 'ERR' } })).toBe(false); // invalid error
      expect(isCommandResult({ success: true, events: 'not-array' })).toBe(false);
    });
  });

  describe('isQueryResult', () => {
    it('should return true for valid query results', () => {
      expect(isQueryResult({ success: true })).toBe(true);
      expect(isQueryResult({ success: false, error: { code: 'ERR', message: 'Error' } })).toBe(
        true,
      );
      expect(isQueryResult({ success: true, data: { items: [] } })).toBe(true);
    });

    it('should return false for invalid query results', () => {
      expect(isQueryResult(null)).toBe(false);
      expect(isQueryResult({})).toBe(false);
      expect(isQueryResult({ success: 'true' })).toBe(false);
      expect(isQueryResult({ success: true, error: { code: 'ERR' } })).toBe(false); // invalid error
    });
  });

  describe('isErrorDTO', () => {
    it('should return true for valid error DTOs', () => {
      expect(isErrorDTO({ code: 'ERR_001', message: 'Error message' })).toBe(true);
      expect(
        isErrorDTO({ code: 'ERR_001', message: 'Error message', details: { extra: 'info' } }),
      ).toBe(true);
    });

    it('should return false for invalid error DTOs', () => {
      expect(isErrorDTO(null)).toBe(false);
      expect(isErrorDTO({})).toBe(false);
      expect(isErrorDTO({ code: 'ERR_001' })).toBe(false); // missing message
      expect(isErrorDTO({ message: 'Error message' })).toBe(false); // missing code
      expect(isErrorDTO({ code: '', message: 'Error message' })).toBe(false); // empty code
      expect(isErrorDTO({ code: 'ERR_001', message: '' })).toBe(false); // empty message
    });
  });

  describe('isEventDTO', () => {
    it('should return true for valid event DTOs', () => {
      const validEvent = {
        type: 'STATEMENT_CREATED',
        payload: { statementId: '123' },
        timestamp: '2023-01-01T00:00:00.000Z',
      };
      expect(isEventDTO(validEvent)).toBe(true);
    });

    it('should return false for invalid event DTOs', () => {
      expect(isEventDTO(null)).toBe(false);
      expect(isEventDTO({})).toBe(false);
      expect(isEventDTO({ type: '', payload: {}, timestamp: '2023-01-01T00:00:00.000Z' })).toBe(
        false,
      );
      expect(
        isEventDTO({ type: 'EVENT', payload: null, timestamp: '2023-01-01T00:00:00.000Z' }),
      ).toBe(false);
      expect(isEventDTO({ type: 'EVENT', payload: {}, timestamp: 'invalid-date' })).toBe(false);
    });
  });

  describe('isValidationResult', () => {
    it('should return true for valid validation results', () => {
      const validResult = {
        isValid: true,
        errors: [],
        warnings: [],
        customScriptResults: [{ scriptId: 'script1', passed: true, messages: ['OK'] }],
      };
      expect(isValidationResult(validResult)).toBe(true);
    });

    it('should return false for invalid validation results', () => {
      expect(isValidationResult(null)).toBe(false);
      expect(isValidationResult({})).toBe(false);
      expect(isValidationResult({ isValid: 'true' })).toBe(false);
      expect(isValidationResult({ isValid: true, errors: 'not-array' })).toBe(false);
      expect(isValidationResult({ isValid: true, errors: [], warnings: 'not-array' })).toBe(false);
    });
  });

  describe('isBootstrapResult', () => {
    it('should return true for valid bootstrap results', () => {
      const validResult = {
        success: true,
        phase: 'empty' as const,
        nextSteps: ['Create first argument'],
        createdEntities: {
          argumentId: 'arg_123',
          statementIds: ['stmt_1', 'stmt_2'],
        },
      };
      expect(isBootstrapResult(validResult)).toBe(true);
    });

    it('should return false for invalid bootstrap results', () => {
      expect(isBootstrapResult(null)).toBe(false);
      expect(isBootstrapResult({})).toBe(false);
      expect(isBootstrapResult({ success: 'true' })).toBe(false);
      expect(isBootstrapResult({ success: true, phase: 'invalid' })).toBe(false);
      expect(isBootstrapResult({ success: true, phase: 'empty', nextSteps: 'not-array' })).toBe(
        false,
      );
    });
  });

  describe('createOperationMetadata', () => {
    it('should create valid operation metadata', () => {
      const metadata = createOperationMetadata('op_123');
      expect(metadata.operationId).toBe('op_123');
      expect(metadata.timestamp).toBeDefined();
      expect(new Date(metadata.timestamp)).toBeInstanceOf(Date);
    });

    it('should include optional parameters', () => {
      const metadata = createOperationMetadata('op_123', {
        userId: 'user_456',
        correlationId: 'corr_789',
        source: 'system',
      });
      expect(metadata.userId).toBe('user_456');
      expect(metadata.correlationId).toBe('corr_789');
      expect(metadata.source).toBe('system');
    });

    it('should throw error for invalid operation ID', () => {
      expect(() => createOperationMetadata('')).toThrow('Operation ID is required');
      expect(() => createOperationMetadata('   ')).toThrow('Operation ID is required');
    });

    it('should trim whitespace from operation ID', () => {
      const metadata = createOperationMetadata('  op_123  ');
      expect(metadata.operationId).toBe('op_123');
    });
  });

  describe('createSuccessResult', () => {
    it('should create success result without data', () => {
      const result = createSuccessResult();
      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.events).toBeUndefined();
    });

    it('should create success result with data', () => {
      const data = { id: '123', name: 'Test' };
      const result = createSuccessResult(data);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should create success result with events', () => {
      const events = [{ type: 'TEST', payload: {}, timestamp: new Date().toISOString() }];
      const result = createSuccessResult(undefined, events);
      expect(result.success).toBe(true);
      expect(result.events).toEqual(events);
    });

    it('should not include empty events array', () => {
      const result = createSuccessResult(undefined, []);
      expect(result.events).toBeUndefined();
    });
  });

  describe('createErrorResult', () => {
    it('should create error result', () => {
      const result = createErrorResult('ERR_001', 'Something went wrong');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ERR_001');
      expect(result.error?.message).toBe('Something went wrong');
    });

    it('should create error result with details', () => {
      const details = { field: 'value' };
      const result = createErrorResult('ERR_001', 'Something went wrong', details);
      expect(result.error?.details).toEqual(details);
    });

    it('should throw error for missing parameters', () => {
      expect(() => createErrorResult('', 'message')).toThrow('Error code and message are required');
      expect(() => createErrorResult('code', '')).toThrow('Error code and message are required');
    });
  });

  describe('createEvent', () => {
    it('should create valid event', () => {
      const payload = { id: '123' };
      const event = createEvent('TEST_EVENT', payload);
      expect(event.type).toBe('TEST_EVENT');
      expect(event.payload).toEqual(payload);
      expect(event.timestamp).toBeDefined();
      expect(new Date(event.timestamp)).toBeInstanceOf(Date);
    });

    it('should trim whitespace from event type', () => {
      const event = createEvent('  TEST_EVENT  ', {});
      expect(event.type).toBe('TEST_EVENT');
    });

    it('should throw error for invalid event type', () => {
      expect(() => createEvent('', {})).toThrow('Event type is required');
      expect(() => createEvent('   ', {})).toThrow('Event type is required');
    });
  });

  describe('mergeValidationResults', () => {
    it('should return valid result for empty input', () => {
      const result = mergeValidationResults();
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should merge multiple validation results', () => {
      const result1: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [
          {
            code: ErrorCode.create('WARN1').unwrapOr(null)!,
            message: ErrorMessage.create('Warning 1').unwrapOr(null)!,
            severity: ErrorSeverity.WARNING,
          },
        ],
      };
      const result2: ValidationResult = {
        isValid: false,
        errors: [
          {
            code: ErrorCode.create('ERR1').unwrapOr(null)!,
            message: ErrorMessage.create('Error 1').unwrapOr(null)!,
            severity: ErrorSeverity.ERROR,
          },
        ],
        warnings: [],
      };

      const merged = mergeValidationResults(result1, result2);
      expect(merged.isValid).toBe(false); // Any false makes overall false
      expect(merged.errors).toHaveLength(1);
      expect(merged.warnings).toHaveLength(1);
    });

    it('should merge custom script results', () => {
      const result1: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        customScriptResults: [{ scriptId: 'script1', passed: true, messages: ['OK'] }],
      };
      const result2: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        customScriptResults: [{ scriptId: 'script2', passed: false, messages: ['Failed'] }],
      };

      const merged = mergeValidationResults(result1, result2);
      expect(merged.customScriptResults).toHaveLength(2);
      expect(merged.customScriptResults?.[0]?.scriptId).toBe('script1');
      expect(merged.customScriptResults?.[1]?.scriptId).toBe('script2');
    });
  });

  describe('hasValidationErrors', () => {
    it('should return false for valid results', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };
      expect(hasValidationErrors(result)).toBe(false);
    });

    it('should return true for results with errors', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: [
          {
            code: ErrorCode.create('ERR1').unwrapOr(null)!,
            message: ErrorMessage.create('Error').unwrapOr(null)!,
            severity: ErrorSeverity.ERROR,
          },
        ],
        warnings: [],
      };
      expect(hasValidationErrors(result)).toBe(true);
    });

    it('should return true for results with failed custom scripts', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        customScriptResults: [{ scriptId: 'script1', passed: false, messages: ['Failed'] }],
      };
      expect(hasValidationErrors(result)).toBe(true);
    });
  });

  describe('getBootstrapNextSteps', () => {
    it('should return correct steps for each phase', () => {
      expect(getBootstrapNextSteps('empty')).toContain('Create your first atomic argument');
      expect(getBootstrapNextSteps('first_argument')).toContain(
        'Add statements to populate your argument',
      );
      expect(getBootstrapNextSteps('populating')).toContain(
        'Connect arguments to build reasoning chains',
      );
      expect(getBootstrapNextSteps('complete')).toContain('Continue building your proof tree');
    });

    it('should handle unknown phase', () => {
      // @ts-expect-error - Testing invalid input
      const steps = getBootstrapNextSteps('unknown');
      expect(steps).toContain('Unknown phase - check system state');
    });

    it('should return comprehensive next steps for each phase', () => {
      // Test that each phase returns the expected number and types of steps
      const emptySteps = getBootstrapNextSteps('empty');
      expect(emptySteps).toHaveLength(2);
      expect(emptySteps).toEqual([
        'Create your first atomic argument',
        'Add premises and conclusion statements',
      ]);

      const firstArgSteps = getBootstrapNextSteps('first_argument');
      expect(firstArgSteps).toHaveLength(2);
      expect(firstArgSteps).toEqual([
        'Add statements to populate your argument',
        'Create premise and conclusion statements',
      ]);

      const populatingSteps = getBootstrapNextSteps('populating');
      expect(populatingSteps).toHaveLength(2);
      expect(populatingSteps).toEqual([
        'Connect arguments to build reasoning chains',
        'Add validation rules',
      ]);

      const completeSteps = getBootstrapNextSteps('complete');
      expect(completeSteps).toHaveLength(3);
      expect(completeSteps).toEqual([
        'Continue building your proof tree',
        'Add custom validation scripts',
        'Export your work',
      ]);
    });
  });

  describe('Additional coverage for edge cases and error conditions', () => {
    describe('createOperationMetadata edge cases', () => {
      it('should handle whitespace-only operation ID', () => {
        expect(() => createOperationMetadata('   ')).toThrow('Operation ID is required');
        expect(() => createOperationMetadata('\t\n')).toThrow('Operation ID is required');
      });

      it('should handle all source types', () => {
        const userMeta = createOperationMetadata('op-1', { source: 'user' });
        expect(userMeta.source).toBe('user');

        const systemMeta = createOperationMetadata('op-2', { source: 'system' });
        expect(systemMeta.source).toBe('system');

        const importMeta = createOperationMetadata('op-3', { source: 'import' });
        expect(importMeta.source).toBe('import');
      });

      it('should generate valid timestamps', () => {
        const before = Date.now();
        const metadata = createOperationMetadata('op-time-test');
        const after = Date.now();

        const timestamp = new Date(metadata.timestamp).getTime();
        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
      });
    });

    describe('createErrorResult edge cases', () => {
      it('should handle empty string parameters', () => {
        expect(() => createErrorResult('', 'message')).toThrow(
          'Error code and message are required',
        );
        expect(() => createErrorResult('code', '')).toThrow('Error code and message are required');
      });

      it('should handle complex details objects', () => {
        const complexDetails = {
          errors: ['error1', 'error2'],
          metadata: { timestamp: Date.now(), source: 'validation' },
          nested: { deep: { value: 'test' } },
        };

        const result = createErrorResult('COMPLEX_ERROR', 'Complex error occurred', complexDetails);
        expect(result.error?.details).toEqual(complexDetails);
      });
    });

    describe('createEvent edge cases', () => {
      it('should handle whitespace-only event type', () => {
        expect(() => createEvent('   ', {})).toThrow('Event type is required');
        expect(() => createEvent('\t\n', {})).toThrow('Event type is required');
      });

      it('should trim event type correctly', () => {
        const event = createEvent('  EVENT_TYPE  ', { data: 'test' });
        expect(event.type).toBe('EVENT_TYPE');
      });

      it('should handle complex payload objects', () => {
        const complexPayload = {
          user: { id: 'user-123', name: 'John Doe' },
          actions: ['create', 'update', 'delete'],
          metadata: { version: 1, timestamp: Date.now() },
          flags: { enabled: true, beta: false },
        };

        const event = createEvent('COMPLEX_EVENT', complexPayload);
        expect(event.payload).toEqual(complexPayload);
      });
    });

    describe('mergeValidationResults edge cases', () => {
      it('should handle results with undefined custom script results', () => {
        const result1: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
        };

        const result2: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          customScriptResults: [{ scriptId: 'test', passed: true, messages: ['OK'] }],
        };

        const merged = mergeValidationResults(result1, result2);
        expect(merged.isValid).toBe(true);
        expect(merged.customScriptResults).toHaveLength(1);
      });

      it('should handle mixed validation states correctly', () => {
        const validResult: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [
            {
              code: ErrorCode.create('WARN1').unwrapOr(null)!,
              message: ErrorMessage.create('Warning').unwrapOr(null)!,
              severity: ErrorSeverity.WARNING,
            },
          ],
        };

        const invalidResult: ValidationResult = {
          isValid: false,
          errors: [
            {
              code: ErrorCode.create('ERR1').unwrapOr(null)!,
              message: ErrorMessage.create('Error').unwrapOr(null)!,
              severity: ErrorSeverity.ERROR,
            },
          ],
          warnings: [],
        };

        const merged = mergeValidationResults(validResult, invalidResult);
        expect(merged.isValid).toBe(false); // Any false makes overall false
        expect(merged.errors).toHaveLength(1);
        expect(merged.warnings).toHaveLength(1);
      });

      it('should preserve all custom script results', () => {
        const result1: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          customScriptResults: [
            { scriptId: 'script1', passed: true, messages: ['Pass1'] },
            { scriptId: 'script2', passed: false, messages: ['Fail1'] },
          ],
        };

        const result2: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          customScriptResults: [{ scriptId: 'script3', passed: true, messages: ['Pass2'] }],
        };

        const merged = mergeValidationResults(result1, result2);
        expect(merged.customScriptResults).toHaveLength(3);
        expect(merged.customScriptResults?.[0]?.scriptId).toBe('script1');
        expect(merged.customScriptResults?.[1]?.scriptId).toBe('script2');
        expect(merged.customScriptResults?.[2]?.scriptId).toBe('script3');
      });
    });

    describe('hasValidationErrors comprehensive scenarios', () => {
      it('should return false when no errors or failed scripts exist', () => {
        const cleanResult: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [
            {
              code: ErrorCode.create('WARN').unwrapOr(null)!,
              message: ErrorMessage.create('Warning').unwrapOr(null)!,
              severity: ErrorSeverity.WARNING,
            },
          ], // Warnings don't count as errors
          customScriptResults: [
            { scriptId: 'script1', passed: true, messages: ['OK'] },
            { scriptId: 'script2', passed: true, messages: ['OK'] },
          ],
        };

        expect(hasValidationErrors(cleanResult)).toBe(false);
      });

      it('should return true when errors array has items', () => {
        const resultWithErrors: ValidationResult = {
          isValid: false,
          errors: [
            {
              code: ErrorCode.create('ERR').unwrapOr(null)!,
              message: ErrorMessage.create('Error').unwrapOr(null)!,
              severity: ErrorSeverity.ERROR,
            },
          ],
          warnings: [],
          customScriptResults: [{ scriptId: 'script1', passed: true, messages: ['OK'] }],
        };

        expect(hasValidationErrors(resultWithErrors)).toBe(true);
      });

      it('should return true when any custom script fails', () => {
        const resultWithFailedScript: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          customScriptResults: [
            { scriptId: 'script1', passed: true, messages: ['OK'] },
            { scriptId: 'script2', passed: false, messages: ['Failed'] }, // This fails
            { scriptId: 'script3', passed: true, messages: ['OK'] },
          ],
        };

        expect(hasValidationErrors(resultWithFailedScript)).toBe(true);
      });

      it('should handle undefined custom script results gracefully', () => {
        const resultWithoutScripts: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
        };

        expect(hasValidationErrors(resultWithoutScripts)).toBe(false);
      });

      it('should handle empty custom script results array', () => {
        const resultWithEmptyScripts: ValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          customScriptResults: [],
        };

        expect(hasValidationErrors(resultWithEmptyScripts)).toBe(false);
      });
    });

    describe('Type guard validation edge cases', () => {
      describe('isOperationMetadata edge cases', () => {
        it('should handle invalid timestamp formats', () => {
          const invalidTimestamp = {
            operationId: 'op-123',
            timestamp: 'not-a-valid-date',
          };
          expect(isOperationMetadata(invalidTimestamp)).toBe(false);
        });

        it('should handle timestamp as number (invalid)', () => {
          const numericTimestamp = {
            operationId: 'op-123',
            timestamp: 1234567890,
          };
          expect(isOperationMetadata(numericTimestamp)).toBe(false);
        });

        it('should handle invalid source values', () => {
          const invalidSource = {
            operationId: 'op-123',
            timestamp: new Date().toISOString(),
            source: 'invalid-source',
          };
          expect(isOperationMetadata(invalidSource)).toBe(false);
        });

        it('should handle non-string optional fields', () => {
          const invalidUserId = {
            operationId: 'op-123',
            timestamp: new Date().toISOString(),
            userId: 123, // Should be string
          };
          expect(isOperationMetadata(invalidUserId)).toBe(false);

          const invalidCorrelationId = {
            operationId: 'op-123',
            timestamp: new Date().toISOString(),
            correlationId: { id: 'test' }, // Should be string
          };
          expect(isOperationMetadata(invalidCorrelationId)).toBe(false);
        });
      });

      describe('isCommandResult edge cases', () => {
        it('should handle invalid error structures', () => {
          const invalidError1 = {
            success: false,
            error: { code: 'ERR' }, // Missing message
          };
          expect(isCommandResult(invalidError1)).toBe(false);

          const invalidError2 = {
            success: false,
            error: { message: 'Error' }, // Missing code
          };
          expect(isCommandResult(invalidError2)).toBe(false);

          const invalidError3 = {
            success: false,
            error: { code: '', message: 'Error' }, // Empty code
          };
          expect(isCommandResult(invalidError3)).toBe(false);
        });

        it('should handle invalid events arrays', () => {
          const invalidEvents1 = {
            success: true,
            events: [{ type: 'EVENT', payload: {}, timestamp: 'invalid-date' }],
          };
          expect(isCommandResult(invalidEvents1)).toBe(false);

          const invalidEvents2 = {
            success: true,
            events: [{ type: '', payload: {}, timestamp: new Date().toISOString() }], // Empty type
          };
          expect(isCommandResult(invalidEvents2)).toBe(false);
        });
      });

      describe('isValidationResult edge cases', () => {
        it('should handle invalid custom script result structures', () => {
          const invalidScriptResult1 = {
            isValid: true,
            errors: [],
            warnings: [],
            customScriptResults: [
              { scriptId: 'test', passed: true }, // Missing messages
            ],
          };
          expect(isValidationResult(invalidScriptResult1)).toBe(false);

          const invalidScriptResult2 = {
            isValid: true,
            errors: [],
            warnings: [],
            customScriptResults: [
              { scriptId: 'test', messages: ['OK'] }, // Missing passed
            ],
          };
          expect(isValidationResult(invalidScriptResult2)).toBe(false);

          const invalidScriptResult3 = {
            isValid: true,
            errors: [],
            warnings: [],
            customScriptResults: [
              { passed: true, messages: ['OK'] }, // Missing scriptId
            ],
          };
          expect(isValidationResult(invalidScriptResult3)).toBe(false);
        });

        it('should handle invalid messages array in custom script results', () => {
          const invalidMessages = {
            isValid: true,
            errors: [],
            warnings: [],
            customScriptResults: [
              { scriptId: 'test', passed: true, messages: ['valid', 123] }, // Non-string message
            ],
          };
          expect(isValidationResult(invalidMessages)).toBe(false);
        });
      });

      describe('isBootstrapResult edge cases', () => {
        it('should handle invalid createdEntities structures', () => {
          const invalidArgumentId = {
            success: true,
            phase: 'complete' as const,
            nextSteps: ['Continue'],
            createdEntities: {
              argumentId: 123, // Should be string
            },
          };
          expect(isBootstrapResult(invalidArgumentId)).toBe(false);

          const invalidStatementIds = {
            success: true,
            phase: 'complete' as const,
            nextSteps: ['Continue'],
            createdEntities: {
              statementIds: ['valid', 123], // Non-string in array
            },
          };
          expect(isBootstrapResult(invalidStatementIds)).toBe(false);

          const invalidOrderedSetIds = {
            success: true,
            phase: 'complete' as const,
            nextSteps: ['Continue'],
            createdEntities: {
              orderedSetIds: 'not-an-array', // Should be array
            },
          };
          // Note: orderedSetIds is no longer part of BootstrapResult in Statement-level paradigm
          // This test is preserved for backwards compatibility but the expectation is now true
          expect(isBootstrapResult(invalidOrderedSetIds)).toBe(true);
        });

        it('should handle invalid nextSteps arrays', () => {
          const invalidNextSteps1 = {
            success: true,
            phase: 'empty' as const,
            nextSteps: ['valid', 123], // Non-string in array
          };
          expect(isBootstrapResult(invalidNextSteps1)).toBe(false);

          const invalidNextSteps2 = {
            success: true,
            phase: 'empty' as const,
            nextSteps: 'not-an-array', // Should be array
          };
          expect(isBootstrapResult(invalidNextSteps2)).toBe(false);
        });
      });
    });
  });
});
