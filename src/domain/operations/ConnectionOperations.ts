import { err, ok, type Result } from 'neverthrow';

import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { OrderedSet } from '../entities/OrderedSet.js';
import {
  OperationError,
  ProofOperation,
  type ProofOperationType,
} from '../interfaces/IProofTransaction.js';
import { ValidationError } from '../shared/result.js';

export interface ConnectionRequest {
  readonly parentArgument: AtomicArgument;
  readonly childArgument: AtomicArgument;
  readonly sharedSet: OrderedSet;
}

export class CreateConnectionOperation extends ProofOperation {
  constructor(private readonly request: ConnectionRequest) {
    super('CREATE_CONNECTION' as ProofOperationType);
  }

  validate(): Result<void, ValidationError> {
    const { parentArgument, childArgument, sharedSet } = this.request;

    const parentConclusionRef = parentArgument.getConclusionSetRef();
    const childPremiseRef = childArgument.getPremiseSetRef();

    if (!parentConclusionRef || !childPremiseRef) {
      return err(new ValidationError('Both arguments must have the relevant ordered sets'));
    }

    if (
      !parentConclusionRef.equals(sharedSet.getId()) ||
      !childPremiseRef.equals(sharedSet.getId())
    ) {
      return err(new ValidationError('Shared set must match both argument references'));
    }

    return ok(undefined);
  }

  async execute(): Promise<Result<void, OperationError>> {
    try {
      const { parentArgument, childArgument, sharedSet } = this.request;

      sharedSet.addAtomicArgumentReference(parentArgument.getId(), 'conclusion');
      sharedSet.addAtomicArgumentReference(childArgument.getId(), 'premise');

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
    try {
      const { parentArgument, childArgument, sharedSet } = this.request;

      sharedSet.removeAtomicArgumentReference(parentArgument.getId(), 'conclusion');
      sharedSet.removeAtomicArgumentReference(childArgument.getId(), 'premise');

      return ok(undefined);
    } catch (error) {
      return err(
        new OperationError(
          'Failed to compensate connection creation',
          this.operationType,
          this.operationId,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }
}

export class RemoveConnectionOperation extends ProofOperation {
  constructor(private readonly request: ConnectionRequest) {
    super('REMOVE_CONNECTION' as ProofOperationType);
  }

  validate(): Result<void, ValidationError> {
    const { parentArgument, childArgument, sharedSet } = this.request;

    const parentConclusionRef = parentArgument.getConclusionSetRef();
    const childPremiseRef = childArgument.getPremiseSetRef();

    if (!parentConclusionRef || !childPremiseRef) {
      return err(new ValidationError('Both arguments must have the relevant ordered sets'));
    }

    if (
      !parentConclusionRef.equals(sharedSet.getId()) ||
      !childPremiseRef.equals(sharedSet.getId())
    ) {
      return err(new ValidationError('Connection does not exist between these arguments'));
    }

    return ok(undefined);
  }

  async execute(): Promise<Result<void, OperationError>> {
    try {
      const { parentArgument, childArgument, sharedSet } = this.request;

      sharedSet.removeAtomicArgumentReference(parentArgument.getId(), 'conclusion');
      sharedSet.removeAtomicArgumentReference(childArgument.getId(), 'premise');

      return ok(undefined);
    } catch (error) {
      return err(
        new OperationError(
          'Failed to remove connection',
          this.operationType,
          this.operationId,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }

  async compensate(): Promise<Result<void, OperationError>> {
    try {
      const { parentArgument, childArgument, sharedSet } = this.request;

      sharedSet.addAtomicArgumentReference(parentArgument.getId(), 'conclusion');
      sharedSet.addAtomicArgumentReference(childArgument.getId(), 'premise');

      return ok(undefined);
    } catch (error) {
      return err(
        new OperationError(
          'Failed to compensate connection removal',
          this.operationType,
          this.operationId,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }
}
