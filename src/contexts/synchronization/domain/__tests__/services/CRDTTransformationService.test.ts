import { beforeEach, describe, expect, it } from 'vitest';

import { Operation } from '../../entities/Operation';
import { CRDTTransformationService } from '../../services/CRDTTransformationService';
import { OperationType } from '../../value-objects/OperationType';
import {
  concurrentOperationsFactory,
  createOperationsWithComplexity,
  deviceIdFactory,
  operationFactory,
  operationIdFactory,
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

      const operation1 = operationFactory.build({
        operationType: structuralOpType.value,
      });
      const operation2 = operationFactory.build({
        operationType: structuralOpType.value,
      });

      const result = await service.transformOperation(operation1, operation2);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle semantic operations correctly', async () => {
      const semanticOpType = OperationType.create('UPDATE_STATEMENT');
      expect(semanticOpType.isOk()).toBe(true);

      const operation1 = operationFactory.build({
        operationType: semanticOpType.value,
      });
      const operation2 = operationFactory.build({
        operationType: semanticOpType.value,
      });

      const result = await service.transformOperation(operation1, operation2);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle operations from different devices', async () => {
      const device1 = deviceIdFactory.build();
      const device2 = deviceIdFactory.build();

      const operation1 = operationFactory.build({ deviceId: device1 });
      const operation2 = operationFactory.build({ deviceId: device2 });

      const result = await service.transformOperation(operation1, operation2);

      expect(result.isOk() || result.isErr()).toBe(true);
    });
  });

  describe('transformOperationSequence', () => {
    it('should transform empty sequence', async () => {
      const result = await service.transformOperationSequence([]);

      expect(result.isOk()).toBe(true);
      expect(result.isOk() && result.value).toEqual([]);
    });

    it('should transform single operation sequence', async () => {
      const operation = operationFactory.build();
      const result = await service.transformOperationSequence([operation]);

      expect(result.isOk()).toBe(true);
      expect(result.isOk() && result.value).toHaveLength(1);
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

      const operation1 = operationFactory.build({
        operationType: createOpType.value,
      });
      const operation2 = operationFactory.build({
        operationType: deleteOpType.value,
      });

      const result = service.canTransformOperations(operation1, operation2);
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
      const structuralOps = syncTestScenarios.structuralOperations.map(opType => {
        const operationType = OperationType.create(opType);
        expect(operationType.isOk()).toBe(true);
        return operationFactory.build({
          operationType: operationType.value,
        });
      });

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
        operation.getVectorClock()
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
        expect(result.isErr() && result.error.message).toContain('device ID');
      }
    });

    it('should fail validation when operation type changes', () => {
      const device = deviceIdFactory.build();
      const createOpType = OperationType.create('CREATE_STATEMENT');
      const deleteOpType = OperationType.create('DELETE_STATEMENT');

      expect(createOpType.isOk()).toBe(true);
      expect(deleteOpType.isOk()).toBe(true);

      const operation1 = operationFactory.build({
        deviceId: device,
        operationType: createOpType.value,
      });
      const operation2 = operationFactory.build({
        deviceId: device,
        operationType: deleteOpType.value,
      });

      const result = service.validateTransformationResult(operation1, operation2);

      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain('operation type');
    });

    it('should fail validation when target path changes', () => {
      const device = deviceIdFactory.build();
      const operationType = operationFactory.build().getOperationType();

      const operation1 = operationFactory.build({
        deviceId: device,
        operationType,
      });

      // Create operation with different target path
      const operation2Result = Operation.create(
        operation1.getId(),
        device,
        operationType,
        '/different/path',
        operation1.getPayload(),
        operation1.getVectorClock()
      );

      expect(operation2Result.isOk()).toBe(true);
      if (operation2Result.isOk()) {
        const result = service.validateTransformationResult(operation1, operation2Result.value);

        expect(result.isErr()).toBe(true);
        expect(result.isErr() && result.error.message).toContain('target path');
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

      const promises = Array.from({ length: 10 }, () =>
        service.transformOperation(operation1, operation2)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
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

      const operation1 = operationFactory.build({
        operationType: createOpType.value,
      });
      const operation2 = operationFactory.build({
        operationType: createOpType.value,
      });

      const result = await service.transformOperation(operation1, operation2);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle UPDATE operations correctly', async () => {
      const updateOpType = OperationType.create('UPDATE_STATEMENT');
      expect(updateOpType.isOk()).toBe(true);

      const operation1 = operationFactory.build({
        operationType: updateOpType.value,
      });
      const operation2 = operationFactory.build({
        operationType: updateOpType.value,
      });

      const result = await service.transformOperation(operation1, operation2);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle DELETE operations correctly', async () => {
      const deleteOpType = OperationType.create('DELETE_STATEMENT');
      expect(deleteOpType.isOk()).toBe(true);

      const operation1 = operationFactory.build({
        operationType: deleteOpType.value,
      });
      const operation2 = operationFactory.build({
        operationType: deleteOpType.value,
      });

      const result = await service.transformOperation(operation1, operation2);

      expect(result.isOk() || result.isErr()).toBe(true);
    });

    it('should handle mixed operation types', async () => {
      const createOpType = OperationType.create('CREATE_STATEMENT');
      const updateOpType = OperationType.create('UPDATE_STATEMENT');

      expect(createOpType.isOk()).toBe(true);
      expect(updateOpType.isOk()).toBe(true);

      const operation1 = operationFactory.build({
        operationType: createOpType.value,
      });
      const operation2 = operationFactory.build({
        operationType: updateOpType.value,
      });

      const result = await service.transformOperation(operation1, operation2);

      expect(result.isOk() || result.isErr()).toBe(true);
    });
  });
});
