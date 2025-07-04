import { err, ok, type Result } from 'neverthrow';
import { AtomicArgument } from '../entities/AtomicArgument.js';
import { OrderedSet } from '../entities/OrderedSet.js';
import { Statement } from '../entities/Statement.js';
import type { DomainEvent } from '../events/base-event.js';
import { ValidationError } from '../shared/result.js';
import {
  type AtomicArgumentId,
  type OrderedSetId,
  ProofId,
  type StatementId,
} from '../shared/value-objects.js';

export interface ProofCreationData {
  initialStatement?: string;
}

export class ConsistencyError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'ConsistencyError';
    this.cause = cause;
  }
}

export class ProofAggregate {
  private readonly uncommittedEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: ProofId,
    private readonly statements: Map<StatementId, Statement>,
    private readonly argumentsMap: Map<AtomicArgumentId, AtomicArgument>,
    private readonly orderedSets: Map<OrderedSetId, OrderedSet>,
    private version: number = 1,
  ) {}

  static createNew(initialData: ProofCreationData = {}): Result<ProofAggregate, ValidationError> {
    const statements = new Map<StatementId, Statement>();
    const argumentsMap = new Map<AtomicArgumentId, AtomicArgument>();
    const orderedSets = new Map<OrderedSetId, OrderedSet>();

    const aggregate = new ProofAggregate(ProofId.generate(), statements, argumentsMap, orderedSets);

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
    orderedSets: Map<OrderedSetId, OrderedSet>,
    version: number = 1,
  ): Result<ProofAggregate, ValidationError> {
    const aggregate = new ProofAggregate(id, statements, argumentsMap, orderedSets, version);

    const validationResult = aggregate.validateConsistency();
    if (validationResult.isErr()) {
      return err(new ValidationError(`Invalid aggregate state: ${validationResult.error.message}`));
    }

    return ok(aggregate);
  }

  getId(): ProofId {
    return this.id;
  }

  getVersion(): number {
    return this.version;
  }

  getStatements(): ReadonlyMap<StatementId, Statement> {
    return new Map(this.statements);
  }

  getArguments(): ReadonlyMap<AtomicArgumentId, AtomicArgument> {
    return new Map(this.argumentsMap);
  }

  getOrderedSets(): ReadonlyMap<OrderedSetId, OrderedSet> {
    return new Map(this.orderedSets);
  }

  addStatement(content: string): Result<StatementId, ValidationError> {
    const statementResult = Statement.create(content);
    if (statementResult.isErr()) {
      return err(statementResult.error);
    }

    const statement = statementResult.value;
    this.statements.set(statement.getId(), statement);
    this.incrementVersion();

    return ok(statement.getId());
  }

  removeStatement(id: StatementId): Result<void, ValidationError> {
    const statement = this.statements.get(id);
    if (!statement) {
      return err(new ValidationError('Statement not found'));
    }

    if (statement.isReferencedInOrderedSets()) {
      return err(new ValidationError('Cannot remove statement that is referenced by ordered sets'));
    }

    this.statements.delete(id);
    this.incrementVersion();

    return ok(undefined);
  }

  createAtomicArgument(
    premiseStatementIds: StatementId[] = [],
    conclusionStatementIds: StatementId[] = [],
  ): Result<AtomicArgumentId, ValidationError> {
    const premiseSetResult = this.createOrderedSet(premiseStatementIds);
    if (premiseSetResult.isErr()) {
      return err(premiseSetResult.error);
    }

    const conclusionSetResult = this.createOrderedSet(conclusionStatementIds);
    if (conclusionSetResult.isErr()) {
      return err(conclusionSetResult.error);
    }

    const premiseSetId = premiseSetResult.value;
    const conclusionSetId = conclusionSetResult.value;

    const argumentResult = AtomicArgument.create(premiseSetId, conclusionSetId);
    if (argumentResult.isErr()) {
      return err(argumentResult.error);
    }

    const argument = argumentResult.value;
    this.argumentsMap.set(argument.getId(), argument);

    const premiseSet = this.orderedSets.get(premiseSetId);
    const conclusionSet = this.orderedSets.get(conclusionSetId);

    if (premiseSet) {
      premiseSet.addAtomicArgumentReference(argument.getId(), 'premise');
    }
    if (conclusionSet) {
      conclusionSet.addAtomicArgumentReference(argument.getId(), 'conclusion');
    }

    this.incrementVersion();

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

    const sourceConclusionSetId = sourceArgument.getConclusionSet();
    const targetPremiseSetId = targetArgument.getPremiseSet();

    if (!sourceConclusionSetId || !targetPremiseSetId) {
      return err(new ValidationError('Arguments must have complete premise/conclusion sets'));
    }

    targetArgument.setPremiseSetRef(sourceConclusionSetId);

    const oldPremiseSet = this.orderedSets.get(targetPremiseSetId);
    if (oldPremiseSet) {
      oldPremiseSet.removeAtomicArgumentReference(targetId, 'premise');
      if (!oldPremiseSet.isReferencedByAtomicArguments()) {
        this.orderedSets.delete(targetPremiseSetId);
      }
    }

    const newPremiseSet = this.orderedSets.get(sourceConclusionSetId);
    if (newPremiseSet) {
      newPremiseSet.addAtomicArgumentReference(targetId, 'premise');
    }

    this.incrementVersion();

    return ok(undefined);
  }

  validateConsistency(): Result<void, ConsistencyError> {
    try {
      const statementValidation = this.validateStatementUsage();
      if (statementValidation.isErr()) {
        return err(new ConsistencyError(statementValidation.error.message));
      }

      const argumentValidation = this.validateArgumentConnections();
      if (argumentValidation.isErr()) {
        return err(new ConsistencyError(argumentValidation.error.message));
      }

      return ok(undefined);
    } catch (error) {
      return err(new ConsistencyError('Validation failed', error as Error));
    }
  }

  getUncommittedEvents(): readonly DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents.length = 0;
  }

  private createOrderedSet(statementIds: StatementId[]): Result<OrderedSetId, ValidationError> {
    const validStatementIds = statementIds.filter((id) => this.statements.has(id));

    if (validStatementIds.length !== statementIds.length) {
      return err(new ValidationError('Some statement IDs do not exist in this proof'));
    }

    const orderedSetResult = OrderedSet.createFromStatements(validStatementIds);
    if (orderedSetResult.isErr()) {
      return err(orderedSetResult.error);
    }

    const orderedSet = orderedSetResult.value;
    this.orderedSets.set(orderedSet.getId(), orderedSet);

    for (const statementId of validStatementIds) {
      const statement = this.statements.get(statementId);
      if (statement) {
        statement.incrementUsage();
      }
    }

    return ok(orderedSet.getId());
  }

  private validateStatementUsage(): Result<void, ValidationError> {
    for (const [statementId, statement] of this.statements) {
      let actualUsageCount = 0;

      for (const orderedSet of this.orderedSets.values()) {
        if (orderedSet.containsStatement(statementId)) {
          actualUsageCount++;
        }
      }

      if (statement.getUsageCount() !== actualUsageCount) {
        return err(
          new ValidationError(
            `Statement ${statementId.getValue()} usage count mismatch: expected ${actualUsageCount}, got ${statement.getUsageCount()}`,
          ),
        );
      }
    }

    return ok(undefined);
  }

  private validateArgumentConnections(): Result<void, ValidationError> {
    for (const argument of this.argumentsMap.values()) {
      const premiseSet = argument.getPremiseSet();
      const conclusionSet = argument.getConclusionSet();

      if (premiseSet) {
        // Check if the ordered set exists by comparing ID values
        let found = false;
        for (const [osId, _os] of this.orderedSets) {
          if (osId.getValue() === premiseSet.getValue()) {
            found = true;
            break;
          }
        }
        if (!found) {
          return err(
            new ValidationError(
              `Argument ${argument.getId().getValue()} references non-existent premise set`,
            ),
          );
        }
      }

      if (conclusionSet) {
        // Check if the ordered set exists by comparing ID values
        let found = false;
        for (const [osId, _os] of this.orderedSets) {
          if (osId.getValue() === conclusionSet.getValue()) {
            found = true;
            break;
          }
        }
        if (!found) {
          return err(
            new ValidationError(
              `Argument ${argument.getId().getValue()} references non-existent conclusion set`,
            ),
          );
        }
      }
    }

    return ok(undefined);
  }

  private incrementVersion(): void {
    this.version++;
  }
}
