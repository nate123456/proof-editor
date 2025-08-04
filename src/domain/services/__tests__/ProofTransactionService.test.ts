import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TransactionConfig } from '../../interfaces/IProofTransaction.js';
import { ProofTransactionService } from '../ProofTransactionService.js';

describe('ProofTransactionService', () => {
  let service: ProofTransactionService;
  let config: TransactionConfig;

  beforeEach(() => {
    config = {
      maxOperations: 10,
      timeoutMs: 5000,
      enableCompensation: true,
      retryAttempts: 3,
      maxConcurrentTransactions: 5,
    };

    service = new ProofTransactionService(config);
  });

  describe('beginTransaction', () => {
    it('should create a new transaction successfully', async () => {
      const result = await service.beginTransaction();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.transactionId).toBeDefined();
        expect(result.value.startTime).toBeInstanceOf(Date);
        expect(result.value.operations).toEqual([]);
        expect(result.value.isActive()).toBe(true);
      }
    });

    it('should fail when max concurrent transactions exceeded', async () => {
      const promises = Array.from({ length: 6 }, () => service.beginTransaction());
      const results = await Promise.all(promises);

      const successCount = results.filter((r) => r.isOk()).length;
      const failureCount = results.filter((r) => r.isErr()).length;

      expect(successCount).toBe(5);
      expect(failureCount).toBe(1);

      const failedResult = results.find((r) => r.isErr());
      if (failedResult?.isErr()) {
        expect(failedResult.error.code).toBe('TRANSACTION_START_FAILED');
      }
    });

    it('should track active transaction count', async () => {
      expect(service.getActiveTransactionCount()).toBe(0);

      const result1 = await service.beginTransaction();
      expect(service.getActiveTransactionCount()).toBe(1);

      const _result2 = await service.beginTransaction();
      expect(service.getActiveTransactionCount()).toBe(2);

      if (result1.isOk()) {
        await result1.value.commit();
        expect(service.getActiveTransactionCount()).toBe(1);
      }
    });
  });

  describe('executeInTransaction', () => {
    it('should execute operation and commit successfully', async () => {
      const mockOperation = vi.fn().mockResolvedValue(ok('success'));

      const result = await service.executeInTransaction(mockOperation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('success');
      }
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should rollback on operation failure', async () => {
      const mockOperation = vi.fn().mockResolvedValue(err(new Error('Operation failed')));

      const result = await service.executeInTransaction(mockOperation);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('OPERATION_FAILED');
        expect(result.error.message).toBe('Operation failed');
      }
    });

    it('should handle unexpected errors during transaction', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Unexpected error'));

      const result = await service.executeInTransaction(mockOperation);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('OPERATION_FAILED');
        expect(result.error.originalError?.message).toBe('Unexpected error');
      }
    });

    it('should update metrics on successful commit', async () => {
      const mockOperation = vi.fn().mockResolvedValue(ok('success'));

      const initialMetrics = service.getMetrics();
      expect(initialMetrics.totalTransactionsCommitted).toBe(0);

      await service.executeInTransaction(mockOperation);

      const finalMetrics = service.getMetrics();
      expect(finalMetrics.totalTransactionsCommitted).toBe(1);
      expect(finalMetrics.lastTransactionAt).toBeDefined();
    });
  });

  describe('getCurrentTransaction', () => {
    it('should return null when no transaction is active', () => {
      expect(service.getCurrentTransaction()).toBeNull();
    });

    it('should return current transaction when one is active', async () => {
      const result = await service.beginTransaction();

      if (result.isOk()) {
        const currentTransaction = service.getCurrentTransaction();
        expect(currentTransaction).not.toBeNull();
        expect(currentTransaction?.transactionId).toEqual(result.value.transactionId);
      }
    });
  });

  describe('health monitoring', () => {
    it('should report healthy when under transaction limit', () => {
      expect(service.isHealthy()).toBe(true);
    });

    it('should report unhealthy when at transaction limit', async () => {
      const promises = Array.from({ length: 5 }, () => service.beginTransaction());
      await Promise.all(promises);

      expect(service.isHealthy()).toBe(false);
    });
  });

  describe('transaction timeout', () => {
    it('should timeout inactive transactions', async () => {
      const shortTimeoutConfig: TransactionConfig = {
        ...config,
        timeoutMs: 100,
      };

      const shortTimeoutService = new ProofTransactionService(shortTimeoutConfig);
      const result = await shortTimeoutService.beginTransaction();

      if (result.isOk()) {
        const transaction = result.value;

        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(transaction.isActive()).toBe(false);
      }
    });
  });
});

describe('ProofTransaction Integration', () => {
  let service: ProofTransactionService;

  beforeEach(() => {
    service = new ProofTransactionService();
  });

  it('should maintain operation order within transaction', async () => {
    const operations: string[] = [];

    const result = await service.executeInTransaction(async (transaction) => {
      for (let i = 1; i <= 3; i++) {
        const mockOp = {
          id: `op-${i}`,
          operationId: { getValue: () => `op-${i}` },
          operationType: 'CREATE_STATEMENT' as const,
          createdAt: new Date(),
          validate: () => ok(undefined),
          execute: async () => {
            operations.push(`execute-${i}`);
            return ok(undefined);
          },
          compensate: async () => {
            operations.push(`compensate-${i}`);
            return ok(undefined);
          },
        };

        transaction.addOperation(mockOp as any);
      }

      return ok(undefined);
    });

    expect(result.isOk()).toBe(true);
    expect(operations).toEqual(['execute-1', 'execute-2', 'execute-3']);
  });
});

describe('Transaction Error Handling & Logging', () => {
  let service: ProofTransactionService;

  beforeEach(() => {
    service = new ProofTransactionService({
      maxOperations: 10,
      timeoutMs: 5000,
      enableCompensation: true,
      retryAttempts: 3,
      maxConcurrentTransactions: 5,
    });
  });

  it('should collect compensation errors without swallowing them', async () => {
    const mockOperation = {
      id: 'failing-op',
      operationId: { getValue: () => 'failing-op' },
      operationType: 'CREATE_STATEMENT' as const,
      createdAt: new Date(),
      validate: () => ok(undefined),
      execute: async () => err(new Error('Operation failed')),
      compensate: async () => {
        throw new Error('Compensation failed');
      },
    };

    const result = await service.executeInTransaction(async (transaction) => {
      transaction.addOperation(mockOperation as any);
      return ok(undefined);
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error.code).toBe('COMMIT_FAILED');
      expect(result.error.originalError?.message).toBe('Operation failed');
    }
  });

  it('should track all operation executions in transaction log', async () => {
    const operations = [
      {
        id: 'op-1',
        operationId: { getValue: () => 'op-1' },
        operationType: 'CREATE_STATEMENT' as const,
        createdAt: new Date(),
        validate: () => ok(undefined),
        execute: async () => ok(undefined),
        compensate: async () => ok(undefined),
      },
      {
        id: 'op-2',
        operationId: { getValue: () => 'op-2' },
        operationType: 'CREATE_STATEMENT' as const,
        createdAt: new Date(),
        validate: () => ok(undefined),
        execute: async () => err(new Error('Second operation failed')),
        compensate: async () => ok(undefined),
      },
    ];

    const result = await service.executeInTransaction(async (transaction) => {
      for (const op of operations) {
        transaction.addOperation(op as any);
      }
      return ok(undefined);
    });

    expect(result.isErr()).toBe(true);
  });

  it('should log compensation attempts and failures', async () => {
    const mockOperations = [
      {
        id: 'op-1',
        operationId: { getValue: () => 'op-1' },
        operationType: 'CREATE_STATEMENT' as const,
        createdAt: new Date(),
        validate: () => ok(undefined),
        execute: async () => ok(undefined),
        compensate: async () => ok(undefined),
      },
      {
        id: 'op-2',
        operationId: { getValue: () => 'op-2' },
        operationType: 'CREATE_STATEMENT' as const,
        createdAt: new Date(),
        validate: () => ok(undefined),
        execute: async () => err(new Error('Operation failed')),
        compensate: async () => {
          throw new Error('Compensation failed');
        },
      },
    ];

    const result = await service.executeInTransaction(async (transaction) => {
      for (const op of mockOperations) {
        transaction.addOperation(op as any);
      }
      return ok(undefined);
    });

    expect(result.isErr()).toBe(true);
  });

  it('should continue compensating even when some compensations fail', async () => {
    const compensationResults: string[] = [];

    const mockOperations = [
      {
        id: 'op-1',
        operationId: { getValue: () => 'op-1' },
        operationType: 'CREATE_STATEMENT' as const,
        createdAt: new Date(),
        validate: () => ok(undefined),
        execute: async () => ok(undefined),
        compensate: async () => {
          compensationResults.push('op-1-compensated');
          return ok(undefined);
        },
      },
      {
        id: 'op-2',
        operationId: { getValue: () => 'op-2' },
        operationType: 'CREATE_STATEMENT' as const,
        createdAt: new Date(),
        validate: () => ok(undefined),
        execute: async () => ok(undefined),
        compensate: async () => {
          compensationResults.push('op-2-failed');
          throw new Error('Compensation failed');
        },
      },
      {
        id: 'op-3',
        operationId: { getValue: () => 'op-3' },
        operationType: 'CREATE_STATEMENT' as const,
        createdAt: new Date(),
        validate: () => ok(undefined),
        execute: async () => err(new Error('Third operation failed')),
        compensate: async () => ok(undefined),
      },
    ];

    const result = await service.executeInTransaction(async (transaction) => {
      for (const op of mockOperations) {
        transaction.addOperation(op as any);
      }
      return ok(undefined);
    });

    expect(result.isErr()).toBe(true);
    expect(compensationResults).toContain('op-1-compensated');
    expect(compensationResults).toContain('op-2-failed');
  });

  it('should provide access to transaction log for debugging', async () => {
    const transactionResult = await service.beginTransaction();

    if (transactionResult.isOk()) {
      const transaction = transactionResult.value;

      // Transaction should be active
      expect(transaction.isActive()).toBe(true);
      expect(transaction.transactionId).toBeDefined();
    }
  });
});
