import type { Result } from 'neverthrow';
import type { ValidationError } from '../shared/result.js';

export interface IProofTransaction {
  readonly transactionId: TransactionId;
  readonly startTime: Date;
  readonly operations: ProofOperation[];

  addOperation(operation: ProofOperation): void;
  commit(): Promise<Result<void, TransactionError>>;
  rollback(): Promise<Result<void, TransactionError>>;
  isActive(): boolean;
}

export interface IProofTransactionService {
  beginTransaction(): Promise<Result<IProofTransaction, TransactionError>>;
  executeInTransaction<T>(
    operation: (transaction: IProofTransaction) => Promise<Result<T, Error>>,
  ): Promise<Result<T, TransactionError>>;
  getCurrentTransaction(): IProofTransaction | null;
  getActiveTransactionCount(): number;
  isHealthy(): boolean;
}

export abstract class ProofOperation {
  readonly operationId: OperationId;
  readonly operationType: ProofOperationType;
  readonly createdAt: Date;

  constructor(operationType: ProofOperationType) {
    this.operationId = new OperationId();
    this.operationType = operationType;
    this.createdAt = new Date();
  }

  abstract execute(): Promise<Result<void, OperationError>>;
  abstract compensate(): Promise<Result<void, OperationError>>;
  abstract validate(): Result<void, ValidationError>;
}

export type ProofOperationType =
  | 'CREATE_CONNECTION'
  | 'REMOVE_CONNECTION'
  | 'UPDATE_ARGUMENT'
  | 'CREATE_STATEMENT'
  | 'DELETE_STATEMENT'
  | 'CREATE_ORDERED_SET'
  | 'DELETE_ORDERED_SET';

export class TransactionId {
  constructor(private readonly value: string = generateTransactionId()) {}

  getValue(): string {
    return this.value;
  }

  equals(other: TransactionId): boolean {
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }
}

export class OperationId {
  constructor(private readonly value: string = generateOperationId()) {}

  getValue(): string {
    return this.value;
  }

  equals(other: OperationId): boolean {
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }
}

export class TransactionError extends Error {
  constructor(
    message: string,
    public readonly code: TransactionErrorCode,
    public readonly transactionId?: TransactionId,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class OperationError extends Error {
  constructor(
    message: string,
    public readonly operationType: ProofOperationType,
    public readonly operationId?: OperationId,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'OperationError';
  }
}

export enum TransactionErrorCode {
  TRANSACTION_START_FAILED = 'TRANSACTION_START_FAILED',
  COMMIT_FAILED = 'COMMIT_FAILED',
  ROLLBACK_FAILED = 'ROLLBACK_FAILED',
  OPERATION_FAILED = 'OPERATION_FAILED',
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
  TRANSACTION_NOT_ACTIVE = 'TRANSACTION_NOT_ACTIVE',
  INVALID_OPERATION = 'INVALID_OPERATION',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
}

export interface TransactionConfig {
  maxOperations: number;
  timeoutMs: number;
  enableCompensation: boolean;
  retryAttempts: number;
  maxConcurrentTransactions: number;
}

export interface TransactionMetrics {
  totalTransactionsStarted: number;
  totalTransactionsCommitted: number;
  totalTransactionsRolledBack: number;
  averageTransactionDuration: number;
  activeTransactions: number;
  lastTransactionAt?: Date;
}

function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
