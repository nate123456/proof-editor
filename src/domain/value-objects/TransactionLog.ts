export interface CompensationError {
  readonly operationId: string;
  readonly error: Error;
  readonly timestamp: Date;
}

export interface TransactionLogEntry {
  readonly type: 'operation' | 'compensation';
  readonly operationId: string;
  readonly timestamp: Date;
  readonly success: boolean;
  readonly error?: Error;
}

export class TransactionLog {
  private constructor(
    private readonly entries: readonly TransactionLogEntry[],
    private readonly compensationErrors: readonly CompensationError[],
  ) {}

  static create(): TransactionLog {
    return new TransactionLog([], []);
  }

  addEntry(entry: TransactionLogEntry): TransactionLog {
    return new TransactionLog([...this.entries, entry], this.compensationErrors);
  }

  addCompensationError(error: CompensationError): TransactionLog {
    return new TransactionLog(this.entries, [...this.compensationErrors, error]);
  }

  getEntries(): readonly TransactionLogEntry[] {
    return this.entries;
  }

  getCompensationErrors(): readonly CompensationError[] {
    return this.compensationErrors;
  }

  hasCompensationErrors(): boolean {
    return this.compensationErrors.length > 0;
  }

  getFailedOperations(): readonly TransactionLogEntry[] {
    return this.entries.filter((entry) => !entry.success);
  }

  getSuccessfulOperations(): readonly TransactionLogEntry[] {
    return this.entries.filter((entry) => entry.success);
  }

  getTotalOperations(): number {
    return this.entries.length;
  }

  getCompensationErrorCount(): number {
    return this.compensationErrors.length;
  }

  summarize(): string {
    const total = this.getTotalOperations();
    const failed = this.getFailedOperations().length;
    const compensationErrors = this.getCompensationErrorCount();

    return `Transaction Log: ${total} operations, ${failed} failed, ${compensationErrors} compensation errors`;
  }
}
