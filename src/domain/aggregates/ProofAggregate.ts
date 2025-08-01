import { err, ok, type Result } from 'neverthrow';
import { AtomicArgument } from '../entities/AtomicArgument.js';
import { Statement } from '../entities/Statement.js';
import type { DomainEvent } from '../events/base-event.js';
import {
  ProofAggregateCreated,
  ProofArgumentsConnected,
  ProofAtomicArgumentCreated,
  ProofConsistencyValidated,
  ProofStatementAdded,
  ProofStatementRemoved,
  ProofVersionIncremented,
} from '../events/ProofAggregateEvents.js';
import { ProofAggregateQueryService } from '../queries/ProofAggregateQueryService.js';
import { ValidationError } from '../shared/result.js';
import { type AtomicArgumentId, ProofId, type StatementId } from '../shared/value-objects/index.js';

export interface ProofCreationData {
  initialStatement?: string;
}

export class ProofAggregate {
  private readonly uncommittedEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: ProofId,
    private readonly statements: Map<StatementId, Statement>,
    private readonly argumentsMap: Map<AtomicArgumentId, AtomicArgument>,
    private version: number = 1,
  ) {}

  static createNew(initialData: ProofCreationData = {}): Result<ProofAggregate, ValidationError> {
    const statements = new Map<StatementId, Statement>();
    const argumentsMap = new Map<AtomicArgumentId, AtomicArgument>();

    const aggregate = new ProofAggregate(ProofId.generate(), statements, argumentsMap);

    // Emit creation event
    aggregate.addDomainEvent(
      new ProofAggregateCreated(aggregate.id, {
        initialStatement: initialData.initialStatement,
        createdAt: Date.now(),
      }),
    );

    if (initialData.initialStatement !== undefined) {
      const addResult = aggregate.addStatement(initialData.initialStatement);
      if (addResult.isErr()) {
        return err(addResult.error);
      }
    }

    return ok(aggregate);
  }

  static reconstruct(
    id: ProofId,
    statements: Map<StatementId, Statement>,
    argumentsMap: Map<AtomicArgumentId, AtomicArgument>,
    version: number = 1,
  ): Result<ProofAggregate, ValidationError> {
    const aggregate = new ProofAggregate(id, statements, argumentsMap, version);

    const validationResult = aggregate.validateConsistency();
    if (validationResult.isErr()) {
      return err(new ValidationError(`Invalid aggregate state: ${validationResult.error.message}`));
    }

    return ok(aggregate);
  }

  addStatement(content: string): Result<StatementId, ValidationError> {
    const statementResult = Statement.create(content);
    if (statementResult.isErr()) {
      return err(statementResult.error);
    }

    const statement = statementResult.value;
    this.statements.set(statement.getId(), statement);
    this.incrementVersion();

    // Emit domain event
    this.addDomainEvent(
      new ProofStatementAdded(this.id, {
        statementId: statement.getId(),
        content: statement.getContentObject(),
        version: this.version,
      }),
    );

    return ok(statement.getId());
  }

  removeStatement(id: StatementId): Result<void, ValidationError> {
    const statement = this.statements.get(id);
    if (!statement) {
      return err(new ValidationError('Statement not found'));
    }

    // Check if statement is used in any atomic argument
    for (const argument of this.argumentsMap.values()) {
      const isInPremises = argument.getPremises().some((s) => s.getId().equals(id));
      const isInConclusions = argument.getConclusions().some((s) => s.getId().equals(id));
      if (isInPremises || isInConclusions) {
        return err(new ValidationError('Cannot remove statement that is used in arguments'));
      }
    }

    this.statements.delete(id);
    this.incrementVersion();

    // Emit domain event
    this.addDomainEvent(
      new ProofStatementRemoved(this.id, {
        statementId: id,
        content: statement.getContentObject(),
        version: this.version,
      }),
    );

    return ok(undefined);
  }

  createAtomicArgument(
    premiseStatementIds: StatementId[] = [],
    conclusionStatementIds: StatementId[] = [],
  ): Result<AtomicArgumentId, ValidationError> {
    // Convert statement IDs to Statement objects
    const premises: Statement[] = [];
    for (const id of premiseStatementIds) {
      const statement = this.statements.get(id);
      if (!statement) {
        return err(new ValidationError(`Premise statement ${id.getValue()} not found`));
      }
      premises.push(statement);
    }

    const conclusions: Statement[] = [];
    for (const id of conclusionStatementIds) {
      const statement = this.statements.get(id);
      if (!statement) {
        return err(new ValidationError(`Conclusion statement ${id.getValue()} not found`));
      }
      conclusions.push(statement);
    }

    const argumentResult = AtomicArgument.create(premises, conclusions);
    if (argumentResult.isErr()) {
      return err(argumentResult.error);
    }

    const argument = argumentResult.value;
    this.argumentsMap.set(argument.getId(), argument);
    this.incrementVersion();

    // Emit domain event
    this.addDomainEvent(
      new ProofAtomicArgumentCreated(this.id, {
        argumentId: argument.getId(),
        premiseIds: premiseStatementIds,
        conclusionIds: conclusionStatementIds,
        version: this.version,
      }),
    );

    return ok(argument.getId());
  }

  connectArguments(
    sourceId: AtomicArgumentId,
    targetId: AtomicArgumentId,
  ): Result<void, ValidationError> {
    const sourceArgument = this.argumentsMap.get(sourceId);
    const targetArgument = this.argumentsMap.get(targetId);

    if (!sourceArgument) {
      return err(new ValidationError('Source argument not found'));
    }
    if (!targetArgument) {
      return err(new ValidationError('Target argument not found'));
    }

    const connectionResult = sourceArgument.validateConnectionSafety(targetArgument);
    if (connectionResult.isErr()) {
      return err(connectionResult.error);
    }

    // Check if arguments can connect (have matching statements)
    const connections = sourceArgument.findConnectionsTo(targetArgument);
    if (connections.length === 0) {
      return err(new ValidationError('Arguments have no matching statements to connect'));
    }

    // Connection happens automatically through shared Statement references
    // No explicit connection logic needed - the shared Statement objects create the connection

    this.incrementVersion();

    // Emit domain event
    this.addDomainEvent(
      new ProofArgumentsConnected(this.id, {
        sourceArgumentId: sourceId,
        targetArgumentId: targetId,
        connectionCount: connections.length,
        version: this.version,
      }),
    );

    return ok(undefined);
  }

  validateConsistency(): Result<void, ValidationError> {
    const validationErrors: string[] = [];

    // Validate all statements exist that are referenced by arguments
    for (const argument of this.argumentsMap.values()) {
      for (const premise of argument.getPremises()) {
        if (!this.statements.has(premise.getId())) {
          validationErrors.push(
            `Argument ${argument.getId().getValue()} references non-existent premise statement`,
          );
        }
      }
      for (const conclusion of argument.getConclusions()) {
        if (!this.statements.has(conclusion.getId())) {
          validationErrors.push(
            `Argument ${argument.getId().getValue()} references non-existent conclusion statement`,
          );
        }
      }
    }

    const isValid = validationErrors.length === 0;

    // Emit domain event
    this.addDomainEvent(
      new ProofConsistencyValidated(this.id, {
        isValid,
        validationErrors: isValid ? undefined : validationErrors,
        version: this.version,
      }),
    );

    if (!isValid) {
      return err(new ValidationError(`Invalid aggregate state: ${validationErrors.join(', ')}`));
    }

    return ok(undefined);
  }

  getUncommittedEvents(): readonly DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents.length = 0;
  }

  // Query service factory method
  createQueryService(): ProofAggregateQueryService {
    return new ProofAggregateQueryService(
      this.id,
      this.version,
      new Map(this.statements),
      new Map(this.argumentsMap),
    );
  }

  private addDomainEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  private incrementVersion(): void {
    const previousVersion = this.version;
    this.version++;

    // Emit version increment event
    this.addDomainEvent(
      new ProofVersionIncremented(this.id, {
        previousVersion,
        newVersion: this.version,
      }),
    );
  }
}
