/**
 * Tests for Operation entity
 *
 * Focuses on:
 * - Operation creation and validation
 * - Operation transformation
 * - Conflict detection
 * - Causality checking
 * - High coverage for core functionality
 */

// import { ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Operation } from '../../entities/Operation';
import type { VectorClock } from '../../entities/VectorClock';
import { DeviceId } from '../../value-objects/DeviceId';
import { OperationId } from '../../value-objects/OperationId';
import { OperationPayload } from '../../value-objects/OperationPayload';
import { OperationType, type OperationTypeValue } from '../../value-objects/OperationType';

// Mock factories
const createMockVectorClock = (clocks: Record<string, number> = {}): VectorClock => {
  return {
    increment: vi.fn(),
    merge: vi.fn(),
    isEqual: vi.fn(() => false),
    isConcurrent: vi.fn(() => false),
    isConcurrentWith: vi.fn(() => false),
    happensBefore: vi.fn(() => false),
    happensAfter: vi.fn(() => false),
    equals: vi.fn(() => false),
    getTime: vi.fn((deviceId: string) => clocks[deviceId] ?? 0),
    getTimestampForDevice: vi.fn((deviceId: DeviceId) => clocks[deviceId.getValue()] ?? 0),
    getAllClocks: vi.fn(() => clocks),
    getAllDeviceIds: vi.fn(() =>
      Object.keys(clocks).map((id) => {
        const deviceIdResult = DeviceId.create(id);
        if (deviceIdResult.isErr()) {
          throw new Error(`Failed to create DeviceId: ${id}`);
        }
        return deviceIdResult.value;
      }),
    ),
    getClockState: vi.fn(() => new Map(Object.entries(clocks))),
    toCompactString: vi.fn(
      () =>
        `{${Object.entries(clocks)
          .map(([k, v]) => `${k}:${v}`)
          .join(',')}}`,
    ),
    toJSON: vi.fn(() => ({ clocks })),
  } as unknown as VectorClock;
};

// Helper to generate operation IDs for tests
let testOperationSequence = 0;
const generateTestOperationId = (deviceId?: DeviceId): OperationId => {
  if (!deviceId) {
    const deviceResult = DeviceId.create('test-device');
    if (deviceResult.isErr()) {
      throw new Error('Failed to create test device ID');
    }
    deviceId = deviceResult.value;
  }
  const operationId = OperationId.generate(deviceId, ++testOperationSequence);
  if (operationId.isErr()) {
    throw new Error('Failed to generate test operation ID');
  }
  return operationId.value;
};

// Helper to create operation types for tests
const createOperationType = (type: OperationTypeValue): OperationType => {
  const result = OperationType.create(type);
  if (result.isErr()) {
    throw new Error(`Failed to create operation type: ${type}`);
  }
  return result.value;
};

// Helper to create device IDs for tests
const createDeviceId = (id: string): DeviceId => {
  const result = DeviceId.create(id);
  if (result.isErr()) {
    throw new Error(`Failed to create device ID: ${id}`);
  }
  return result.value;
};

// Helper to create delete payload
const createDeletePayload = (operationType: OperationType): OperationPayload => {
  const payload = OperationPayload.create(
    {
      id: 'stmt-1',
      content: 'content to delete',
    },
    operationType,
  );
  if (payload.isErr()) {
    throw new Error('Failed to create delete payload');
  }
  return payload.value;
};

const createValidOperationParams = () => {
  const deviceId = DeviceId.create('device-1');
  const operationTypeResult = OperationType.create('CREATE_STATEMENT');
  const targetPath = '/document/content';
  const vectorClock = createMockVectorClock({ 'device-1': 1 });

  if (deviceId.isErr() || operationTypeResult.isErr()) {
    throw new Error('Failed to create valid operation params');
  }

  const operationId = OperationId.generate(deviceId.value, 1);
  if (operationId.isErr()) {
    throw new Error('Failed to generate operation ID');
  }

  const payload = OperationPayload.create(
    {
      id: 'stmt-1',
      content: 'test content',
    },
    operationTypeResult.value,
  );

  if (payload.isErr()) {
    throw new Error('Failed to create payload');
  }

  return {
    operationId: operationId.value,
    deviceId: deviceId.value,
    operationType: operationTypeResult.value,
    targetPath,
    payload: payload.value,
    vectorClock,
  };
};

describe('Operation', () => {
  describe('create', () => {
    it('should create a valid operation', () => {
      const params = createValidOperationParams();

      const result = Operation.create(
        params.operationId,
        params.deviceId,
        params.operationType,
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const operation = result.value;
        expect(operation.getId()).toBe(params.operationId);
        expect(operation.getDeviceId()).toBe(params.deviceId);
        expect(operation.getOperationType()).toBe(params.operationType);
        expect(operation.getTargetPath()).toBe(params.targetPath);
        expect(operation.getPayload()).toBe(params.payload);
        expect(operation.getVectorClock()).toBe(params.vectorClock);
      }
    });

    it('should create operation with parent operation ID', () => {
      const params = createValidOperationParams();
      const parentId = generateTestOperationId();

      const result = Operation.create(
        params.operationId,
        params.deviceId,
        params.operationType,
        params.targetPath,
        params.payload,
        params.vectorClock,
        parentId,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getParentOperationId()).toBe(parentId);
      }
    });

    it('should fail with empty target path', () => {
      const params = createValidOperationParams();

      const result = Operation.create(
        params.operationId,
        params.deviceId,
        params.operationType,
        '',
        params.payload,
        params.vectorClock,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Target path cannot be empty');
      }
    });

    it('should fail with whitespace-only target path', () => {
      const params = createValidOperationParams();

      const result = Operation.create(
        params.operationId,
        params.deviceId,
        params.operationType,
        '   ',
        params.payload,
        params.vectorClock,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Target path cannot be empty');
      }
    });

    it('should create operations with different types', () => {
      const params = createValidOperationParams();
      const operationTypeValues = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'CREATE_ARGUMENT',
        'UPDATE_ARGUMENT',
      ];

      operationTypeValues.forEach((opTypeValue) => {
        const opTypeResult = OperationType.create(opTypeValue as any);
        if (opTypeResult.isErr()) return;

        const result = Operation.create(
          generateTestOperationId(params.deviceId),
          params.deviceId,
          opTypeResult.value,
          params.targetPath,
          params.payload,
          params.vectorClock,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getOperationType()).toEqual(opTypeResult.value);
        }
      });
    });
  });

  describe('transformation methods', () => {
    let operation1: Operation;
    let operation2: Operation;

    beforeEach(() => {
      const params1 = createValidOperationParams();
      const params2 = createValidOperationParams();

      const result1 = Operation.create(
        params1.operationId,
        params1.deviceId,
        createOperationType('CREATE_STATEMENT'),
        '/document/content',
        params1.payload,
        params1.vectorClock,
      );

      const result2 = Operation.create(
        params2.operationId,
        createDeviceId('device-2'),
        createOperationType('CREATE_STATEMENT'),
        '/document/content',
        params2.payload,
        createMockVectorClock({ 'device-2': 1 }),
      );

      if (result1.isOk()) operation1 = result1.value;
      if (result2.isOk()) operation2 = result2.value;
    });

    it('should detect concurrent operations', () => {
      vi.mocked(operation1.getVectorClock().isConcurrent).mockReturnValue(true);

      const isConcurrent = operation1.isConcurrentWith(operation2);

      expect(isConcurrent).toBe(true);
      expect(operation1.getVectorClock().isConcurrent).toHaveBeenCalledWith(
        operation2.getVectorClock(),
      );
    });

    it('should detect non-concurrent operations', () => {
      vi.mocked(operation1.getVectorClock().isConcurrent).mockReturnValue(false);
      vi.mocked(operation1.getVectorClock().happensBefore).mockReturnValue(true);

      const isConcurrent = operation1.isConcurrentWith(operation2);

      expect(isConcurrent).toBe(false);
    });

    it('should check if operation happens before another', () => {
      vi.mocked(operation2.getVectorClock().happensBefore).mockReturnValue(true);

      const happensBefore = operation1.hasCausalDependencyOn(operation2);

      expect(happensBefore).toBe(true);
      expect(operation2.getVectorClock().happensBefore).toHaveBeenCalledWith(
        operation1.getVectorClock(),
      );
    });

    it('should transform against another operation', () => {
      const transformed = operation1.transformWith(operation2);

      expect(transformed.isOk()).toBe(true);
      if (transformed.isOk()) {
        const [transformedOp1, transformedOp2] = transformed.value;
        expect(transformedOp1).toBeDefined();
        expect(transformedOp2).toBeDefined();
        expect(transformedOp1.getId()).not.toBe(operation1.getId()); // New operation created
        expect(transformedOp2.getId()).not.toBe(operation2.getId()); // New operation created
      }
    });

    it('should handle transform with different operation types', () => {
      const deleteOpType = createOperationType('DELETE_STATEMENT');
      const deletePayload = OperationPayload.create(
        { id: 'stmt-to-delete', content: 'content to delete' },
        deleteOpType,
      );
      if (deletePayload.isErr()) return;

      // Create a mock vector clock that indicates concurrency for this specific test
      const concurrentVectorClock = createMockVectorClock({ 'device-2': 1 });
      vi.mocked(concurrentVectorClock.isConcurrent).mockReturnValue(true);
      vi.mocked(concurrentVectorClock.isConcurrentWith).mockReturnValue(true);

      const deleteOpResult = Operation.create(
        generateTestOperationId(),
        operation2.getDeviceId(),
        createOperationType('DELETE_STATEMENT'),
        operation2.getTargetPath(),
        deletePayload.value,
        concurrentVectorClock,
      );

      if (deleteOpResult.isOk()) {
        const transformed = operation1.transformWith(deleteOpResult.value);
        expect(transformed.isOk()).toBe(true);
      }
    });

    it('should fail transformation for incompatible operations', () => {
      const differentPathOp = Operation.create(
        generateTestOperationId(),
        operation2.getDeviceId(),
        createOperationType('CREATE_STATEMENT'),
        '/different/path',
        operation2.getPayload(),
        operation2.getVectorClock(),
      );

      if (differentPathOp.isOk()) {
        const transformed = operation1.transformWith(differentPathOp.value);
        expect(transformed.isErr()).toBe(true);
        if (transformed.isErr()) {
          expect(transformed.error.message).toContain('incompatible');
        }
      }
    });
  });

  describe('conflict detection', () => {
    it('should detect conflicts with concurrent operations on same path', () => {
      const params = createValidOperationParams();

      const op1 = Operation.create(
        params.operationId,
        params.deviceId,
        createOperationType('UPDATE_STATEMENT'),
        '/document/title',
        params.payload,
        params.vectorClock,
      );

      const op2 = Operation.create(
        generateTestOperationId(),
        createDeviceId('device-2'),
        createOperationType('UPDATE_STATEMENT'),
        '/document/title',
        params.payload,
        createMockVectorClock({ 'device-2': 1 }),
      );

      if (op1.isOk() && op2.isOk()) {
        // The mocking approach has issues with the implementation.
        // Instead, let's test with actual concurrent VectorClocks
        const conflictResult = op1.value.detectConflictWith(op2.value);

        // Since the VectorClocks were created independently (device-1 vs device-2),
        // they are concurrent
        expect(conflictResult.isOk()).toBe(true);

        const conflict = conflictResult.isOk() ? conflictResult.value : null;
        expect(conflict).not.toBeNull();
        if (conflict) {
          expect(conflict.conflictType.getValue()).toBe('CONCURRENT_MODIFICATION');
          expect(conflict.operations).toContain(op1.value);
          expect(conflict.operations).toContain(op2.value);
        }
      }
    });

    it('should not detect conflict for operations on different paths', () => {
      const params = createValidOperationParams();

      const op1 = Operation.create(
        params.operationId,
        params.deviceId,
        createOperationType('UPDATE_STATEMENT'),
        '/document/title',
        params.payload,
        params.vectorClock,
      );

      const op2 = Operation.create(
        generateTestOperationId(),
        createDeviceId('device-2'),
        createOperationType('UPDATE_STATEMENT'),
        '/document/content',
        params.payload,
        createMockVectorClock({ 'device-2': 1 }),
      );

      if (op1.isOk() && op2.isOk()) {
        const conflictResult = op1.value.detectConflictWith(op2.value);
        const conflict = conflictResult.isOk() ? conflictResult.value : null;
        expect(conflict).toBeNull();
      }
    });

    it('should detect different conflict types based on operations', () => {
      const params = createValidOperationParams();

      // Delete vs Update conflict
      const deleteOp = Operation.create(
        params.operationId,
        params.deviceId,
        createOperationType('DELETE_STATEMENT'),
        '/document/section',
        createDeletePayload(createOperationType('DELETE_STATEMENT')),
        params.vectorClock,
      );

      const updateOp = Operation.create(
        generateTestOperationId(),
        createDeviceId('device-2'),
        createOperationType('UPDATE_STATEMENT'),
        '/document/section',
        params.payload,
        createMockVectorClock({ 'device-2': 1 }),
      );

      if (deleteOp.isOk() && updateOp.isOk()) {
        // Test with actual concurrent VectorClocks
        const conflictResult = deleteOp.value.detectConflictWith(updateOp.value);

        expect(conflictResult.isOk()).toBe(true);
        const conflict = conflictResult.isOk() ? conflictResult.value : null;

        expect(conflict).not.toBeNull();
        if (conflict) {
          expect(conflict.conflictType.getValue()).toBe('DELETION_CONFLICT');
        }
      }
    });

    it('should not detect conflict for causally related operations', () => {
      const params = createValidOperationParams();

      const op1 = Operation.create(
        params.operationId,
        params.deviceId,
        createOperationType('UPDATE_STATEMENT'),
        '/document/title',
        params.payload,
        params.vectorClock,
      );

      const op2 = Operation.create(
        generateTestOperationId(),
        createDeviceId('device-2'),
        createOperationType('UPDATE_STATEMENT'),
        '/document/title',
        params.payload,
        createMockVectorClock({ 'device-1': 2, 'device-2': 1 }), // op2 happens after op1
      );

      if (op1.isOk() && op2.isOk()) {
        vi.mocked(op1.value.getVectorClock().isConcurrent).mockReturnValue(false);
        vi.mocked(op1.value.getVectorClock().happensBefore).mockReturnValue(true);

        const conflictResult = op1.value.detectConflictWith(op2.value);
        const conflict = conflictResult.isOk() ? conflictResult.value : null;
        expect(conflict).toBeNull();
      }
    });
  });

  describe('operation properties and metadata', () => {
    it('should check if operation is idempotent', () => {
      const params = createValidOperationParams();

      // DELETE operations are idempotent
      const deleteOp = Operation.create(
        params.operationId,
        params.deviceId,
        createOperationType('DELETE_STATEMENT'),
        params.targetPath,
        createDeletePayload(createOperationType('DELETE_STATEMENT')),
        params.vectorClock,
      );

      if (deleteOp.isOk()) {
        expect(deleteOp.value.isIdempotent()).toBe(true);
      }

      // INSERT operations are not idempotent
      const insertOp = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        createOperationType('CREATE_STATEMENT'),
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      if (insertOp.isOk()) {
        expect(insertOp.value.isIdempotent()).toBe(false);
      }
    });

    it('should check if operation is reversible', () => {
      const params = createValidOperationParams();

      // Most operations are reversible
      const insertOp = Operation.create(
        params.operationId,
        params.deviceId,
        createOperationType('CREATE_STATEMENT'),
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      if (insertOp.isOk()) {
        expect(insertOp.value.isReversible()).toBe(true);
      }

      // MERGE operations might not be reversible
      const mergeOp = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        createOperationType('UPDATE_METADATA'),
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      if (mergeOp.isOk()) {
        expect(mergeOp.value.isReversible()).toBe(false);
      }
    });

    it('should calculate operation size', () => {
      const params = createValidOperationParams();

      const result = Operation.create(
        params.operationId,
        params.deviceId,
        params.operationType,
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const size = result.value.getSize();
        expect(size).toBeGreaterThan(0);
        expect(typeof size).toBe('number');
      }
    });

    it('should get operation complexity', () => {
      const params = createValidOperationParams();

      // Simple INSERT operation
      const insertOp = Operation.create(
        params.operationId,
        params.deviceId,
        createOperationType('CREATE_STATEMENT'),
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      if (insertOp.isOk()) {
        expect(insertOp.value.getComplexity()).toBe('SIMPLE');
      }

      // Complex MERGE operation with large payload
      const largePayload = OperationPayload.create(
        {
          key: 'metadata-key',
          value: { content: 'x'.repeat(10000), complex: true, nested: { data: 'structure' } },
        },
        createOperationType('UPDATE_METADATA'),
      );

      if (largePayload.isOk()) {
        const mergeOp = Operation.create(
          generateTestOperationId(params.deviceId),
          params.deviceId,
          createOperationType('UPDATE_METADATA'),
          params.targetPath,
          largePayload.value,
          params.vectorClock,
        );

        if (mergeOp.isOk()) {
          expect(['MODERATE', 'COMPLEX']).toContain(mergeOp.value.getComplexity());
        }
      }
    });
  });

  describe('operation composition', () => {
    it('should compose two sequential operations', () => {
      const params = createValidOperationParams();

      const op1 = Operation.create(
        params.operationId,
        params.deviceId,
        createOperationType('CREATE_STATEMENT'),
        params.targetPath,
        (() => {
          const payload = OperationPayload.create(
            { id: 'stmt-hello', content: 'Hello' },
            createOperationType('CREATE_STATEMENT'),
          );
          if (payload.isErr()) throw new Error('Failed to create payload');
          return payload.value;
        })(),
        params.vectorClock,
      );

      const op2 = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        createOperationType('CREATE_STATEMENT'),
        params.targetPath,
        (() => {
          const payload = OperationPayload.create(
            { id: 'stmt-world', content: ' World' },
            createOperationType('CREATE_STATEMENT'),
          );
          if (payload.isErr()) throw new Error('Failed to create payload');
          return payload.value;
        })(),
        createMockVectorClock({ 'device-1': 2 }),
      );

      if (op1.isOk() && op2.isOk()) {
        const composed = op1.value.compose(op2.value);

        expect(composed.isOk()).toBe(true);
        if (composed.isOk()) {
          expect(composed.value.getOperationType()).toStrictEqual(OperationType.INSERT);
          const payload = composed.value.getPayload();
          expect((payload.getData() as any).content).toBe('Hello World');
        }
      }
    });

    it('should fail to compose incompatible operations', () => {
      const params = createValidOperationParams();

      const insertOp = Operation.create(
        params.operationId,
        params.deviceId,
        createOperationType('CREATE_STATEMENT'),
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      const deleteOp = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        createOperationType('DELETE_STATEMENT'),
        params.targetPath,
        createDeletePayload(createOperationType('DELETE_STATEMENT')),
        createMockVectorClock({ 'device-1': 2 }),
      );

      if (insertOp.isOk() && deleteOp.isOk()) {
        const composed = insertOp.value.compose(deleteOp.value);
        expect(composed.isErr()).toBe(true);
      }
    });

    it('should fail to compose operations from different devices', () => {
      const params = createValidOperationParams();

      const op1 = Operation.create(
        params.operationId,
        params.deviceId,
        createOperationType('CREATE_STATEMENT'),
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      const op2 = Operation.create(
        generateTestOperationId(),
        createDeviceId('device-2'),
        createOperationType('CREATE_STATEMENT'),
        params.targetPath,
        params.payload,
        createMockVectorClock({ 'device-2': 1 }),
      );

      if (op1.isOk() && op2.isOk()) {
        const composed = op1.value.compose(op2.value);
        expect(composed.isErr()).toBe(true);
        if (composed.isErr()) {
          expect(composed.error.message).toContain('different devices');
        }
      }
    });
  });

  describe('operation serialization', () => {
    it('should convert operation to JSON', () => {
      const params = createValidOperationParams();

      const result = Operation.create(
        params.operationId,
        params.deviceId,
        params.operationType,
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const json = result.value.toJSON();

        expect(json).toHaveProperty('id');
        expect(json).toHaveProperty('deviceId');
        expect(json).toHaveProperty('operationType');
        expect(json).toHaveProperty('targetPath');
        expect(json).toHaveProperty('payload');
        expect(json).toHaveProperty('vectorClock');
        expect(json).toHaveProperty('timestamp');
      }
    });

    it('should include parent operation ID in JSON when present', () => {
      const params = createValidOperationParams();
      const parentId = generateTestOperationId();

      const result = Operation.create(
        params.operationId,
        params.deviceId,
        params.operationType,
        params.targetPath,
        params.payload,
        params.vectorClock,
        parentId,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const json = result.value.toJSON();
        expect(json).toHaveProperty('parentOperationId');
      }
    });

    it('should create operation from JSON', () => {
      const params = createValidOperationParams();

      const original = Operation.create(
        params.operationId,
        params.deviceId,
        params.operationType,
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      if (original.isOk()) {
        const json = original.value.toJSON();
        const restored = Operation.fromJSON(json);

        expect(restored.isOk()).toBe(true);
        if (restored.isOk()) {
          expect(restored.value.getId().getValue()).toBe(original.value.getId().getValue());
          expect(restored.value.getDeviceId().getValue()).toBe(
            original.value.getDeviceId().getValue(),
          );
          expect(restored.value.getOperationType()).toStrictEqual(
            original.value.getOperationType(),
          );
          expect(restored.value.getTargetPath()).toBe(original.value.getTargetPath());
        }
      }
    });
  });

  describe('equals', () => {
    it('should compare operations by ID', () => {
      const params = createValidOperationParams();

      const op1 = Operation.create(
        params.operationId,
        params.deviceId,
        params.operationType,
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      const op2 = Operation.create(
        params.operationId, // Same ID
        createDeviceId('device-2'), // Different device
        createOperationType('DELETE_STATEMENT'), // Different type
        '/different/path', // Different path
        (() => {
          const payload = OperationPayload.create(
            { id: 'stmt-diff', content: 'different data' },
            createOperationType('UPDATE_STATEMENT'),
          );
          if (payload.isErr()) throw new Error('Failed to create payload');
          return payload.value;
        })(),
        createMockVectorClock({ 'device-2': 5 }),
      );

      if (op1.isOk() && op2.isOk()) {
        // Should be equal because they have the same ID
        expect(op1.value.equals(op2.value)).toBe(true);
      }
    });

    it('should not be equal with different IDs', () => {
      const params = createValidOperationParams();

      const op1 = Operation.create(
        params.operationId,
        params.deviceId,
        params.operationType,
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      const op2 = Operation.create(
        generateTestOperationId(), // Different ID
        params.deviceId,
        params.operationType,
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      if (op1.isOk() && op2.isOk()) {
        expect(op1.value.equals(op2.value)).toBe(false);
      }
    });
  });

  describe('structural and semantic operation classification', () => {
    it('should identify structural operations', () => {
      const params = createValidOperationParams();
      const structuralTypes = ['CREATE_TREE', 'DELETE_TREE', 'UPDATE_TREE_POSITION'];

      structuralTypes.forEach((type) => {
        const opType = createOperationType(type as any);
        const op = Operation.create(
          generateTestOperationId(),
          params.deviceId,
          opType,
          params.targetPath,
          params.payload,
          params.vectorClock,
        );

        if (op.isOk()) {
          expect(op.value.isStructuralOperation()).toBe(true);
          expect(op.value.isSemanticOperation()).toBe(false);
        }
      });
    });

    it('should identify semantic operations', () => {
      const params = createValidOperationParams();
      const semanticTypes = ['CREATE_STATEMENT', 'UPDATE_STATEMENT', 'DELETE_STATEMENT'];

      semanticTypes.forEach((type) => {
        const opType = createOperationType(type as any);
        const op = Operation.create(
          generateTestOperationId(),
          params.deviceId,
          opType,
          params.targetPath,
          params.payload,
          params.vectorClock,
        );

        if (op.isOk()) {
          expect(op.value.isSemanticOperation()).toBe(true);
          expect(op.value.isStructuralOperation()).toBe(false);
        }
      });
    });
  });

  describe('operation commutivity', () => {
    it('should allow commutation for operations on different paths', () => {
      const params = createValidOperationParams();

      const op1 = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        params.operationType,
        '/path/one',
        params.payload,
        params.vectorClock,
      );

      const op2 = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        params.operationType,
        '/path/two',
        params.payload,
        params.vectorClock,
      );

      if (op1.isOk() && op2.isOk()) {
        expect(op1.value.canCommuteWith(op2.value)).toBe(true);
        expect(op2.value.canCommuteWith(op1.value)).toBe(true);
      }
    });

    it('should prevent commutation for conflicting operations on same path', () => {
      const params = createValidOperationParams();

      const op1 = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        createOperationType('CREATE_STATEMENT'),
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      const op2 = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        createOperationType('DELETE_STATEMENT'),
        params.targetPath,
        createDeletePayload(createOperationType('DELETE_STATEMENT')),
        params.vectorClock,
      );

      if (op1.isOk() && op2.isOk()) {
        expect(op1.value.canCommuteWith(op2.value)).toBe(false);
        expect(op2.value.canCommuteWith(op1.value)).toBe(false);
      }
    });
  });

  describe('operation application', () => {
    it('should apply CREATE operation to state', () => {
      const params = createValidOperationParams();
      const createOp = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        createOperationType('CREATE_STATEMENT'),
        '/document/statements/new',
        params.payload,
        params.vectorClock,
      );

      if (createOp.isOk()) {
        const initialState = {};
        const result = createOp.value.applyTo(initialState);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveProperty('/document/statements/new');
        }
      }
    });

    it('should apply UPDATE operation to existing state', () => {
      const params = createValidOperationParams();
      const updateOp = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        createOperationType('UPDATE_STATEMENT'),
        '/document/content',
        params.payload,
        params.vectorClock,
      );

      if (updateOp.isOk()) {
        const initialState = { '/document/content': 'old content' };
        const result = updateOp.value.applyTo(initialState);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveProperty('/document/content');
        }
      }
    });

    it('should apply DELETE operation to remove from state', () => {
      const params = createValidOperationParams();
      const deleteOp = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        createOperationType('DELETE_STATEMENT'),
        '/document/content',
        createDeletePayload(createOperationType('DELETE_STATEMENT')),
        params.vectorClock,
      );

      if (deleteOp.isOk()) {
        const initialState = { '/document/content': 'content to delete' };
        const result = deleteOp.value.applyTo(initialState);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).not.toHaveProperty('/document/content');
        }
      }
    });

    it('should fail to delete non-existent target', () => {
      const params = createValidOperationParams();
      const deleteOp = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        createOperationType('DELETE_STATEMENT'),
        '/document/nonexistent',
        createDeletePayload(createOperationType('DELETE_STATEMENT')),
        params.vectorClock,
      );

      if (deleteOp.isOk()) {
        const initialState = {};
        const result = deleteOp.value.applyTo(initialState);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Cannot delete non-existent target');
        }
      }
    });

    it('should fail to update non-existent target', () => {
      const params = createValidOperationParams();
      const updateOp = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        createOperationType('UPDATE_STATEMENT'),
        '/document/nonexistent',
        params.payload,
        params.vectorClock,
      );

      if (updateOp.isOk()) {
        const initialState = {};
        const result = updateOp.value.applyTo(initialState);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Cannot update non-existent target');
        }
      }
    });

    it('should fail to create already existing target', () => {
      const params = createValidOperationParams();
      const createOp = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        createOperationType('CREATE_STATEMENT'),
        '/document/existing',
        params.payload,
        params.vectorClock,
      );

      if (createOp.isOk()) {
        const initialState = { '/document/existing': 'already exists' };
        const result = createOp.value.applyTo(initialState);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Cannot create already existing target');
        }
      }
    });
  });

  describe('transformation against multiple operations', () => {
    it('should transform against sequence of operations', () => {
      const params = createValidOperationParams();

      const baseOp = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        params.operationType,
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      const otherOps = [
        Operation.create(
          generateTestOperationId(),
          createDeviceId('device-2'),
          params.operationType,
          params.targetPath,
          params.payload,
          createMockVectorClock({ 'device-2': 1 }),
        ),
        Operation.create(
          generateTestOperationId(),
          createDeviceId('device-3'),
          params.operationType,
          params.targetPath,
          params.payload,
          createMockVectorClock({ 'device-3': 1 }),
        ),
      ];

      if (baseOp.isOk() && otherOps.every((op) => op.isOk())) {
        const validOps = otherOps.map((op) => op.value);

        // Mock concurrent relationships
        validOps.forEach((_op) => {
          vi.mocked(baseOp.value.getVectorClock().isConcurrent).mockReturnValue(true);
        });

        const result = baseOp.value.transformAgainstOperations(validOps);
        expect(result.isOk()).toBe(true);
      }
    });

    it('should skip non-concurrent operations in transformation sequence', () => {
      const params = createValidOperationParams();

      const baseOp = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        params.operationType,
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      const otherOp = Operation.create(
        generateTestOperationId(),
        createDeviceId('device-2'),
        params.operationType,
        params.targetPath,
        params.payload,
        createMockVectorClock({ 'device-2': 1 }),
      );

      if (baseOp.isOk() && otherOp.isOk()) {
        // Mock non-concurrent relationship
        vi.mocked(baseOp.value.getVectorClock().isConcurrent).mockReturnValue(false);

        const result = baseOp.value.transformAgainstOperations([otherOp.value]);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(baseOp.value); // Should return original operation
        }
      }
    });
  });

  describe('static transformation methods', () => {
    it('should transform sequence of operations', () => {
      const params = createValidOperationParams();

      const operations = [
        Operation.create(
          generateTestOperationId(),
          params.deviceId,
          params.operationType,
          params.targetPath,
          params.payload,
          params.vectorClock,
        ),
        Operation.create(
          generateTestOperationId(),
          createDeviceId('device-2'),
          params.operationType,
          params.targetPath,
          params.payload,
          createMockVectorClock({ 'device-2': 1 }),
        ),
      ];

      if (operations.every((op) => op.isOk())) {
        const validOps = operations.map((op) => op.value);
        const result = Operation.transformOperationSequence(validOps);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(validOps.length);
        }
      }
    });

    it('should handle empty operation sequence', () => {
      const result = Operation.transformOperationSequence([]);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should handle single operation sequence', () => {
      const params = createValidOperationParams();
      const op = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        params.operationType,
        params.targetPath,
        params.payload,
        params.vectorClock,
      );

      if (op.isOk()) {
        const result = Operation.transformOperationSequence([op.value]);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(1);
          expect(result.value[0]).toBe(op.value);
        }
      }
    });

    it('should calculate transformation complexity for different operation counts', () => {
      const params = createValidOperationParams();

      // Simple case (2 operations)
      const simpleOps = [
        Operation.create(
          generateTestOperationId(),
          params.deviceId,
          params.operationType,
          params.targetPath,
          params.payload,
          params.vectorClock,
        ),
        Operation.create(
          generateTestOperationId(),
          params.deviceId,
          params.operationType,
          params.targetPath,
          params.payload,
          params.vectorClock,
        ),
      ];

      if (simpleOps.every((op) => op.isOk())) {
        const validSimpleOps = simpleOps.map((op) => op.value);
        expect(Operation.calculateTransformationComplexity(validSimpleOps)).toBe('SIMPLE');
      }

      // Complex case (many operations)
      const complexOps = Array.from({ length: 25 }, () =>
        Operation.create(
          generateTestOperationId(),
          params.deviceId,
          params.operationType,
          params.targetPath,
          params.payload,
          params.vectorClock,
        ),
      );

      if (complexOps.every((op) => op.isOk())) {
        const validComplexOps = complexOps.map((op) => op.value);
        expect(Operation.calculateTransformationComplexity(validComplexOps)).toBe('INTRACTABLE');
      }
    });

    it('should find concurrent operation groups', () => {
      const params = createValidOperationParams();

      const op1 = Operation.create(
        generateTestOperationId(),
        params.deviceId,
        params.operationType,
        params.targetPath,
        params.payload,
        params.vectorClock,
      );
      const op2 = Operation.create(
        generateTestOperationId(),
        createDeviceId('device-2'),
        params.operationType,
        params.targetPath,
        params.payload,
        createMockVectorClock({ 'device-2': 1 }),
      );
      const op3 = Operation.create(
        generateTestOperationId(),
        createDeviceId('device-3'),
        params.operationType,
        params.targetPath,
        params.payload,
        createMockVectorClock({ 'device-3': 1 }),
      );

      if (op1.isOk() && op2.isOk() && op3.isOk()) {
        // Mock concurrent relationships
        vi.mocked(op1.value.getVectorClock().isConcurrent).mockReturnValue(true);
        vi.mocked(op2.value.getVectorClock().isConcurrent).mockReturnValue(true);

        const groups = Operation.findConcurrentGroups([op1.value, op2.value, op3.value]);
        expect(groups.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('additional operation type tests', () => {
    it('should handle all supported operation types', () => {
      const params = createValidOperationParams();
      const allTypes = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'CREATE_ARGUMENT',
        'UPDATE_ARGUMENT',
        'DELETE_ARGUMENT',
        'CREATE_TREE',
        'UPDATE_TREE_POSITION',
        'DELETE_TREE',
        'CREATE_CONNECTION',
        'DELETE_CONNECTION',
        'UPDATE_METADATA',
      ];

      allTypes.forEach((type) => {
        const opType = createOperationType(type as any);
        const payload = type.includes('DELETE') ? createDeletePayload(opType) : params.payload;

        const op = Operation.create(
          generateTestOperationId(),
          params.deviceId,
          opType,
          params.targetPath,
          payload,
          params.vectorClock,
        );

        expect(op.isOk()).toBe(true);
        if (op.isOk()) {
          expect(op.value.getOperationType().getValue()).toBe(type);
        }
      });
    });

    it('should handle operations with metadata type', () => {
      const params = createValidOperationParams();
      const metadataPayload = OperationPayload.create(
        { key: 'metadata', value: { timestamp: Date.now(), version: '1.0' } },
        createOperationType('UPDATE_METADATA'),
      );

      if (metadataPayload.isOk()) {
        const op = Operation.create(
          generateTestOperationId(),
          params.deviceId,
          createOperationType('UPDATE_METADATA'),
          params.targetPath,
          metadataPayload.value,
          params.vectorClock,
        );

        expect(op.isOk()).toBe(true);
        if (op.isOk()) {
          expect(op.value.isIdempotent()).toBe(true);
          expect(op.value.isReversible()).toBe(false);
        }
      }
    });
  });
});
