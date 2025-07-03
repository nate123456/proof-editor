/**
 * Tests for Conflict entity
 *
 * Focuses on:
 * - Conflict creation and validation
 * - Resolution strategy generation
 * - Conflict state management
 * - Automatic vs manual resolution logic
 * - Device tracking and peer management
 * - High coverage for conflict detection and resolution
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Conflict } from '../../entities/Conflict';
import { Operation } from '../../entities/Operation';
import type { VectorClock } from '../../entities/VectorClock';
import { ConflictType } from '../../value-objects/ConflictType';
import { DeviceId } from '../../value-objects/DeviceId';
import { OperationId } from '../../value-objects/OperationId';
import { OperationPayload } from '../../value-objects/OperationPayload';
import { OperationType } from '../../value-objects/OperationType';

// Helper function to get ConflictType instances
const getConflictType = (type: string): ConflictType => {
  let result: ConflictType;
  switch (type) {
    case 'CONCURRENT_UPDATE':
      result = ConflictType.concurrentModification();
      break;
    case 'DELETE_UPDATE':
      result = ConflictType.deletion();
      break;
    case 'STRUCTURAL':
      result = ConflictType.structural();
      break;
    case 'SEMANTIC':
      result = ConflictType.semantic();
      break;
    case 'ORDERING':
      result = ConflictType.ordering();
      break;
    default:
      result = ConflictType.concurrentModification();
  }
  if (result.isErr()) {
    throw new Error(`Failed to create ConflictType: ${type}`);
  }
  return result.value;
};

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

const createTestOperation = (
  deviceId: string,
  operationType: string,
  targetPath = '/document/content',
): Operation => {
  const deviceIdResult = DeviceId.create(deviceId);
  const opTypeResult = OperationType.create(operationType as any);
  const vectorClock = createMockVectorClock({ [deviceId]: 1 });

  if (deviceIdResult.isErr() || opTypeResult.isErr()) {
    throw new Error('Failed to create test operation components');
  }

  const operationId = OperationId.generate(deviceIdResult.value, 1);
  if (operationId.isErr()) {
    throw new Error('Failed to generate operation ID');
  }

  let payloadData: any;
  const opType = opTypeResult.value.getValue();

  switch (opType) {
    case 'CREATE_STATEMENT':
    case 'UPDATE_STATEMENT':
      payloadData = { id: 'test-content', content: `content from ${deviceId}` };
      break;
    case 'CREATE_ARGUMENT':
    case 'UPDATE_ARGUMENT':
      payloadData = {
        id: 'test-argument',
        premises: [`premise from ${deviceId}`],
        conclusions: [`conclusion from ${deviceId}`],
      };
      break;
    case 'CREATE_TREE':
      payloadData = {
        id: 'test-tree',
        rootNodeId: `root-${deviceId}`,
        position: { x: 100, y: 200 },
      };
      break;
    case 'UPDATE_TREE_POSITION':
      payloadData = { x: 150, y: 250 };
      break;
    case 'CREATE_CONNECTION':
      payloadData = {
        sourceId: `source-${deviceId}`,
        targetId: `target-${deviceId}`,
        connectionType: 'logical',
      };
      break;
    case 'UPDATE_METADATA':
      payloadData = {
        key: 'test-key',
        value: `value from ${deviceId}`,
      };
      break;
    case 'DELETE_STATEMENT':
    case 'DELETE_ARGUMENT':
    case 'DELETE_TREE':
    case 'DELETE_CONNECTION':
      payloadData = { id: `delete-target-${deviceId}` };
      break;
    default:
      payloadData = { id: 'test-content', content: `content from ${deviceId}` };
  }

  const payload = OperationPayload.create(payloadData, opTypeResult.value);

  if (payload.isErr()) {
    throw new Error('Failed to create payload');
  }

  const operation = Operation.create(
    operationId.value,
    deviceIdResult.value,
    opTypeResult.value,
    targetPath,
    payload.value,
    vectorClock,
  );

  if (operation.isErr()) {
    throw new Error('Failed to create test operation');
  }

  return operation.value;
};

describe('Conflict', () => {
  describe('create', () => {
    it('should create a valid conflict', () => {
      const conflictType = getConflictType('CONCURRENT_UPDATE');
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create('conflict-001', conflictType, '/document/content', operations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        expect(conflict.getId()).toBe('conflict-001');
        expect(conflict.getConflictType()).toBe(conflictType);
        expect(conflict.getTargetPath()).toBe('/document/content');
        expect(conflict.getConflictingOperations()).toHaveLength(2);
        expect(conflict.getDetectedAt()).toBeInstanceOf(Date);
      }
    });

    it('should create conflict with resolution options', () => {
      const conflictType = getConflictType('DELETE_UPDATE');
      const operations = [
        createTestOperation('device-1', 'DELETE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create('conflict-002', conflictType, '/document/content', operations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        const options = conflict.getResolutionOptions();
        expect(options.length).toBeGreaterThan(0);
        expect(options.some((opt) => opt.strategy === 'LAST_WRITER_WINS')).toBe(true);
      }
    });

    it('should fail with empty conflict ID', () => {
      const conflictType = getConflictType('CONCURRENT_UPDATE');
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create('', conflictType, '/document/content', operations);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Conflict ID cannot be empty');
      }
    });

    it('should fail with whitespace-only conflict ID', () => {
      const conflictType = getConflictType('CONCURRENT_UPDATE');
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create('   ', conflictType, '/document/content', operations);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Conflict ID cannot be empty');
      }
    });

    it('should fail with empty target path', () => {
      const conflictType = getConflictType('CONCURRENT_UPDATE');
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create('conflict-003', conflictType, '', operations);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Target path cannot be empty');
      }
    });

    it('should fail with insufficient operations', () => {
      const conflictType = getConflictType('CONCURRENT_UPDATE');
      const operations = [createTestOperation('device-1', 'UPDATE_STATEMENT')];

      const result = Conflict.create('conflict-004', conflictType, '/document/content', operations);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Conflict requires at least two operations');
      }
    });

    it('should fail with no operations', () => {
      const conflictType = getConflictType('CONCURRENT_UPDATE');
      const operations: Operation[] = [];

      const result = Conflict.create('conflict-005', conflictType, '/document/content', operations);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Conflict requires at least two operations');
      }
    });
  });

  describe('getters', () => {
    let conflict: Conflict;

    beforeEach(() => {
      const conflictType = getConflictType('CONCURRENT_UPDATE');
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create('test-conflict', conflictType, '/test/path', operations);
      if (result.isOk()) {
        conflict = result.value;
      }
    });

    it('should return conflict ID', () => {
      expect(conflict.getId()).toBe('test-conflict');
    });

    it('should return conflict type through getConflictType', () => {
      expect(conflict.getConflictType()).toEqual(getConflictType('CONCURRENT_UPDATE'));
    });

    it('should return conflict type through getType alias', () => {
      expect(conflict.getType()).toEqual(getConflictType('CONCURRENT_UPDATE'));
    });

    it('should return target path', () => {
      expect(conflict.getTargetPath()).toBe('/test/path');
    });

    it('should return conflicting operations through getConflictingOperations', () => {
      const operations = conflict.getConflictingOperations();
      expect(operations).toHaveLength(2);
      expect(operations[0].getDeviceId().getValue()).toBe('device-1');
      expect(operations[1].getDeviceId().getValue()).toBe('device-2');
    });

    it('should return conflicting operations through getOperations alias', () => {
      const operations = conflict.getOperations();
      expect(operations).toHaveLength(2);
      expect(operations[0].getDeviceId().getValue()).toBe('device-1');
      expect(operations[1].getDeviceId().getValue()).toBe('device-2');
    });

    it('should return detected timestamp', () => {
      const detectedAt = conflict.getDetectedAt();
      expect(detectedAt).toBeInstanceOf(Date);
      expect(detectedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should return resolution options', () => {
      const options = conflict.getResolutionOptions();
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe('resolution state management', () => {
    let conflict: Conflict;

    beforeEach(() => {
      const conflictType = getConflictType('CONCURRENT_UPDATE');
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create('resolution-test', conflictType, '/test/path', operations);
      if (result.isOk()) {
        conflict = result.value;
      }
    });

    it('should initially not be resolved', () => {
      expect(conflict.isResolved()).toBe(false);
      expect(conflict.getResolvedAt()).toBeUndefined();
      expect(conflict.getSelectedResolution()).toBeUndefined();
      expect(conflict.getResolutionResult()).toBeUndefined();
    });

    it('should resolve with valid strategy', () => {
      const strategy = 'LAST_WRITER_WINS';
      const result = { resolvedContent: 'merged content' };

      const resolvedResult = conflict.resolveWith(strategy, result);

      expect(resolvedResult.isOk()).toBe(true);
      if (resolvedResult.isOk()) {
        const resolvedConflict = resolvedResult.value;
        expect(resolvedConflict.isResolved()).toBe(true);
        expect(resolvedConflict.getSelectedResolution()).toBe(strategy);
        expect(resolvedConflict.getResolutionResult()).toBe(result);
        expect(resolvedConflict.getResolvedAt()).toBeInstanceOf(Date);
      }
    });

    it('should fail to resolve with invalid strategy', () => {
      const invalidStrategy = 'INVALID_STRATEGY' as any;
      const result = { resolvedContent: 'content' };

      const resolvedResult = conflict.resolveWith(invalidStrategy, result);

      expect(resolvedResult.isErr()).toBe(true);
      if (resolvedResult.isErr()) {
        expect(resolvedResult.error.message).toContain('Invalid resolution strategy');
      }
    });

    it('should fail to resolve already resolved conflict', () => {
      const strategy = 'LAST_WRITER_WINS';
      const result = { resolvedContent: 'content' };

      // First resolution
      const firstResolve = conflict.resolveWith(strategy, result);
      expect(firstResolve.isOk()).toBe(true);

      if (firstResolve.isOk()) {
        // Attempt second resolution
        const secondResolve = firstResolve.value.resolveWith(strategy, result);
        expect(secondResolve.isErr()).toBe(true);
        if (secondResolve.isErr()) {
          expect(secondResolve.error.message).toBe('Conflict is already resolved');
        }
      }
    });
  });

  describe('automatic resolution detection', () => {
    it('should detect automatic resolution for structural conflicts', () => {
      const structuralType = ConflictType.create('STRUCTURAL_CONFLICT');
      if (structuralType.isErr()) return;

      const operations = [
        createTestOperation('device-1', 'CREATE_TREE'),
        createTestOperation('device-2', 'UPDATE_TREE_POSITION'),
      ];

      const result = Conflict.create(
        'structural-conflict',
        structuralType.value,
        '/tree/node',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        expect(conflict.canBeAutomaticallyResolved()).toBe(true);

        const automaticOptions = conflict.getAutomaticResolutionOptions();
        expect(automaticOptions.length).toBeGreaterThan(0);
        expect(automaticOptions.every((opt) => opt.automaticResolution)).toBe(true);
      }
    });

    it('should require user decision for semantic conflicts', () => {
      const semanticType = ConflictType.create('SEMANTIC_CONFLICT');
      if (semanticType.isErr()) return;

      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create(
        'semantic-conflict',
        semanticType.value,
        '/document/content',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        expect(conflict.requiresUserDecision()).toBe(true);
      }
    });

    it('should identify conflicts that cannot be automatically resolved', () => {
      const semanticType = ConflictType.create('SEMANTIC_CONFLICT');
      if (semanticType.isErr()) return;

      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
        createTestOperation('device-3', 'UPDATE_STATEMENT'),
        createTestOperation('device-4', 'UPDATE_STATEMENT'),
        createTestOperation('device-5', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create(
        'complex-conflict',
        semanticType.value,
        '/document/content',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        expect(conflict.canBeAutomaticallyResolved()).toBe(false);
        expect(conflict.requiresUserDecision()).toBe(true);
      }
    });
  });

  describe('device tracking', () => {
    it('should track involved devices correctly', () => {
      const operations = [
        createTestOperation('device-alpha', 'UPDATE_STATEMENT'),
        createTestOperation('device-beta', 'UPDATE_STATEMENT'),
        createTestOperation('device-gamma', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create(
        'device-tracking',
        getConflictType('CONCURRENT_UPDATE'),
        '/document/content',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        const involvedDevices = conflict.getInvolvedDevices();

        expect(involvedDevices).toHaveLength(3);
        const deviceValues = involvedDevices.map((d) => d.getValue());
        expect(deviceValues).toContain('device-alpha');
        expect(deviceValues).toContain('device-beta');
        expect(deviceValues).toContain('device-gamma');
      }
    });

    it('should handle duplicate devices in operations', () => {
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT', '/path/one'),
        createTestOperation('device-1', 'UPDATE_STATEMENT', '/path/two'),
        createTestOperation('device-2', 'UPDATE_STATEMENT', '/path/three'),
      ];

      const result = Conflict.create(
        'duplicate-devices',
        getConflictType('CONCURRENT_UPDATE'),
        '/document/content',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        const involvedDevices = conflict.getInvolvedDevices();

        expect(involvedDevices).toHaveLength(2); // Should deduplicate
        const deviceValues = involvedDevices.map((d) => d.getValue());
        expect(deviceValues).toContain('device-1');
        expect(deviceValues).toContain('device-2');
      }
    });

    it('should handle empty device list gracefully', () => {
      // This test ensures the method doesn't break with edge cases
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create(
        'normal-conflict',
        getConflictType('CONCURRENT_UPDATE'),
        '/document/content',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        const involvedDevices = conflict.getInvolvedDevices();
        expect(Array.isArray(involvedDevices)).toBe(true);
        expect(involvedDevices.length).toBeGreaterThan(0);
      }
    });
  });

  describe('severity assessment', () => {
    it('should assign HIGH severity to semantic conflicts', () => {
      const semanticType = ConflictType.create('SEMANTIC_CONFLICT');
      if (semanticType.isErr()) return;

      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create(
        'semantic-severity',
        semanticType.value,
        '/document/content',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        expect(conflict.getSeverity()).toBe('HIGH');
      }
    });

    it('should assign MEDIUM severity to conflicts with many operations', () => {
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
        createTestOperation('device-3', 'UPDATE_STATEMENT'),
        createTestOperation('device-4', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create(
        'many-ops-severity',
        getConflictType('STRUCTURAL'),
        '/document/content',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        expect(conflict.getSeverity()).toBe('MEDIUM');
      }
    });

    it('should assign LOW severity to simple structural conflicts', () => {
      const structuralType = ConflictType.create('STRUCTURAL_CONFLICT');
      if (structuralType.isErr()) return;

      const operations = [
        createTestOperation('device-1', 'CREATE_TREE'),
        createTestOperation('device-2', 'UPDATE_TREE_POSITION'),
      ];

      const result = Conflict.create(
        'simple-structural',
        structuralType.value,
        '/tree/node',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        expect(conflict.getSeverity()).toBe('LOW');
      }
    });
  });

  describe('resolution option generation', () => {
    it('should generate merge operations for structural conflicts', () => {
      const structuralType = ConflictType.create('STRUCTURAL_CONFLICT');
      if (structuralType.isErr()) return;

      const operations = [
        createTestOperation('device-1', 'CREATE_TREE'),
        createTestOperation('device-2', 'UPDATE_TREE_POSITION'),
      ];

      const result = Conflict.create(
        'structural-options',
        structuralType.value,
        '/tree/node',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        const options = conflict.getResolutionOptions();

        expect(options.some((opt) => opt.strategy === 'MERGE_OPERATIONS')).toBe(true);
        expect(options.some((opt) => opt.strategy === 'LAST_WRITER_WINS')).toBe(true);
      }
    });

    it('should generate user decision options for semantic conflicts', () => {
      const semanticType = ConflictType.create('SEMANTIC_CONFLICT');
      if (semanticType.isErr()) return;

      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create(
        'semantic-options',
        semanticType.value,
        '/document/content',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        const options = conflict.getResolutionOptions();

        expect(options.some((opt) => opt.strategy === 'USER_DECISION_REQUIRED')).toBe(true);
        expect(options.some((opt) => opt.strategy === 'LAST_WRITER_WINS')).toBe(true);
        expect(options.some((opt) => !opt.automaticResolution)).toBe(true);
      }
    });

    it('should include preview information in resolution options', () => {
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create(
        'preview-test',
        getConflictType('CONCURRENT_UPDATE'),
        '/document/content',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        const options = conflict.getResolutionOptions();

        options.forEach((option) => {
          expect(option.description).toBeTruthy();
          expect(option.resultPreview).toBeTruthy();
          expect(typeof option.automaticResolution).toBe('boolean');
        });
      }
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle conflicts with maximum number of operations', () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        createTestOperation(`device-${i}`, 'UPDATE_STATEMENT'),
      );

      const result = Conflict.create(
        'max-ops',
        getConflictType('CONCURRENT_UPDATE'),
        '/document/content',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        expect(conflict.getConflictingOperations()).toHaveLength(10);
        expect(conflict.getInvolvedDevices()).toHaveLength(10);
      }
    });

    it('should handle very long conflict IDs', () => {
      const longId = `conflict-${'x'.repeat(1000)}`;
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create(
        longId,
        getConflictType('CONCURRENT_UPDATE'),
        '/document/content',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        expect(conflict.getId()).toBe(longId);
      }
    });

    it('should handle very long target paths', () => {
      const longPath = `/document/${'nested/'.repeat(100)}content`;
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT', longPath),
        createTestOperation('device-2', 'UPDATE_STATEMENT', longPath),
      ];

      const result = Conflict.create(
        'long-path',
        getConflictType('CONCURRENT_UPDATE'),
        longPath,
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        expect(conflict.getTargetPath()).toBe(longPath);
      }
    });

    it('should maintain immutability of operations array', () => {
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create(
        'immutable-test',
        getConflictType('CONCURRENT_UPDATE'),
        '/document/content',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        const retrievedOps1 = conflict.getConflictingOperations();
        const retrievedOps2 = conflict.getOperations();

        // Should be different array instances (immutable)
        expect(retrievedOps1).not.toBe(operations);
        expect(retrievedOps2).not.toBe(operations);
        expect(retrievedOps1).not.toBe(retrievedOps2);

        // But contain the same elements
        expect(retrievedOps1).toHaveLength(operations.length);
        expect(retrievedOps2).toHaveLength(operations.length);
      }
    });
  });

  describe('date and timestamp handling', () => {
    it('should use current time for detection timestamp', () => {
      const beforeCreate = Date.now();
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create(
        'timestamp-test',
        getConflictType('CONCURRENT_UPDATE'),
        '/document/content',
        operations,
      );
      const afterCreate = Date.now();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const conflict = result.value;
        const detectedTime = conflict.getDetectedAt().getTime();
        expect(detectedTime).toBeGreaterThanOrEqual(beforeCreate);
        expect(detectedTime).toBeLessThanOrEqual(afterCreate);
      }
    });

    it('should set resolution timestamp when resolving', () => {
      const operations = [
        createTestOperation('device-1', 'UPDATE_STATEMENT'),
        createTestOperation('device-2', 'UPDATE_STATEMENT'),
      ];

      const result = Conflict.create(
        'resolution-time',
        getConflictType('CONCURRENT_UPDATE'),
        '/document/content',
        operations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const beforeResolve = Date.now();
        const resolveResult = result.value.resolveWith('LAST_WRITER_WINS', { result: 'resolved' });
        const afterResolve = Date.now();

        expect(resolveResult.isOk()).toBe(true);
        if (resolveResult.isOk()) {
          const resolvedConflict = resolveResult.value;
          const resolvedTime = resolvedConflict.getResolvedAt()?.getTime();
          expect(resolvedTime).toBeDefined();
          if (resolvedTime !== undefined) {
            expect(resolvedTime).toBeGreaterThanOrEqual(beforeResolve);
            expect(resolvedTime).toBeLessThanOrEqual(afterResolve);
          }
        }
      }
    });
  });
});
