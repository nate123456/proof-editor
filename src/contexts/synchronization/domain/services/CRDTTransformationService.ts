import { err, ok, type Result } from 'neverthrow';

import { Operation, type TransformationComplexity } from '../entities/Operation';

export interface ICRDTTransformationService {
  transformOperation(
    operation: Operation,
    againstOperation: Operation
  ): Promise<Result<Operation, Error>>;

  transformOperationSequence(operations: Operation[]): Promise<Result<Operation[], Error>>;

  canTransformOperations(op1: Operation, op2: Operation): boolean;

  calculateTransformationComplexity(operations: Operation[]): TransformationComplexity;
}

export class CRDTTransformationService implements ICRDTTransformationService {
  transformOperation(
    operation: Operation,
    againstOperation: Operation
  ): Promise<Result<Operation, Error>> {
    try {
      const transformResult = operation.transformWith(againstOperation);
      if (transformResult.isErr()) {
        return Promise.resolve(err(transformResult.error));
      }
      // transformWith returns [Operation, Operation], we want the first one (transformed version of 'operation')
      const [transformedOperation, _] = transformResult.value;
      return Promise.resolve(ok(transformedOperation));
    } catch (error) {
      return Promise.resolve(
        err(error instanceof Error ? error : new Error('Unknown transformation error'))
      );
    }
  }

  transformOperationSequence(operations: Operation[]): Promise<Result<Operation[], Error>> {
    const result = Operation.transformOperationSequence(operations);
    return Promise.resolve(result.map(ops => ops as Operation[]));
  }

  canTransformOperations(op1: Operation, op2: Operation): boolean {
    return op1.canTransformWith(op2);
  }

  calculateTransformationComplexity(operations: Operation[]): TransformationComplexity {
    return Operation.calculateTransformationComplexity(operations);
  }

  // Utility methods for analysis and debugging
  getTransformationStatistics(operations: Operation[]): {
    totalOperations: number;
    concurrentOperations: number;
    transformableOperations: number;
    complexityDistribution: Record<TransformationComplexity, number>;
  } {
    const concurrentGroups = Operation.findConcurrentGroups(operations);
    const concurrentOperationCount = concurrentGroups.reduce((sum, group) => sum + group.length, 0);

    let transformableCount = 0;
    const complexityDistribution: Record<TransformationComplexity, number> = {
      SIMPLE: 0,
      MODERATE: 0,
      COMPLEX: 0,
      INTRACTABLE: 0,
    };

    for (const group of concurrentGroups) {
      const complexity = this.calculateTransformationComplexity(group as Operation[]);
      complexityDistribution[complexity]++;

      if (complexity !== 'INTRACTABLE') {
        transformableCount += group.length;
      }
    }

    return {
      totalOperations: operations.length,
      concurrentOperations: concurrentOperationCount,
      transformableOperations: transformableCount,
      complexityDistribution,
    };
  }

  validateTransformationResult(original: Operation, transformed: Operation): Result<void, Error> {
    if (!original.getDeviceId().equals(transformed.getDeviceId())) {
      return err(new Error('Transformation must preserve device ID'));
    }

    if (!original.getOperationType().equals(transformed.getOperationType())) {
      return err(new Error('Transformation must preserve operation type'));
    }

    if (original.getTargetPath() !== transformed.getTargetPath()) {
      return err(new Error('Transformation must preserve target path'));
    }

    return ok(undefined);
  }
}
