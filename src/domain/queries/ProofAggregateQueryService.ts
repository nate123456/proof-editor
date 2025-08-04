import { err, ok, type Result } from 'neverthrow';
import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Statement } from '../entities/Statement.js';
import { ValidationError } from '../shared/result.js';
import type { AtomicArgumentId, ProofId, StatementId } from '../shared/value-objects/index.js';

export class ProofAggregateQueryService {
  constructor(
    private readonly id: ProofId,
    private readonly version: number,
    private readonly statements: ReadonlyMap<StatementId, Statement>,
    private readonly argumentsMap: ReadonlyMap<AtomicArgumentId, AtomicArgument>,
  ) {}

  getId(): ProofId {
    return this.id;
  }

  getVersion(): number {
    return this.version;
  }

  getStatements(): ReadonlyMap<StatementId, Statement> {
    return this.statements;
  }

  getArguments(): ReadonlyMap<AtomicArgumentId, AtomicArgument> {
    return this.argumentsMap;
  }

  getStatement(id: StatementId): Statement | null {
    return this.statements.get(id) || null;
  }

  getArgument(id: AtomicArgumentId): AtomicArgument | null {
    return this.argumentsMap.get(id) || null;
  }

  getAllStatements(): Statement[] {
    return Array.from(this.statements.values());
  }

  getAllArguments(): AtomicArgument[] {
    return Array.from(this.argumentsMap.values());
  }

  hasStatement(id: StatementId): boolean {
    return this.statements.has(id);
  }

  hasArgument(id: AtomicArgumentId): boolean {
    return this.argumentsMap.has(id);
  }

  getStatementCount(): number {
    return this.statements.size;
  }

  getArgumentCount(): number {
    return this.argumentsMap.size;
  }

  findArgumentsUsingStatement(statementId: StatementId): AtomicArgument[] {
    const usingArguments: AtomicArgument[] = [];

    for (const argument of this.argumentsMap.values()) {
      const isInPremises = argument.getPremises().some((s) => s.getId().equals(statementId));
      const isInConclusions = argument.getConclusions().some((s) => s.getId().equals(statementId));

      if (isInPremises || isInConclusions) {
        usingArguments.push(argument);
      }
    }

    return usingArguments;
  }

  isStatementInUse(statementId: StatementId): boolean {
    return this.findArgumentsUsingStatement(statementId).length > 0;
  }

  findConnectionsTo(targetArgumentId: AtomicArgumentId): Array<{
    sourceArgument: AtomicArgument;
    targetArgument: AtomicArgument;
    connections: Array<{ statement: Statement; fromConclusionPosition: number }>;
  }> {
    const targetArgument = this.argumentsMap.get(targetArgumentId);
    if (!targetArgument) {
      return [];
    }

    const connections: Array<{
      sourceArgument: AtomicArgument;
      targetArgument: AtomicArgument;
      connections: Array<{ statement: Statement; fromConclusionPosition: number }>;
    }> = [];

    for (const sourceArgument of this.argumentsMap.values()) {
      if (sourceArgument.getId().equals(targetArgumentId)) {
        continue;
      }

      const argumentConnections = sourceArgument.findConnectionsTo(targetArgument);
      if (argumentConnections.length > 0) {
        connections.push({
          sourceArgument,
          targetArgument,
          connections: argumentConnections,
        });
      }
    }

    return connections;
  }

  getOrderedSets(): ReadonlyMap<string, unknown> {
    const orderedSets = new Map<string, unknown>();
    let setCounter = 0;

    for (const argument of this.argumentsMap.values()) {
      if (argument.getPremiseCount() > 0) {
        orderedSets.set(`premise_set_${setCounter++}`, argument.getPremises());
      }
      if (argument.getConclusionCount() > 0) {
        orderedSets.set(`conclusion_set_${setCounter++}`, argument.getConclusions());
      }
    }

    return orderedSets;
  }

  validateConsistency(): Result<void, ValidationError> {
    for (const argument of this.argumentsMap.values()) {
      for (const premise of argument.getPremises()) {
        if (!this.statements.has(premise.getId())) {
          return err(
            new ValidationError(
              `Argument ${argument.getId().getValue()} references non-existent premise statement`,
            ),
          );
        }
      }
      for (const conclusion of argument.getConclusions()) {
        if (!this.statements.has(conclusion.getId())) {
          return err(
            new ValidationError(
              `Argument ${argument.getId().getValue()} references non-existent conclusion statement`,
            ),
          );
        }
      }
    }

    return ok(undefined);
  }
}
