import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import {
  type IProofTransaction,
  type IProofTransactionService,
  type ProofOperation,
  type TransactionConfig,
  TransactionError,
  type TransactionErrorCode,
  TransactionId,
  type TransactionMetrics,
} from '../interfaces/IProofTransaction.js';

@injectable()
export class ProofTransactionService implements IProofTransactionService {
  private activeTransactions = new Map<string, ProofTransaction>();
  private currentTransaction: IProofTransaction | null = null;
  private metrics: TransactionMetrics = {
    totalTransactionsStarted: 0,
    totalTransactionsCommitted: 0,
    totalTransactionsRolledBack: 0,
    averageTransactionDuration: 0,
    activeTransactions: 0,
  };

  constructor(
    private readonly config: TransactionConfig = {
      maxOperations: 100,
      timeoutMs: 30000,
      enableCompensation: true,
      retryAttempts: 3,
      maxConcurrentTransactions: 10,
    },
  ) {}

  async beginTransaction(): Promise<Result<IProofTransaction, TransactionError>> {
    if (this.activeTransactions.size >= this.config.maxConcurrentTransactions) {
      return err(
        new TransactionError(
          'Maximum concurrent transactions exceeded',
          'TRANSACTION_START_FAILED' as TransactionErrorCode,
        ),
      );
    }

    const transactionId = new TransactionId();
    const transaction = new ProofTransaction(transactionId, this.config, (id) =>
      this.cleanupTransaction(id),
    );

    this.activeTransactions.set(transactionId.getValue(), transaction);
    this.currentTransaction = transaction;
    this.metrics.totalTransactionsStarted++;
    this.metrics.activeTransactions = this.activeTransactions.size;

    return ok(transaction);
  }

  async executeInTransaction<T>(
    operation: (transaction: IProofTransaction) => Promise<Result<T, Error>>,
  ): Promise<Result<T, TransactionError>> {
    const transactionResult = await this.beginTransaction();
    if (transactionResult.isErr()) {
      return err(transactionResult.error);
    }

    const transaction = transactionResult.value;
    const startTime = Date.now();

    try {
      const operationResult = await operation(transaction);

      if (operationResult.isErr()) {
        const rollbackResult = await transaction.rollback();
        this.cleanupTransaction(transaction.transactionId);

        if (rollbackResult.isErr()) {
          return err(
            new TransactionError(
              'Operation failed and rollback failed',
              'ROLLBACK_FAILED' as TransactionErrorCode,
              transaction.transactionId,
              rollbackResult.error,
            ),
          );
        }

        return err(
          new TransactionError(
            'Operation failed',
            'OPERATION_FAILED' as TransactionErrorCode,
            transaction.transactionId,
            operationResult.error,
          ),
        );
      }

      const commitResult = await transaction.commit();
      this.cleanupTransaction(transaction.transactionId);

      if (commitResult.isErr()) {
        return err(commitResult.error);
      }

      this.updateMetricsOnCommit(Date.now() - startTime);
      return ok(operationResult.value);
    } catch (error) {
      await transaction.rollback();
      this.cleanupTransaction(transaction.transactionId);

      return err(
        new TransactionError(
          'Unexpected error during transaction',
          'OPERATION_FAILED' as TransactionErrorCode,
          transaction.transactionId,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }

  getCurrentTransaction(): IProofTransaction | null {
    return this.currentTransaction;
  }

  getActiveTransactionCount(): number {
    return this.activeTransactions.size;
  }

  isHealthy(): boolean {
    return this.activeTransactions.size < this.config.maxConcurrentTransactions;
  }

  getMetrics(): TransactionMetrics {
    return { ...this.metrics };
  }

  private cleanupTransaction(transactionId: TransactionId): void {
    this.activeTransactions.delete(transactionId.getValue());
    this.metrics.activeTransactions = this.activeTransactions.size;

    if (this.currentTransaction?.transactionId.equals(transactionId)) {
      this.currentTransaction = null;
    }
  }

  private updateMetricsOnCommit(duration: number): void {
    this.metrics.totalTransactionsCommitted++;
    this.metrics.lastTransactionAt = new Date();

    const totalCommitted = this.metrics.totalTransactionsCommitted;
    const currentAverage = this.metrics.averageTransactionDuration;
    this.metrics.averageTransactionDuration =
      (currentAverage * (totalCommitted - 1) + duration) / totalCommitted;
  }

  private updateMetricsOnRollback(): void {
    this.metrics.totalTransactionsRolledBack++;
  }
}

class ProofTransaction implements IProofTransaction {
  readonly operations: ProofOperation[] = [];
  private active = true;
  private timeoutHandle: NodeJS.Timeout | undefined = undefined;

  constructor(
    readonly transactionId: TransactionId,
    private readonly config: TransactionConfig,
    private readonly onComplete?: (transactionId: TransactionId) => void,
  ) {
    this.setupTimeout();
  }

  readonly startTime = new Date();

  addOperation(operation: ProofOperation): Result<void, Error> {
    if (!this.active) {
      return err(new Error('Cannot add operation to inactive transaction'));
    }

    if (this.operations.length >= this.config.maxOperations) {
      return err(new Error('Maximum operations per transaction exceeded'));
    }

    const validationResult = operation.validate();
    if (validationResult.isErr()) {
      return err(new Error(`Invalid operation: ${validationResult.error.message}`));
    }

    this.operations.push(operation);
    return ok(undefined);
  }

  async commit(): Promise<Result<void, TransactionError>> {
    if (!this.active) {
      return err(
        new TransactionError(
          'Transaction is not active',
          'TRANSACTION_NOT_ACTIVE' as TransactionErrorCode,
          this.transactionId,
        ),
      );
    }

    this.clearTimeout();

    try {
      for (const operation of this.operations) {
        const executeResult = await operation.execute();
        if (executeResult.isErr()) {
          if (this.config.enableCompensation) {
            await this.compensateExecutedOperations();
          }

          this.active = false;
          this.onComplete?.(this.transactionId);
          return err(
            new TransactionError(
              `Operation execution failed: ${executeResult.error.message}`,
              'COMMIT_FAILED' as TransactionErrorCode,
              this.transactionId,
              executeResult.error,
            ),
          );
        }
      }

      this.active = false;
      this.onComplete?.(this.transactionId);
      return ok(undefined);
    } catch (error) {
      if (this.config.enableCompensation) {
        await this.compensateExecutedOperations();
      }

      this.active = false;
      this.onComplete?.(this.transactionId);
      return err(
        new TransactionError(
          'Unexpected error during commit',
          'COMMIT_FAILED' as TransactionErrorCode,
          this.transactionId,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }

  async rollback(): Promise<Result<void, TransactionError>> {
    if (!this.active) {
      return err(
        new TransactionError(
          'Transaction is not active',
          'TRANSACTION_NOT_ACTIVE' as TransactionErrorCode,
          this.transactionId,
        ),
      );
    }

    this.clearTimeout();

    try {
      if (this.config.enableCompensation) {
        await this.compensateExecutedOperations();
      }

      this.active = false;
      this.onComplete?.(this.transactionId);
      return ok(undefined);
    } catch (error) {
      this.active = false;
      this.onComplete?.(this.transactionId);
      return err(
        new TransactionError(
          'Unexpected error during rollback',
          'ROLLBACK_FAILED' as TransactionErrorCode,
          this.transactionId,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }

  isActive(): boolean {
    return this.active;
  }

  private setupTimeout(): void {
    this.timeoutHandle = setTimeout(() => {
      if (this.active) {
        this.rollback();
      }
    }, this.config.timeoutMs);
  }

  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = undefined;
    }
  }

  private async compensateExecutedOperations(): Promise<void> {
    const executedOperations = this.operations.slice().reverse();

    for (const operation of executedOperations) {
      try {
        await operation.compensate();
      } catch (_error) {
        // Ignore compensation errors to ensure all operations are attempted
        // Even if one compensation fails, we continue with the others
      }
    }
  }
}
