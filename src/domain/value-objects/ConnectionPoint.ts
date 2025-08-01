import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../shared/result.js';
import { ValueObject } from '../shared/value-objects/common.js';
import type { ConnectionType } from '../shared/value-objects/enums.js';
import type { AtomicArgumentId, StatementId } from '../shared/value-objects/identifiers.js';

export class ConnectionPoint extends ValueObject<{
  argumentId: AtomicArgumentId;
  statementId: StatementId;
  type: ConnectionType;
}> {
  private constructor(
    argumentId: AtomicArgumentId,
    statementId: StatementId,
    type: ConnectionType,
  ) {
    super({ argumentId, statementId, type });
  }

  static create(
    argumentId: AtomicArgumentId,
    statementId: StatementId,
    type: ConnectionType,
  ): Result<ConnectionPoint, ValidationError> {
    if (!argumentId) {
      return err(new ValidationError('ArgumentId is required for connection point'));
    }

    if (!statementId) {
      return err(new ValidationError('StatementId is required for connection point'));
    }

    if (!type) {
      return err(new ValidationError('ConnectionType is required for connection point'));
    }

    return ok(new ConnectionPoint(argumentId, statementId, type));
  }

  getArgumentId(): AtomicArgumentId {
    return this.value.argumentId;
  }

  getStatementId(): StatementId {
    return this.value.statementId;
  }

  getType(): ConnectionType {
    return this.value.type;
  }

  canConnectTo(other: ConnectionPoint): boolean {
    return (
      this.value.statementId.equals(other.value.statementId) && this.value.type !== other.value.type
    );
  }

  equals(other: ConnectionPoint): boolean {
    return (
      this.value.argumentId.equals(other.value.argumentId) &&
      this.value.statementId.equals(other.value.statementId) &&
      this.value.type === other.value.type
    );
  }

  toString(): string {
    return `${this.value.argumentId.getValue()}:${this.value.statementId.getValue()}:${this.value.type}`;
  }
}
