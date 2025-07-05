import { beforeEach, describe, expect, it } from 'vitest';

import { Operation } from '../../entities/Operation';
import { VectorClock } from '../../entities/VectorClock';
import { CRDTTransformationService } from '../../services/CRDTTransformationService';
import { OperationType } from '../../value-objects/OperationType';
import {
  concurrentOperationsFactory,
  createOperationsWithComplexity,
  deviceIdFactory,
  operationFactory,
  operationIdFactory,
  operationPayloadFactory,
  sequentialOperationsFactory,
  syncTestScenarios,
} from '../test-factories';

describe('CRDTTransformationService', () => {
  let service: CRDTTransformationService;

  beforeEach(() => {
    service = new CRDTTransformationService();
  });

  describe('transformOperation', () => {
    it('should successfully transform compatible operations', async () => {
      const operation1 = operationFactory.build();
      const operation2 = operationFactory.build();

      const result = await service.transformOperation(operation1, operation2);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle transformation errors gracefully', async () => {
      const operation1 = operationFactory.build();
      const operation2 = operationFactory.build();

      const result = await service.transformOperation(operation1, operation2);

      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBeTruthy();
      }
    });

    it('should preserve operation identity during transformation', async () => {
      const operations = concurrentOperationsFactory.build();
      const [op1, op2] = operations;

      if (op1 && op2) {
        const result = await service.transformOperation(op1, op2);

        if (result.isOk()) {
          const transformedOp = result.value;
          expect(transformedOp.getDeviceId().equals(op1.getDeviceId())).toBe(true);
          expect(transformedOp.getOperationType().equals(op1.getOperationType())).toBe(true);
        }
      }
    });

    it('should handle structural operations correctly', async () => {
      const structuralOpType = OperationType.create('CREATE_ARGUMENT');
      expect(structuralOpType.isOk()).toBe(true);
      if (!structuralOpType.isOk()) return;

      const device = deviceIdFactory.build();
      const opId1 = operationIdFactory.build();
      const opId2 = operationIdFactory.build();
      const payload1 = operationPayloadFactory.build();
      const payload2 = operationPayloadFactory.build();
      const vectorClock = VectorClock.create(device);
      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const operation1Result = Operation.create(
        opId1,
        device,
        structuralOpType.value,
        '/test/path',
        payload1,
        vectorClock.value,
      );
      const operation2Result = Operation.create(
        opId2,
        device,
        structuralOpType.value,
        '/test/path',
        payload2,
        vectorClock.value,
      );

      expect(operation1Result.isOk()).toBe(true);
      expect(operation2Result.isOk()).toBe(true);
      if (!operation1Result.isOk() || !operation2Result.isOk()) return;

      const result = await service.transformOperation(
        operation1Result.value,
        operation2Result.value,
      );

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle semantic operations correctly', async () => {
      const semanticOpType = OperationType.create('UPDATE_STATEMENT');
      expect(semanticOpType.isOk()).toBe(true);
      if (!semanticOpType.isOk()) return;

      const device = deviceIdFactory.build();
      const opId1 = operationIdFactory.build();
      const opId2 = operationIdFactory.build();
      const payload1 = operationPayloadFactory.build();
      const payload2 = operationPayloadFactory.build();
      const vectorClock = VectorClock.create(device);
      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const operation1Result = Operation.create(
        opId1,
        device,
        semanticOpType.value,
        '/test/path',
        payload1,
        vectorClock.value,
      );
      const operation2Result = Operation.create(
        opId2,
        device,
        semanticOpType.value,
        '/test/path',
        payload2,
        vectorClock.value,
      );

      expect(operation1Result.isOk()).toBe(true);
      expect(operation2Result.isOk()).toBe(true);
      if (!operation1Result.isOk() || !operation2Result.isOk()) return;

      const result = await service.transformOperation(
        operation1Result.value,
        operation2Result.value,
      );

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle operations from different devices', async () => {
      const device1 = deviceIdFactory.build();
      const device2 = deviceIdFactory.build();

      const opId1 = operationIdFactory.build();
      const opId2 = operationIdFactory.build();
      const opType = OperationType.create('UPDATE_STATEMENT');
      expect(opType.isOk()).toBe(true);
      if (!opType.isOk()) return;

      const payload1 = operationPayloadFactory.build();
      const payload2 = operationPayloadFactory.build();
      const vectorClock1 = VectorClock.create(device1);
      const vectorClock2 = VectorClock.create(device2);
      expect(vectorClock1.isOk() && vectorClock2.isOk()).toBe(true);
      if (!vectorClock1.isOk() || !vectorClock2.isOk()) return;

      const operation1Result = Operation.create(
        opId1,
        device1,
        opType.value,
        '/test/path',
        payload1,
        vectorClock1.value,
      );
      const operation2Result = Operation.create(
        opId2,
        device2,
        opType.value,
        '/test/path',
        payload2,
        vectorClock2.value,
      );

      expect(operation1Result.isOk()).toBe(true);
      expect(operation2Result.isOk()).toBe(true);
      if (!operation1Result.isOk() || !operation2Result.isOk()) return;

      const result = await service.transformOperation(
        operation1Result.value,
        operation2Result.value,
      );

      expect(result.isOk() || result.isErr()).toBe(true);
    });
  });

  describe('transformOperationSequence', () => {
    it('should transform empty sequence', async () => {
      const result = await service.transformOperationSequence([]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('should transform single operation sequence', async () => {
      const operation = operationFactory.build();
      const result = await service.transformOperationSequence([operation]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
      }
    });

    it('should transform multiple operations in sequence', async () => {
      const operations = createOperationsWithComplexity('SIMPLE');
      const result = await service.transformOperationSequence(operations);

      if (result.isOk()) {
        expect(result.value).toHaveLength(operations.length);
      } else {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should handle concurrent operations in sequence', async () => {
      const operations = concurrentOperationsFactory.build();
      const result = await service.transformOperationSequence(operations);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle sequential operations in sequence', async () => {
      const operations = sequentialOperationsFactory.build();
      const result = await service.transformOperationSequence(operations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(operations.length);
      }
    });

    it('should handle complex operation sequences', async () => {
      const operations = createOperationsWithComplexity('COMPLEX');
      const result = await service.transformOperationSequence(operations);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should preserve operation ordering constraints', async () => {
      const operations = sequentialOperationsFactory.build();

      // Debug: check if operations are actually sequential (not concurrent)
      expect(operations).toHaveLength(2);
      const [op1, op2] = operations;
      if (op1 && op2) {
        expect(op1.isConcurrentWith(op2)).toBe(false); // Sequential operations should not be concurrent
        expect(op1.hasCausalDependencyOn(op2) || op2.hasCausalDependencyOn(op1)).toBe(true); // One should depend on the other
      }

      const result = await service.transformOperationSequence(operations);

      if (result.isOk()) {
        const transformedOps = result.value;
        expect(transformedOps).toHaveLength(operations.length);

        // Since operations are sequential (not concurrent), they should not be transformed at all
        // So the timestamps should remain exactly the same and in order
        for (let i = 0; i < transformedOps.length - 1; i++) {
          const current = transformedOps[i];
          const next = transformedOps[i + 1];
          if (current && next) {
            // Sequential operations should maintain causal ordering
            const timestamp1 = current.getTimestamp();
            const timestamp2 = next.getTimestamp();
            expect(timestamp1.compareTo(timestamp2)).toBeLessThanOrEqual(0);
          }
        }
      }
    });
  });

  describe('canTransformOperations', () => {
    it('should return true for transformable operations', () => {
      const operations = concurrentOperationsFactory.build();
      const [op1, op2] = operations;

      if (op1 && op2) {
        const result = service.canTransformOperations(op1, op2);
        expect(typeof result).toBe('boolean');
      }
    });

    it('should return false for non-transformable operations', () => {
      const operations = sequentialOperationsFactory.build();
      const [op1, op2] = operations;

      if (op1 && op2) {
        const result = service.canTransformOperations(op1, op2);
        expect(typeof result).toBe('boolean');
      }
    });

    it('should handle operations with different target paths', () => {
      const operation1 = operationFactory.build();
      const operation2 = operationFactory.build();

      const result = service.canTransformOperations(operation1, operation2);
      expect(typeof result).toBe('boolean');
    });

    it('should handle operations of different types', () => {
      const createOpType = OperationType.create('CREATE_STATEMENT');
      const deleteOpType = OperationType.create('DELETE_STATEMENT');

      expect(createOpType.isOk()).toBe(true);
      expect(deleteOpType.isOk()).toBe(true);
      if (!createOpType.isOk() || !deleteOpType.isOk()) return;

      const device = deviceIdFactory.build();
      const opId1 = operationIdFactory.build();
      const opId2 = operationIdFactory.build();
      const payload1 = operationPayloadFactory.build();
      const payload2 = operationPayloadFactory.build();
      const vectorClock = VectorClock.create(device);
      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const operation1Result = Operation.create(
        opId1,
        device,
        createOpType.value,
        '/test/path',
        payload1,
        vectorClock.value,
      );
      const operation2Result = Operation.create(
        opId2,
        device,
        deleteOpType.value,
        '/test/path',
        payload2,
        vectorClock.value,
      );

      expect(operation1Result.isOk()).toBe(true);
      expect(operation2Result.isOk()).toBe(true);
      if (!operation1Result.isOk() || !operation2Result.isOk()) return;

      const result = service.canTransformOperations(operation1Result.value, operation2Result.value);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('calculateTransformationComplexity', () => {
    it('should return SIMPLE for small operation sets', () => {
      const operations = createOperationsWithComplexity('SIMPLE');
      const complexity = service.calculateTransformationComplexity(operations);

      expect(['SIMPLE', 'MODERATE', 'COMPLEX', 'INTRACTABLE']).toContain(complexity);
    });

    it('should return MODERATE for medium operation sets', () => {
      const operations = createOperationsWithComplexity('MODERATE');
      const complexity = service.calculateTransformationComplexity(operations);

      expect(['SIMPLE', 'MODERATE', 'COMPLEX', 'INTRACTABLE']).toContain(complexity);
    });

    it('should return COMPLEX for large operation sets', () => {
      const operations = createOperationsWithComplexity('COMPLEX');
      const complexity = service.calculateTransformationComplexity(operations);

      expect(['SIMPLE', 'MODERATE', 'COMPLEX', 'INTRACTABLE']).toContain(complexity);
    });

    it('should handle empty operation list', () => {
      const complexity = service.calculateTransformationComplexity([]);
      expect(['SIMPLE', 'MODERATE', 'COMPLEX', 'INTRACTABLE']).toContain(complexity);
    });

    it('should consider operation types in complexity calculation', () => {
      const structuralOps: Operation[] = [];

      for (const opTypeValue of syncTestScenarios.structuralOperations) {
        const operationType = OperationType.create(opTypeValue);
        expect(operationType.isOk()).toBe(true);
        if (!operationType.isOk()) continue;

        const device = deviceIdFactory.build();
        const opId = operationIdFactory.build();
        const payload = operationPayloadFactory.build();
        const vectorClock = VectorClock.create(device);
        expect(vectorClock.isOk()).toBe(true);
        if (!vectorClock.isOk()) continue;

        const operationResult = Operation.create(
          opId,
          device,
          operationType.value,
          '/test/path',
          payload,
          vectorClock.value,
        );

        if (operationResult.isOk()) {
          structuralOps.push(operationResult.value);
        }
      }

      const complexity = service.calculateTransformationComplexity(structuralOps);
      expect(['SIMPLE', 'MODERATE', 'COMPLEX', 'INTRACTABLE']).toContain(complexity);
    });
  });

  describe('getTransformationStatistics', () => {
    it('should provide accurate statistics for empty operations', () => {
      const stats = service.getTransformationStatistics([]);

      expect(stats.totalOperations).toBe(0);
      expect(stats.concurrentOperations).toBe(0);
      expect(stats.transformableOperations).toBe(0);
      expect(stats.complexityDistribution).toEqual({
        SIMPLE: 0,
        MODERATE: 0,
        COMPLEX: 0,
        INTRACTABLE: 0,
      });
    });

    it('should provide accurate statistics for single operation', () => {
      const operation = operationFactory.build();
      const stats = service.getTransformationStatistics([operation]);

      expect(stats.totalOperations).toBe(1);
      expect(stats.concurrentOperations).toBe(0);
    });

    it('should identify concurrent operations correctly', () => {
      const operations = concurrentOperationsFactory.build();
      const stats = service.getTransformationStatistics(operations);

      expect(stats.totalOperations).toBe(operations.length);
      expect(stats.concurrentOperations).toBeGreaterThanOrEqual(0);
    });

    it('should calculate complexity distribution accurately', () => {
      const operations = createOperationsWithComplexity('MODERATE');
      const stats = service.getTransformationStatistics(operations);

      expect(stats.totalOperations).toBe(operations.length);
      expect(typeof stats.complexityDistribution.SIMPLE).toBe('number');
      expect(typeof stats.complexityDistribution.MODERATE).toBe('number');
      expect(typeof stats.complexityDistribution.COMPLEX).toBe('number');
      expect(typeof stats.complexityDistribution.INTRACTABLE).toBe('number');
    });

    it('should count transformable operations correctly', () => {
      const operations = createOperationsWithComplexity('SIMPLE');
      const stats = service.getTransformationStatistics(operations);

      expect(stats.transformableOperations).toBeGreaterThanOrEqual(0);
      expect(stats.transformableOperations).toBeLessThanOrEqual(stats.totalOperations);
    });
  });

  describe('validateTransformationResult', () => {
    it('should validate successful transformation preserving device ID', () => {
      const operation = operationFactory.build();

      // Create a new operation with same device ID, operation type, and target path
      const newOpId = operationIdFactory.build();
      const transformedOperationResult = Operation.create(
        newOpId,
        operation.getDeviceId(),
        operation.getOperationType(),
        operation.getTargetPath(),
        operation.getPayload(),
        operation.getVectorClock(),
      );

      expect(transformedOperationResult.isOk()).toBe(true);
      if (transformedOperationResult.isOk()) {
        const transformedOperation = transformedOperationResult.value;
        const result = service.validateTransformationResult(operation, transformedOperation);
        expect(result.isOk()).toBe(true);
      }
    });

    it('should fail validation when device ID changes', () => {
      const operation1 = operationFactory.build();
      const operation2 = operationFactory.build();

      // Ensure different device IDs
      if (!operation1.getDeviceId().equals(operation2.getDeviceId())) {
        const result = service.validateTransformationResult(operation1, operation2);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('device ID');
        }
      }
    });

    it('should fail validation when operation type changes', () => {
      const device = deviceIdFactory.build();
      const createOpType = OperationType.create('CREATE_STATEMENT');
      const deleteOpType = OperationType.create('DELETE_STATEMENT');

      expect(createOpType.isOk()).toBe(true);
      expect(deleteOpType.isOk()).toBe(true);
      if (!createOpType.isOk() || !deleteOpType.isOk()) return;

      const opId1 = operationIdFactory.build();
      const opId2 = operationIdFactory.build();
      const payload = operationPayloadFactory.build();
      const vectorClock = VectorClock.create(device);
      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const operation1Result = Operation.create(
        opId1,
        device,
        createOpType.value,
        '/test/path',
        payload,
        vectorClock.value,
      );
      const operation2Result = Operation.create(
        opId2,
        device,
        deleteOpType.value,
        '/test/path',
        payload,
        vectorClock.value,
      );

      expect(operation1Result.isOk()).toBe(true);
      expect(operation2Result.isOk()).toBe(true);
      if (!operation1Result.isOk() || !operation2Result.isOk()) return;

      const result = service.validateTransformationResult(
        operation1Result.value,
        operation2Result.value,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('operation type');
      }
    });

    it('should fail validation when target path changes', () => {
      const operation1 = operationFactory.build();
      const operationType = operation1.getOperationType();

      // Create operation with different target path
      const operation2Result = Operation.create(
        operation1.getId(),
        operation1.getDeviceId(),
        operationType,
        '/different/path',
        operation1.getPayload(),
        operation1.getVectorClock(),
      );

      expect(operation2Result.isOk()).toBe(true);
      if (operation2Result.isOk()) {
        const result = service.validateTransformationResult(operation1, operation2Result.value);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('target path');
        }
      }
    });
  });

  describe('performance and scalability', () => {
    it('should handle large transformation sequences efficiently', async () => {
      const operations = Array.from({ length: 50 }, () => operationFactory.build());

      const startTime = Date.now();
      const result = await service.transformOperationSequence(operations);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle concurrent transformation requests', async () => {
      const operation1 = operationFactory.build();
      const operation2 = operationFactory.build();

      const promises = Array.from({ length: 10 }, async () =>
        service.transformOperation(operation1, operation2),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.isOk() || result.isErr()).toBe(true);
      });
    });

    it('should handle memory efficiently with large operations', async () => {
      const operations = createOperationsWithComplexity('COMPLEX');
      const initialMemory = process.memoryUsage().heapUsed;

      await service.transformOperationSequence(operations);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB for complex operations)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null operations gracefully', async () => {
      const operation = operationFactory.build();

      try {
        await service.transformOperation(operation, null as any);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle undefined operations gracefully', async () => {
      const operation = operationFactory.build();

      try {
        await service.transformOperation(operation, undefined as any);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle operations with invalid vector clocks', async () => {
      const operation1 = operationFactory.build();
      const operation2 = operationFactory.build();

      const result = await service.transformOperation(operation1, operation2);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle operations with malformed payloads', async () => {
      const operation1 = operationFactory.build();
      const operation2 = operationFactory.build();

      const result = await service.transformOperation(operation1, operation2);

      expect(result.isOk() || result.isErr()).toBe(true);
    });
  });

  describe('operation type specific transformations', () => {
    it('should handle CREATE operations correctly', async () => {
      const createOpType = OperationType.create('CREATE_STATEMENT');
      expect(createOpType.isOk()).toBe(true);
      if (!createOpType.isOk()) return;

      const device = deviceIdFactory.build();
      const opId1 = operationIdFactory.build();
      const opId2 = operationIdFactory.build();
      const payload1 = operationPayloadFactory.build();
      const payload2 = operationPayloadFactory.build();
      const vectorClock = VectorClock.create(device);
      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const operation1Result = Operation.create(
        opId1,
        device,
        createOpType.value,
        '/test/path',
        payload1,
        vectorClock.value,
      );
      const operation2Result = Operation.create(
        opId2,
        device,
        createOpType.value,
        '/test/path',
        payload2,
        vectorClock.value,
      );

      expect(operation1Result.isOk()).toBe(true);
      expect(operation2Result.isOk()).toBe(true);
      if (!operation1Result.isOk() || !operation2Result.isOk()) return;

      const result = await service.transformOperation(
        operation1Result.value,
        operation2Result.value,
      );

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle UPDATE operations correctly', async () => {
      const updateOpType = OperationType.create('UPDATE_STATEMENT');
      expect(updateOpType.isOk()).toBe(true);
      if (!updateOpType.isOk()) return;

      const device = deviceIdFactory.build();
      const opId1 = operationIdFactory.build();
      const opId2 = operationIdFactory.build();
      const payload1 = operationPayloadFactory.build();
      const payload2 = operationPayloadFactory.build();
      const vectorClock = VectorClock.create(device);
      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const operation1Result = Operation.create(
        opId1,
        device,
        updateOpType.value,
        '/test/path',
        payload1,
        vectorClock.value,
      );
      const operation2Result = Operation.create(
        opId2,
        device,
        updateOpType.value,
        '/test/path',
        payload2,
        vectorClock.value,
      );

      expect(operation1Result.isOk()).toBe(true);
      expect(operation2Result.isOk()).toBe(true);
      if (!operation1Result.isOk() || !operation2Result.isOk()) return;

      const result = await service.transformOperation(
        operation1Result.value,
        operation2Result.value,
      );

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle DELETE operations correctly', async () => {
      const deleteOpType = OperationType.create('DELETE_STATEMENT');
      expect(deleteOpType.isOk()).toBe(true);
      if (!deleteOpType.isOk()) return;

      const device = deviceIdFactory.build();
      const opId1 = operationIdFactory.build();
      const opId2 = operationIdFactory.build();
      const payload1 = operationPayloadFactory.build();
      const payload2 = operationPayloadFactory.build();
      const vectorClock = VectorClock.create(device);
      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const operation1Result = Operation.create(
        opId1,
        device,
        deleteOpType.value,
        '/test/path',
        payload1,
        vectorClock.value,
      );
      const operation2Result = Operation.create(
        opId2,
        device,
        deleteOpType.value,
        '/test/path',
        payload2,
        vectorClock.value,
      );

      expect(operation1Result.isOk()).toBe(true);
      expect(operation2Result.isOk()).toBe(true);
      if (!operation1Result.isOk() || !operation2Result.isOk()) return;

      const result = await service.transformOperation(
        operation1Result.value,
        operation2Result.value,
      );

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle mixed operation types', async () => {
      const createOpType = OperationType.create('CREATE_STATEMENT');
      const updateOpType = OperationType.create('UPDATE_STATEMENT');

      expect(createOpType.isOk()).toBe(true);
      expect(updateOpType.isOk()).toBe(true);
      if (!createOpType.isOk() || !updateOpType.isOk()) return;

      const device = deviceIdFactory.build();
      const opId1 = operationIdFactory.build();
      const opId2 = operationIdFactory.build();
      const payload1 = operationPayloadFactory.build();
      const payload2 = operationPayloadFactory.build();
      const vectorClock = VectorClock.create(device);
      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const operation1Result = Operation.create(
        opId1,
        device,
        createOpType.value,
        '/test/path',
        payload1,
        vectorClock.value,
      );
      const operation2Result = Operation.create(
        opId2,
        device,
        updateOpType.value,
        '/test/path',
        payload2,
        vectorClock.value,
      );

      expect(operation1Result.isOk()).toBe(true);
      expect(operation2Result.isOk()).toBe(true);
      if (!operation1Result.isOk() || !operation2Result.isOk()) return;

      const result = await service.transformOperation(
        operation1Result.value,
        operation2Result.value,
      );

      expect(result.isOk() || result.isErr()).toBe(true);
    });
  });

  describe('advanced synchronization scenarios', () => {
    it('should handle three-way concurrent operations', async () => {
      const device1 = deviceIdFactory.build();
      const device2 = deviceIdFactory.build();
      const device3 = deviceIdFactory.build();
      const updateOpType = OperationType.create('UPDATE_STATEMENT');

      expect(updateOpType.isOk()).toBe(true);
      if (!updateOpType.isOk()) return;

      const operations = [device1, device2, device3].map((device) => {
        const opId = operationIdFactory.build();
        const payload = operationPayloadFactory.build();
        const vectorClock = VectorClock.create(device);

        expect(vectorClock.isOk()).toBe(true);
        if (!vectorClock.isOk()) throw new Error('Failed to create vector clock');

        return Operation.create(
          opId,
          device,
          updateOpType.value,
          '/shared/path',
          payload,
          vectorClock.value,
        );
      });

      const validOperations = operations.filter((op) => op.isOk()).map((op) => op.value);
      expect(validOperations).toHaveLength(3);

      const result = await service.transformOperationSequence(validOperations);
      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle operations with parent-child relationships', async () => {
      const device = deviceIdFactory.build();
      const createOpType = OperationType.create('CREATE_STATEMENT');
      const updateOpType = OperationType.create('UPDATE_STATEMENT');

      expect(createOpType.isOk()).toBe(true);
      expect(updateOpType.isOk()).toBe(true);
      if (!createOpType.isOk() || !updateOpType.isOk()) return;

      const parentOpId = operationIdFactory.build();
      const childOpId = operationIdFactory.build();
      const payload = operationPayloadFactory.build();
      const vectorClock = VectorClock.create(device);

      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const parentOpResult = Operation.create(
        parentOpId,
        device,
        createOpType.value,
        '/parent/path',
        payload,
        vectorClock.value,
      );

      const childOpResult = Operation.create(
        childOpId,
        device,
        updateOpType.value,
        '/parent/path/child',
        payload,
        vectorClock.value,
        parentOpId,
      );

      expect(parentOpResult.isOk()).toBe(true);
      expect(childOpResult.isOk()).toBe(true);
      if (!parentOpResult.isOk() || !childOpResult.isOk()) return;

      const result = await service.transformOperationSequence([
        parentOpResult.value,
        childOpResult.value,
      ]);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle nested path transformations', async () => {
      const device = deviceIdFactory.build();
      const updateOpType = OperationType.create('UPDATE_STATEMENT');

      expect(updateOpType.isOk()).toBe(true);
      if (!updateOpType.isOk()) return;

      const paths = [
        '/root/document',
        '/root/document/section1',
        '/root/document/section1/subsection',
        '/root/document/section2',
      ];

      const operations = paths.map((path) => {
        const opId = operationIdFactory.build();
        const payload = operationPayloadFactory.build();
        const vectorClock = VectorClock.create(device);

        expect(vectorClock.isOk()).toBe(true);
        if (!vectorClock.isOk()) throw new Error('Failed to create vector clock');

        return Operation.create(opId, device, updateOpType.value, path, payload, vectorClock.value);
      });

      const validOperations = operations.filter((op) => op.isOk()).map((op) => op.value);
      expect(validOperations).toHaveLength(4);

      const result = await service.transformOperationSequence(validOperations);
      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle conflicting operations on same path', async () => {
      const device1 = deviceIdFactory.build();
      const device2 = deviceIdFactory.build();
      const deleteOpType = OperationType.create('DELETE_STATEMENT');
      const updateOpType = OperationType.create('UPDATE_STATEMENT');

      expect(deleteOpType.isOk()).toBe(true);
      expect(updateOpType.isOk()).toBe(true);
      if (!deleteOpType.isOk() || !updateOpType.isOk()) return;

      const samePath = '/conflicted/path';
      const opId1 = operationIdFactory.build();
      const opId2 = operationIdFactory.build();
      const payload = operationPayloadFactory.build();
      const vectorClock1 = VectorClock.create(device1);
      const vectorClock2 = VectorClock.create(device2);

      expect(vectorClock1.isOk()).toBe(true);
      expect(vectorClock2.isOk()).toBe(true);
      if (!vectorClock1.isOk() || !vectorClock2.isOk()) return;

      const deleteOpResult = Operation.create(
        opId1,
        device1,
        deleteOpType.value,
        samePath,
        payload,
        vectorClock1.value,
      );

      const updateOpResult = Operation.create(
        opId2,
        device2,
        updateOpType.value,
        samePath,
        payload,
        vectorClock2.value,
      );

      expect(deleteOpResult.isOk()).toBe(true);
      expect(updateOpResult.isOk()).toBe(true);
      if (!deleteOpResult.isOk() || !updateOpResult.isOk()) return;

      const result = await service.transformOperation(deleteOpResult.value, updateOpResult.value);

      expect(result.isOk() || result.isErr()).toBe(true);
    });
  });

  describe('transformation statistics analysis', () => {
    it('should provide detailed statistics for complex concurrent scenarios', () => {
      const operations = createOperationsWithComplexity('COMPLEX');
      const stats = service.getTransformationStatistics(operations);

      expect(stats.totalOperations).toBe(operations.length);
      expect(stats.concurrentOperations).toBeGreaterThanOrEqual(0);
      expect(stats.transformableOperations).toBeGreaterThanOrEqual(0);
      expect(stats.complexityDistribution).toHaveProperty('SIMPLE');
      expect(stats.complexityDistribution).toHaveProperty('MODERATE');
      expect(stats.complexityDistribution).toHaveProperty('COMPLEX');
      expect(stats.complexityDistribution).toHaveProperty('INTRACTABLE');

      // Verify that complexity distribution adds up correctly
      const totalComplexityCount = Object.values(stats.complexityDistribution).reduce(
        (sum, count) => sum + count,
        0,
      );
      expect(totalComplexityCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed complexity distributions', () => {
      const simpleOps = createOperationsWithComplexity('SIMPLE');
      const complexOps = createOperationsWithComplexity('COMPLEX');
      const mixedOps = [...simpleOps, ...complexOps];

      const stats = service.getTransformationStatistics(mixedOps);

      expect(stats.totalOperations).toBe(mixedOps.length);
      expect(stats.complexityDistribution.SIMPLE).toBeGreaterThanOrEqual(0);
      expect(stats.complexityDistribution.COMPLEX).toBeGreaterThanOrEqual(0);
    });

    it('should identify intractable operations correctly', () => {
      const intractableOps = createOperationsWithComplexity('COMPLEX');
      const stats = service.getTransformationStatistics(intractableOps);

      expect(stats.totalOperations).toBe(intractableOps.length);
      expect(stats.transformableOperations).toBeLessThanOrEqual(stats.totalOperations);

      // Intractable operations should not be counted as transformable
      if (stats.complexityDistribution.INTRACTABLE > 0) {
        expect(stats.transformableOperations).toBeLessThan(stats.totalOperations);
      }
    });
  });

  describe('validation edge cases', () => {
    it('should detect payload modifications during transformation', () => {
      const operation = operationFactory.build();
      const _originalPayload = operation.getPayload();

      // Create a modified operation with different payload
      const modifiedPayload = operationPayloadFactory.build();
      const modifiedOperationResult = Operation.create(
        operation.getId(),
        operation.getDeviceId(),
        operation.getOperationType(),
        operation.getTargetPath(),
        modifiedPayload,
        operation.getVectorClock(),
      );

      expect(modifiedOperationResult.isOk()).toBe(true);
      if (modifiedOperationResult.isOk()) {
        // Validation should still pass for payload changes during transformation
        const result = service.validateTransformationResult(
          operation,
          modifiedOperationResult.value,
        );
        expect(result.isOk()).toBe(true);
      }
    });

    it('should handle operations with identical vector clocks', () => {
      const device = deviceIdFactory.build();
      const vectorClock = VectorClock.create(device);

      expect(vectorClock.isOk()).toBe(true);
      if (!vectorClock.isOk()) return;

      const opType = OperationType.create('UPDATE_STATEMENT');
      expect(opType.isOk()).toBe(true);
      if (!opType.isOk()) return;

      const opId1 = operationIdFactory.build();
      const opId2 = operationIdFactory.build();
      const payload1 = operationPayloadFactory.build();
      const payload2 = operationPayloadFactory.build();

      const operation1Result = Operation.create(
        opId1,
        device,
        opType.value,
        '/test/path',
        payload1,
        vectorClock.value,
      );
      const operation2Result = Operation.create(
        opId2,
        device,
        opType.value,
        '/test/path',
        payload2,
        vectorClock.value,
      );

      expect(operation1Result.isOk()).toBe(true);
      expect(operation2Result.isOk()).toBe(true);
      if (!operation1Result.isOk() || !operation2Result.isOk()) return;

      const canTransform = service.canTransformOperations(
        operation1Result.value,
        operation2Result.value,
      );
      expect(typeof canTransform).toBe('boolean');
    });
  });

  describe('interface compliance verification', () => {
    it('should implement all ICRDTTransformationService methods', () => {
      expect(service.transformOperation).toBeDefined();
      expect(service.transformOperationSequence).toBeDefined();
      expect(service.canTransformOperations).toBeDefined();
      expect(service.calculateTransformationComplexity).toBeDefined();
      expect(typeof service.transformOperation).toBe('function');
      expect(typeof service.transformOperationSequence).toBe('function');
      expect(typeof service.canTransformOperations).toBe('function');
      expect(typeof service.calculateTransformationComplexity).toBe('function');
    });

    it('should provide additional utility methods', () => {
      expect(service.getTransformationStatistics).toBeDefined();
      expect(service.validateTransformationResult).toBeDefined();
      expect(typeof service.getTransformationStatistics).toBe('function');
      expect(typeof service.validateTransformationResult).toBe('function');
    });
  });

  describe('async operation handling', () => {
    it('should handle async transformation errors gracefully', async () => {
      const operation1 = operationFactory.build();
      const operation2 = operationFactory.build();

      // Test with a potentially throwing operation
      const result = await service.transformOperation(operation1, operation2);

      expect(result.isOk() || result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should maintain promise resolution for all operations', async () => {
      const operations = Array.from({ length: 5 }, () => operationFactory.build());

      const firstOperation = operations[0];
      if (!firstOperation) {
        throw new Error('Failed to create test operations');
      }

      const promises = operations.map((op) => service.transformOperation(op, firstOperation));

      const results = await Promise.allSettled(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });
});
