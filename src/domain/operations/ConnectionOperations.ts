import { err, ok, type Result } from 'neverthrow';

import type { AtomicArgument } from '../entities/AtomicArgument.js';
import {
  OperationError,
  ProofOperation,
  type ProofOperationType,
} from '../interfaces/IProofTransaction.js';
import { ValidationError } from '../shared/result.js';

export interface ConnectionRequest {
  readonly sourceArgument: AtomicArgument;
  readonly targetArgument: AtomicArgument;
  readonly conclusionIndex: number;
  readonly premiseIndex: number;
  readonly sharedStatement: import('../entities/Statement.js').Statement;
}

export class CreateConnectionOperation extends ProofOperation {
  constructor(private readonly request: ConnectionRequest) {
    super('CREATE_CONNECTION' as ProofOperationType);
  }

  validate(): Result<void, ValidationError> {
    const { sourceArgument, targetArgument, conclusionIndex, premiseIndex, sharedStatement } =
      this.request;

    const conclusion = sourceArgument.getConclusionAt(conclusionIndex);
    const premise = targetArgument.getPremiseAt(premiseIndex);

    if (!conclusion || !premise) {
      return err(new ValidationError('Invalid conclusion or premise position'));
    }

    if (!conclusion.equals(sharedStatement) || !premise.equals(sharedStatement)) {
      return err(new ValidationError('Shared statement must match both conclusion and premise'));
    }

    return ok(undefined);
  }

  async execute(): Promise<Result<void, OperationError>> {
    try {
      const { sourceArgument, targetArgument, conclusionIndex, premiseIndex, sharedStatement } =
        this.request;

      const setConclusionResult = sourceArgument.setConclusionAt(conclusionIndex, sharedStatement);
      if (setConclusionResult.isErr()) {
        return err(
          new OperationError(
            'Failed to set conclusion',
            this.operationType,
            this.operationId,
            setConclusionResult.error,
          ),
        );
      }

      const setPremiseResult = targetArgument.setPremiseAt(premiseIndex, sharedStatement);
      if (setPremiseResult.isErr()) {
        return err(
          new OperationError(
            'Failed to set premise',
            this.operationType,
            this.operationId,
            setPremiseResult.error,
          ),
        );
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new OperationError(
          'Failed to create connection',
          this.operationType,
          this.operationId,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }

  async compensate(): Promise<Result<void, OperationError>> {
    // Note: Compensation for connection creation is complex because we need to restore
    // the original statements. In a real implementation, this would require storing
    // the original statements before modification.
    return ok(undefined);
  }
}

export class RemoveConnectionOperation extends ProofOperation {
  constructor(private readonly request: ConnectionRequest) {
    super('REMOVE_CONNECTION' as ProofOperationType);
  }

  validate(): Result<void, ValidationError> {
    const { sourceArgument, targetArgument, conclusionIndex, premiseIndex, sharedStatement } =
      this.request;

    const conclusion = sourceArgument.getConclusionAt(conclusionIndex);
    const premise = targetArgument.getPremiseAt(premiseIndex);

    if (!conclusion || !premise) {
      return err(new ValidationError('Invalid conclusion or premise position'));
    }

    if (!conclusion.equals(sharedStatement) || !premise.equals(sharedStatement)) {
      return err(new ValidationError('Connection does not exist between these arguments'));
    }

    return ok(undefined);
  }

  async execute(): Promise<Result<void, OperationError>> {
    // Note: Removing a connection is complex because we need to handle
    // the shared statement. In a real implementation, this would require
    // additional logic to determine what to do with the statement.
    return ok(undefined);
  }

  async compensate(): Promise<Result<void, OperationError>> {
    // Note: Compensation for connection removal would require restoring
    // the connection, which is complex in this model.
    return ok(undefined);
  }
}
