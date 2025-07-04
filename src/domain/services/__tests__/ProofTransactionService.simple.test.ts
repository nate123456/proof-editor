import { ok } from 'neverthrow';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProofTransactionService } from '../ProofTransactionService.js';

describe('ProofTransactionService Simple Tests', () => {
  let service: ProofTransactionService;

  beforeEach(() => {
    service = new ProofTransactionService();
  });

  describe('basic functionality', () => {
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

    it('should track active transaction count', async () => {
      expect(service.getActiveTransactionCount()).toBe(0);

      const result1 = await service.beginTransaction();
      expect(service.getActiveTransactionCount()).toBe(1);

      const _result2 = await service.beginTransaction();
      expect(service.getActiveTransactionCount()).toBe(2);

      if (result1.isOk()) {
        await result1.value.commit();
        // Manual commit triggers cleanup via onComplete callback
        expect(service.getActiveTransactionCount()).toBe(1);
      }
    });

    it('should handle basic transaction execution', async () => {
      const mockOperation = async () => {
        return ok('success');
      };

      const result = await service.executeInTransaction(mockOperation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('success');
      }
    });

    it('should report healthy status', () => {
      expect(service.isHealthy()).toBe(true);
    });

    it('should provide metrics', () => {
      const metrics = service.getMetrics();
      expect(metrics.totalTransactionsStarted).toBe(0);
      expect(metrics.totalTransactionsCommitted).toBe(0);
      expect(metrics.totalTransactionsRolledBack).toBe(0);
      expect(metrics.activeTransactions).toBe(0);
    });
  });
});
