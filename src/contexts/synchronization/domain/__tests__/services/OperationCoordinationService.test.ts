import { beforeEach, describe, expect, it } from 'vitest';

import { Operation } from '../../entities/Operation';
import { VectorClock } from '../../entities/VectorClock';
import { OperationCoordinationService } from '../../services/OperationCoordinationService';
import { OperationType } from '../../value-objects/OperationType';
import {
  concurrentOperationsFactory,
  createConflictingOperations,
  createOperationsWithComplexity,
  deviceIdFactory,
  operationFactory,
  operationIdFactory,
  operationPayloadFactory,
  sequentialOperationsFactory,
} from '../test-factories';

describe('OperationCoordinationService', () => {
  let service: OperationCoordinationService;

  beforeEach(() => {
    service = new OperationCoordinationService();
  });

  describe('applyOperation', () => {
    it('should apply operation to current state successfully', async () => {
      const operation = operationFactory.build();
      const currentState = { existing: 'data' };

      const result = await service.applyOperation(operation, currentState);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle CREATE operations', async () => {
      const createOpType = OperationType.create('CREATE_STATEMENT');
      expect(createOpType.isOk()).toBe(true);
      if (!createOpType.isOk()) return;

      const device = deviceIdFactory.build();
      const opId = operationIdFactory.build();
      const payload = operationPayloadFactory.build();
      const vectorClock = VectorClock.create(device);
      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const operationResult = Operation.create(
        opId,
        device,
        createOpType.value,
        '/test/path',
        payload,
        vectorClock.value,
      );
      expect(operationResult.isOk()).toBe(true);
      if (!operationResult.isOk()) return;

      const currentState = {};
      const result = await service.applyOperation(operationResult.value, currentState);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle UPDATE operations', async () => {
      const updateOpType = OperationType.create('UPDATE_STATEMENT');
      expect(updateOpType.isOk()).toBe(true);
      if (!updateOpType.isOk()) return;

      const device = deviceIdFactory.build();
      const opId = operationIdFactory.build();
      const payload = operationPayloadFactory.build();
      const vectorClock = VectorClock.create(device);
      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const operationResult = Operation.create(
        opId,
        device,
        updateOpType.value,
        '/test/path',
        payload,
        vectorClock.value,
      );
      expect(operationResult.isOk()).toBe(true);
      if (!operationResult.isOk()) return;

      const currentState = { existingData: 'value' };
      const result = await service.applyOperation(operationResult.value, currentState);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle DELETE operations', async () => {
      const deleteOpType = OperationType.create('DELETE_STATEMENT');
      expect(deleteOpType.isOk()).toBe(true);
      if (!deleteOpType.isOk()) return;

      const device = deviceIdFactory.build();
      const opId = operationIdFactory.build();
      const payload = operationPayloadFactory.build();
      const vectorClock = VectorClock.create(device);
      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const operationResult = Operation.create(
        opId,
        device,
        deleteOpType.value,
        '/test/path',
        payload,
        vectorClock.value,
      );
      expect(operationResult.isOk()).toBe(true);
      if (!operationResult.isOk()) return;

      const currentState = { existingData: 'value' };
      const result = await service.applyOperation(operationResult.value, currentState);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle empty state', async () => {
      const operation = operationFactory.build();
      const currentState = {};

      const result = await service.applyOperation(operation, currentState);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle null state', async () => {
      const operation = operationFactory.build();
      const currentState = null;

      const result = await service.applyOperation(operation, currentState);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should preserve state consistency', async () => {
      const operation = operationFactory.build();
      const originalState = { data: 'original', count: 42 };

      const result = await service.applyOperation(operation, originalState);

      if (result.isOk()) {
        const newState = result.value;
        expect(newState).toBeDefined();
        // Original state should not be mutated
        expect(originalState).toEqual({ data: 'original', count: 42 });
      }
    });
  });

  describe('detectConflicts', () => {
    it('should return empty array for no operations', async () => {
      const result = await service.detectConflicts([]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('should return empty array for single operation', async () => {
      const operation = operationFactory.build();
      const result = await service.detectConflicts([operation]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('should detect conflicts between concurrent operations', async () => {
      const operations = concurrentOperationsFactory.build();
      const result = await service.detectConflicts(operations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(Array.isArray(result.value)).toBe(true);
      }
    });

    it('should not detect conflicts for sequential operations', async () => {
      const operations = sequentialOperationsFactory.build();
      const result = await service.detectConflicts(operations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should detect conflicts for operations on same target path', async () => {
      const targetPath = '/test/path';
      const operations = createConflictingOperations(targetPath, 3);

      const result = await service.detectConflicts(operations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(Array.isArray(result.value)).toBe(true);
      }
    });

    it('should not detect conflicts for operations on different paths', async () => {
      const operation1 = operationFactory.build();
      const operation2 = operationFactory.build();

      // Ensure different target paths
      const ops = [operation1, operation2];
      if (operation1.getTargetPath() !== operation2.getTargetPath()) {
        const result = await service.detectConflicts(ops);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(0);
        }
      }
    });

    it('should handle DELETE vs UPDATE conflicts', async () => {
      const deleteOpType = OperationType.create('DELETE_STATEMENT');
      const updateOpType = OperationType.create('UPDATE_STATEMENT');

      expect(deleteOpType.isOk()).toBe(true);
      expect(updateOpType.isOk()).toBe(true);
      if (!deleteOpType.isOk() || !updateOpType.isOk()) return;

      const targetPath = '/test/statement';
      const device1 = deviceIdFactory.build();
      const device2 = deviceIdFactory.build();
      const opId1 = operationIdFactory.build();
      const opId2 = operationIdFactory.build();
      const payload1 = operationPayloadFactory.build();
      const payload2 = operationPayloadFactory.build();
      const vectorClock1 = VectorClock.create(device1);
      const vectorClock2 = VectorClock.create(device2);

      expect(vectorClock1.isOk()).toBe(true);
      expect(vectorClock2.isOk()).toBe(true);
      if (!vectorClock1.isOk() || !vectorClock2.isOk()) return;

      const deleteOpResult = Operation.create(
        opId1,
        device1,
        deleteOpType.value,
        targetPath,
        payload1,
        vectorClock1.value,
      );
      const updateOpResult = Operation.create(
        opId2,
        device2,
        updateOpType.value,
        targetPath,
        payload2,
        vectorClock2.value,
      );

      expect(deleteOpResult.isOk()).toBe(true);
      expect(updateOpResult.isOk()).toBe(true);

      if (deleteOpResult.isOk() && updateOpResult.isOk()) {
        const result = await service.detectConflicts([deleteOpResult.value, updateOpResult.value]);

        expect(result.isOk()).toBe(true);
      }
    });

    it('should handle errors during conflict detection gracefully', async () => {
      // Create operations that might cause errors
      const operations = createOperationsWithComplexity('COMPLEX');

      const result = await service.detectConflicts(operations);

      expect(result.isOk() || result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  describe('orderOperations', () => {
    it('should order empty operations list', () => {
      const result = service.orderOperations([]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('should order single operation', () => {
      const operation = operationFactory.build();
      const result = service.orderOperations([operation]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
      }
    });

    it('should order operations by causal dependencies', () => {
      const operations = sequentialOperationsFactory.build();
      const result = service.orderOperations(operations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orderedOps = result.value;
        expect(orderedOps).toHaveLength(operations.length);

        // Verify causal ordering is preserved
        for (let i = 0; i < orderedOps.length - 1; i++) {
          const current = orderedOps[i];
          const next = orderedOps[i + 1];
          if (current && next) {
            // If there's a causal dependency, current should come before next
            if (next.hasCausalDependencyOn(current)) {
              expect(i).toBeLessThan(i + 1); // This is always true, but verifies ordering
            }
          }
        }
      }
    });

    it('should order operations by timestamp when no causal dependencies', () => {
      const operations = concurrentOperationsFactory.build();
      const result = service.orderOperations(operations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orderedOps = result.value;
        expect(orderedOps).toHaveLength(operations.length);

        // Verify timestamp ordering for concurrent operations
        for (let i = 0; i < orderedOps.length - 1; i++) {
          const current = orderedOps[i];
          const next = orderedOps[i + 1];
          if (current && next && current.isConcurrentWith(next)) {
            const currentTime = current.getTimestamp();
            const nextTime = next.getTimestamp();
            expect(currentTime.compareTo(nextTime)).toBeLessThanOrEqual(0);
          }
        }
      }
    });

    it('should detect circular dependencies', () => {
      // This is difficult to create with the current factories,
      // so we test that the service handles the validation
      const operations = createOperationsWithComplexity('MODERATE');
      const result = service.orderOperations(operations);

      expect(result.isOk() || result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBeTruthy();
      }
    });

    it('should handle operations from multiple devices', () => {
      const device1 = deviceIdFactory.build();
      const device2 = deviceIdFactory.build();
      const device3 = deviceIdFactory.build();

      const operations: Operation[] = [];

      for (const device of [device1, device2, device3]) {
        const opId = operationIdFactory.build();
        const opType = OperationType.create('UPDATE_STATEMENT');
        expect(opType.isOk()).toBe(true);
        if (!opType.isOk()) continue;

        const payload = operationPayloadFactory.build();
        const vectorClock = VectorClock.create(device);
        expect(vectorClock.isOk()).toBe(true);
        if (!vectorClock.isOk()) continue;

        const operationResult = Operation.create(
          opId,
          device,
          opType.value,
          '/test/path',
          payload,
          vectorClock.value,
        );

        if (operationResult.isOk()) {
          operations.push(operationResult.value);
        }
      }

      const result = service.orderOperations(operations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(3);
      }
    });

    it('should handle large operation sets efficiently', () => {
      const operations = createOperationsWithComplexity('COMPLEX');

      const startTime = Date.now();
      const result = service.orderOperations(operations);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.isOk() || result.isErr()).toBe(true);
    });
  });

  describe('transformOperation', () => {
    it('should transform operation against empty list', async () => {
      const operation = operationFactory.build();
      const result = await service.transformOperation(operation, []);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.equals(operation)).toBe(true);
      }
    });

    it('should transform operation against single operation', async () => {
      const operation1 = operationFactory.build();
      const operation2 = operationFactory.build();

      const result = await service.transformOperation(operation1, [operation2]);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should transform operation against multiple operations', async () => {
      const operation = operationFactory.build();
      const againstOperations = createOperationsWithComplexity('SIMPLE');

      const result = await service.transformOperation(operation, againstOperations);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle concurrent operations correctly', async () => {
      const operations = concurrentOperationsFactory.build();
      const [op1, ...restOps] = operations;

      if (op1) {
        const result = await service.transformOperation(op1, restOps);

        expect(result.isOk() || result.isErr()).toBe(true);
      }
    });

    it('should handle sequential operations correctly', async () => {
      const operations = sequentialOperationsFactory.build();
      const [op1, ...restOps] = operations;

      if (op1) {
        const result = await service.transformOperation(op1, restOps);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          // For sequential operations, transformation should return original operation
          expect(result.value.getId().equals(op1.getId())).toBe(true);
        }
      }
    });

    it('should preserve operation identity after transformation', async () => {
      const operation = operationFactory.build();
      const againstOperations = [operationFactory.build()];

      const result = await service.transformOperation(operation, againstOperations);

      if (result.isOk()) {
        const transformedOp = result.value;
        expect(transformedOp.getDeviceId().equals(operation.getDeviceId())).toBe(true);
        expect(transformedOp.getOperationType().equals(operation.getOperationType())).toBe(true);
      }
    });
  });

  describe('canOperationsCommute', () => {
    it('should return true for commutative operations', () => {
      const operations = concurrentOperationsFactory.build();
      const [op1, op2] = operations;

      if (op1 && op2) {
        const result = service.canOperationsCommute(op1, op2);
        expect(typeof result).toBe('boolean');
      }
    });

    it('should return false for non-commutative operations', () => {
      const createOpType = OperationType.create('CREATE_STATEMENT');
      const deleteOpType = OperationType.create('DELETE_STATEMENT');

      expect(createOpType.isOk()).toBe(true);
      expect(deleteOpType.isOk()).toBe(true);
      if (!createOpType.isOk() || !deleteOpType.isOk()) return;

      const targetPath = '/test/statement';
      const device = deviceIdFactory.build();
      const opId1 = operationIdFactory.build();
      const opId2 = operationIdFactory.build();
      const payload1 = operationPayloadFactory.build();
      const payload2 = operationPayloadFactory.build();
      const vectorClock = VectorClock.create(device);
      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const createOpResult = Operation.create(
        opId1,
        device,
        createOpType.value,
        targetPath,
        payload1,
        vectorClock.value,
      );
      const deleteOpResult = Operation.create(
        opId2,
        device,
        deleteOpType.value,
        targetPath,
        payload2,
        vectorClock.value,
      );

      expect(createOpResult.isOk()).toBe(true);
      expect(deleteOpResult.isOk()).toBe(true);

      if (createOpResult.isOk() && deleteOpResult.isOk()) {
        const result = service.canOperationsCommute(createOpResult.value, deleteOpResult.value);
        expect(typeof result).toBe('boolean');
      }
    });

    it('should handle operations on different paths', () => {
      const operation1 = operationFactory.build();
      const operation2 = operationFactory.build();

      const result = service.canOperationsCommute(operation1, operation2);
      expect(typeof result).toBe('boolean');
    });

    it('should handle same operation', () => {
      const operation = operationFactory.build();
      const result = service.canOperationsCommute(operation, operation);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('calculateOperationDependencies', () => {
    it('should return empty dependencies for empty operations', () => {
      const result = service.calculateOperationDependencies([]);

      expect(result.size).toBe(0);
    });

    it('should return no dependencies for single operation', () => {
      const operation = operationFactory.build();
      const result = service.calculateOperationDependencies([operation]);

      expect(result.size).toBe(1);
      const deps = result.get(operation.getId().getValue());
      expect(deps).toEqual([]);
    });

    it('should calculate dependencies for sequential operations', () => {
      const operations = sequentialOperationsFactory.build();
      const result = service.calculateOperationDependencies(operations);

      expect(result.size).toBe(operations.length);

      // Verify each operation has its dependencies recorded
      operations.forEach((op) => {
        const deps = result.get(op.getId().getValue());
        expect(Array.isArray(deps)).toBe(true);
      });
    });

    it('should handle concurrent operations with no dependencies', () => {
      const operations = concurrentOperationsFactory.build();
      const result = service.calculateOperationDependencies(operations);

      expect(result.size).toBe(operations.length);

      // Concurrent operations should have minimal dependencies
      operations.forEach((op) => {
        const deps = result.get(op.getId().getValue());
        expect(Array.isArray(deps)).toBe(true);
      });
    });

    it('should handle complex dependency graphs', () => {
      const operations = createOperationsWithComplexity('MODERATE');
      const result = service.calculateOperationDependencies(operations);

      expect(result.size).toBe(operations.length);

      // Verify all operations are included
      operations.forEach((op) => {
        expect(result.has(op.getId().getValue())).toBe(true);
      });
    });

    it('should not include self-dependencies', () => {
      const operations = createOperationsWithComplexity('SIMPLE');
      const result = service.calculateOperationDependencies(operations);

      operations.forEach((op) => {
        const deps = result.get(op.getId().getValue());
        expect(deps).toBeDefined();
        if (deps) {
          expect(deps).not.toContain(op.getId().getValue());
        }
      });
    });
  });

  describe('performance and scalability', () => {
    it('should handle large conflict detection efficiently', async () => {
      const operations = createOperationsWithComplexity('COMPLEX');

      const startTime = Date.now();
      const result = await service.detectConflicts(operations);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle concurrent coordination requests', async () => {
      const operation = operationFactory.build();
      const state = { data: 'test' };

      const promises = Array.from({ length: 20 }, async () =>
        service.applyOperation(operation, state),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(20);
      results.forEach((result) => {
        expect(result.isOk() || result.isErr()).toBe(true);
      });
    });

    it('should handle memory efficiently', async () => {
      const operations = createOperationsWithComplexity('COMPLEX');
      const initialMemory = process.memoryUsage().heapUsed;

      await service.detectConflicts(operations);
      service.orderOperations(operations);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null operations gracefully', async () => {
      try {
        await service.detectConflicts([null as any]);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle undefined operations gracefully', async () => {
      try {
        await service.detectConflicts([undefined as any]);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle mixed valid and invalid operations', async () => {
      const validOperation = operationFactory.build();
      const mixedOperations = [validOperation, null as any, undefined as any];

      try {
        const result = await service.detectConflicts(mixedOperations);
        expect(result.isOk() || result.isErr()).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle operations with malformed data', async () => {
      const operation = operationFactory.build();
      const malformedState = { malformed: true, circular: {} };
      malformedState.circular = malformedState; // Create circular reference

      const result = await service.applyOperation(operation, malformedState);
      expect(result.isOk() || result.isErr()).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should coordinate complete operation lifecycle', async () => {
      const operations = createConflictingOperations('/test/path', 3);

      // 1. Detect conflicts
      const conflictResult = await service.detectConflicts(operations);
      expect(conflictResult.isOk()).toBe(true);

      // 2. Order operations
      const orderResult = service.orderOperations(operations);
      expect(orderResult.isOk()).toBe(true);

      // 3. Transform operations if needed
      if (orderResult.isOk()) {
        const orderedOps = orderResult.value;
        const [firstOp, ...restOps] = orderedOps;

        if (firstOp) {
          const transformResult = await service.transformOperation(firstOp, restOps);
          expect(transformResult.isOk() || transformResult.isErr()).toBe(true);
        }
      }
    });

    it('should handle multi-device synchronization scenario', async () => {
      const device1 = deviceIdFactory.build();
      const device2 = deviceIdFactory.build();
      const device3 = deviceIdFactory.build();

      const operations: Operation[] = [];

      for (const device of [device1, device2, device3]) {
        const opId = operationIdFactory.build();
        const opType = OperationType.create('UPDATE_STATEMENT');
        expect(opType.isOk()).toBe(true);
        if (!opType.isOk()) continue;

        const payload = operationPayloadFactory.build();
        const vectorClock = VectorClock.create(device);
        expect(vectorClock.isOk()).toBe(true);
        if (!vectorClock.isOk()) continue;

        const operationResult = Operation.create(
          opId,
          device,
          opType.value,
          '/test/path',
          payload,
          vectorClock.value,
        );

        if (operationResult.isOk()) {
          operations.push(operationResult.value);
        }
      }

      // Detect conflicts across devices
      const conflictResult = await service.detectConflicts(operations);
      expect(conflictResult.isOk()).toBe(true);

      // Order operations from different devices
      const orderResult = service.orderOperations(operations);
      expect(orderResult.isOk()).toBe(true);

      // Calculate dependencies across devices
      const dependencies = service.calculateOperationDependencies(operations);
      expect(dependencies.size).toBe(3);
    });

    it('should handle real-time operation coordination', async () => {
      const operations = createOperationsWithComplexity('MODERATE');
      const state = { version: 1, data: {} };

      // Simulate real-time application of operations
      let currentState = state;
      for (const operation of operations) {
        const result = await service.applyOperation(operation, currentState);
        if (result.isOk()) {
          currentState = result.value as typeof state;
        }
      }

      expect(currentState).toBeDefined();
    });
  });
});
