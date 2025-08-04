import { err, ok, type Result } from 'neverthrow';

import type { Statement } from '../entities/Statement.js';
import {
  OperationError,
  ProofOperation,
  type ProofOperationType,
} from '../interfaces/IProofTransaction.js';
import { ValidationError } from '../shared/result.js';
import type { StatementCollection } from '../shared/value-objects/collections.js';

export interface CreateStatementRequest {
  readonly content: string;
  readonly targetCollection?: StatementCollection;
}

export interface DeleteStatementRequest {
  readonly statement: Statement;
  readonly sourceCollection?: StatementCollection;
}

export class CreateStatementOperation extends ProofOperation {
  private createdStatement?: Statement;

  constructor(private readonly request: CreateStatementRequest) {
    super('CREATE_STATEMENT' as ProofOperationType);
  }

  validate(): Result<void, ValidationError> {
    const { content } = this.request;

    if (!content || content.trim().length === 0) {
      return err(new ValidationError('Statement content cannot be empty'));
    }

    if (content.length > 1000) {
      return err(new ValidationError('Statement content too long (max 1000 characters)'));
    }

    return ok(undefined);
  }

  async execute(): Promise<Result<void, OperationError>> {
    try {
      const { content, targetCollection } = this.request;

      const statementResult = await import('../entities/Statement.js').then((module) =>
        module.Statement.create(content),
      );

      if (statementResult.isErr()) {
        return err(
          new OperationError(
            `Failed to create statement: ${statementResult.error.message}`,
            this.operationType,
            this.operationId,
            statementResult.error,
          ),
        );
      }

      this.createdStatement = statementResult.value;

      if (targetCollection) {
        const addResult = targetCollection.add(this.createdStatement);
        if (addResult.isErr()) {
          return err(
            new OperationError(
              `Failed to add statement to collection: ${addResult.error.message}`,
              this.operationType,
              this.operationId,
              addResult.error,
            ),
          );
        }

        this.createdStatement.incrementUsage();
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new OperationError(
          'Failed to create statement',
          this.operationType,
          this.operationId,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }

  async compensate(): Promise<Result<void, OperationError>> {
    try {
      const { targetCollection } = this.request;

      if (this.createdStatement && targetCollection) {
        targetCollection.remove(this.createdStatement.getId());
        this.createdStatement.decrementUsage();
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new OperationError(
          'Failed to compensate statement creation',
          this.operationType,
          this.operationId,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }

  getCreatedStatement(): Statement | undefined {
    return this.createdStatement;
  }
}

export class DeleteStatementOperation extends ProofOperation {
  private originalUsageCount = 0;

  constructor(private readonly request: DeleteStatementRequest) {
    super('DELETE_STATEMENT' as ProofOperationType);
  }

  validate(): Result<void, ValidationError> {
    const { statement, sourceCollection } = this.request;

    if (!statement) {
      return err(new ValidationError('Statement is required for deletion'));
    }

    if (sourceCollection && !sourceCollection.contains(statement.getId())) {
      return err(new ValidationError('Statement not found in specified collection'));
    }

    return ok(undefined);
  }

  async execute(): Promise<Result<void, OperationError>> {
    try {
      const { statement, sourceCollection } = this.request;

      this.originalUsageCount = statement.getUsageCount();

      if (sourceCollection) {
        const removeResult = sourceCollection.remove(statement.getId());
        if (removeResult.isErr()) {
          return err(
            new OperationError(
              `Failed to remove statement from collection: ${removeResult.error.message}`,
              this.operationType,
              this.operationId,
              removeResult.error,
            ),
          );
        }

        const decrementResult = statement.decrementUsage();
        if (decrementResult.isErr()) {
          sourceCollection.add(statement);
          return err(
            new OperationError(
              `Failed to decrement statement usage: ${decrementResult.error.message}`,
              this.operationType,
              this.operationId,
              decrementResult.error,
            ),
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new OperationError(
          'Failed to delete statement',
          this.operationType,
          this.operationId,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }

  async compensate(): Promise<Result<void, OperationError>> {
    try {
      const { statement, sourceCollection } = this.request;

      if (sourceCollection) {
        sourceCollection.add(statement);

        while (statement.getUsageCount() < this.originalUsageCount) {
          statement.incrementUsage();
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new OperationError(
          'Failed to compensate statement deletion',
          this.operationType,
          this.operationId,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }
}
