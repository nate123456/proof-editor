import { err, ok, type Result } from 'neverthrow';

import type { AtomicArgument } from '../entities/AtomicArgument';
import type { Statement } from '../entities/Statement';
import type { ProcessingError } from '../errors/DomainErrors';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository';
import type { IStatementRepository } from '../repositories/IStatementRepository';
import type { AtomicArgumentId } from '../shared/value-objects/index.js';

export interface StatementConnection {
  connectedArgument: AtomicArgument;
  statement: Statement;
  fromPosition: number;
  toPosition: number;
  direction: 'incoming' | 'outgoing';
}

export interface ArgumentConnections {
  incomingConnections: StatementConnection[];
  outgoingConnections: StatementConnection[];
}

export class ConnectionResolutionService {
  constructor(
    private readonly atomicArgumentRepo: IAtomicArgumentRepository,
    private readonly statementRepo: IStatementRepository,
  ) {}

  async findArgumentsConnectedToPremises(
    argument: AtomicArgument,
  ): Promise<Result<StatementConnection[], ProcessingError>> {
    const connections: StatementConnection[] = [];
    const premises = argument.getPremises();

    if (premises.length === 0) {
      return ok(connections);
    }

    for (const premise of premises) {
      const premisePos = premises.indexOf(premise);
      const argumentsUsingStatement = await this.atomicArgumentRepo.findArgumentsUsingStatement(
        premise.getId(),
      );

      for (const otherArg of argumentsUsingStatement) {
        if (otherArg.equals(argument)) {
          continue;
        }

        const otherConclusions = otherArg.getConclusions();
        otherConclusions.forEach((conclusion, conclusionPos) => {
          if (premise.equals(conclusion)) {
            connections.push({
              connectedArgument: otherArg,
              statement: premise,
              fromPosition: conclusionPos,
              toPosition: premisePos,
              direction: 'incoming',
            });
          }
        });
      }
    }

    return ok(connections);
  }

  async findArgumentsConnectedToConclusions(
    argument: AtomicArgument,
  ): Promise<Result<StatementConnection[], ProcessingError>> {
    const connections: StatementConnection[] = [];
    const conclusions = argument.getConclusions();

    if (conclusions.length === 0) {
      return ok(connections);
    }

    for (const conclusion of conclusions) {
      const conclusionPos = conclusions.indexOf(conclusion);
      const argumentsUsingStatement = await this.atomicArgumentRepo.findArgumentsUsingStatement(
        conclusion.getId(),
      );

      for (const otherArg of argumentsUsingStatement) {
        if (otherArg.equals(argument)) {
          continue;
        }

        const otherPremises = otherArg.getPremises();
        otherPremises.forEach((premise, premisePos) => {
          if (conclusion.equals(premise)) {
            connections.push({
              connectedArgument: otherArg,
              statement: conclusion,
              fromPosition: conclusionPos,
              toPosition: premisePos,
              direction: 'outgoing',
            });
          }
        });
      }
    }

    return ok(connections);
  }

  async findAllConnectionsForArgument(
    argument: AtomicArgument,
  ): Promise<Result<ArgumentConnections, ProcessingError>> {
    const incomingResult = await this.findArgumentsConnectedToPremises(argument);
    if (incomingResult.isErr()) {
      return err(incomingResult.error);
    }

    const outgoingResult = await this.findArgumentsConnectedToConclusions(argument);
    if (outgoingResult.isErr()) {
      return err(outgoingResult.error);
    }

    return ok({
      incomingConnections: incomingResult.value,
      outgoingConnections: outgoingResult.value,
    });
  }

  async canArgumentsConnect(
    sourceArg: AtomicArgument,
    targetArg: AtomicArgument,
  ): Promise<Result<boolean, ProcessingError>> {
    if (sourceArg.equals(targetArg)) {
      return ok(false);
    }

    const sourceConclusions = sourceArg.getConclusions();
    const targetPremises = targetArg.getPremises();

    if (sourceConclusions.length === 0 || targetPremises.length === 0) {
      return ok(false);
    }

    for (const conclusion of sourceConclusions) {
      for (const premise of targetPremises) {
        if (conclusion.equals(premise)) {
          return ok(true);
        }
      }
    }

    return ok(false);
  }

  async findArgumentsConnectedToStatement(
    statement: Statement,
  ): Promise<Result<AtomicArgument[], ProcessingError>> {
    const connectedArguments = await this.atomicArgumentRepo.findArgumentsUsingStatement(
      statement.getId(),
    );

    return ok(connectedArguments);
  }

  async findStatementConnectionsInArgument(
    argument: AtomicArgument,
    statement: Statement,
  ): Promise<
    Result<{ premisePositions: number[]; conclusionPositions: number[] }, ProcessingError>
  > {
    const premises = argument.getPremises();
    const conclusions = argument.getConclusions();

    const premisePositions: number[] = [];
    const conclusionPositions: number[] = [];

    premises.forEach((premise, index) => {
      if (premise.equals(statement)) {
        premisePositions.push(index);
      }
    });

    conclusions.forEach((conclusion, index) => {
      if (conclusion.equals(statement)) {
        conclusionPositions.push(index);
      }
    });

    return ok({ premisePositions, conclusionPositions });
  }

  async findConnectedArgumentPairs(): Promise<
    Result<
      Array<{ source: AtomicArgument; target: AtomicArgument; connections: StatementConnection[] }>,
      ProcessingError
    >
  > {
    const connectedPairs: Array<{
      source: AtomicArgument;
      target: AtomicArgument;
      connections: StatementConnection[];
    }> = [];

    // Get all statements to find connected arguments efficiently
    const allStatements = await this.statementRepo.findAll();
    const processedPairs = new Set<string>();

    for (const statement of allStatements) {
      const argumentsUsingStatement = await this.atomicArgumentRepo.findArgumentsUsingStatement(
        statement.getId(),
      );

      // Find connections between arguments that use the same statement
      for (let i = 0; i < argumentsUsingStatement.length; i++) {
        for (let j = i + 1; j < argumentsUsingStatement.length; j++) {
          const sourceArg = argumentsUsingStatement[i];
          const targetArg = argumentsUsingStatement[j];

          const pairKey1 = `${sourceArg.getId().getValue()}-${targetArg.getId().getValue()}`;
          const pairKey2 = `${targetArg.getId().getValue()}-${sourceArg.getId().getValue()}`;

          if (processedPairs.has(pairKey1) || processedPairs.has(pairKey2)) {
            continue;
          }

          const sourceToTargetConnections = sourceArg.findConnectionsTo(targetArg);
          const targetToSourceConnections = targetArg.findConnectionsTo(sourceArg);

          if (sourceToTargetConnections.length > 0) {
            connectedPairs.push({
              source: sourceArg,
              target: targetArg,
              connections: sourceToTargetConnections.map((conn) => ({
                connectedArgument: targetArg,
                statement: conn.statement,
                fromPosition: conn.fromConclusionPosition,
                toPosition: conn.toPremisePosition,
                direction: 'outgoing' as const,
              })),
            });
            processedPairs.add(pairKey1);
          }

          if (targetToSourceConnections.length > 0) {
            connectedPairs.push({
              source: targetArg,
              target: sourceArg,
              connections: targetToSourceConnections.map((conn) => ({
                connectedArgument: sourceArg,
                statement: conn.statement,
                fromPosition: conn.fromConclusionPosition,
                toPosition: conn.toPremisePosition,
                direction: 'outgoing' as const,
              })),
            });
            processedPairs.add(pairKey2);
          }
        }
      }
    }

    return ok(connectedPairs);
  }

  async validateArgumentConnections(
    argument: AtomicArgument,
  ): Promise<Result<ConnectionValidationResult, ProcessingError>> {
    const connectionsResult = await this.findAllConnectionsForArgument(argument);
    if (connectionsResult.isErr()) {
      return err(connectionsResult.error);
    }

    const { incomingConnections, outgoingConnections } = connectionsResult.value;
    const issues: ConnectionValidationIssue[] = [];

    const incomingCount = incomingConnections.length;
    const outgoingCount = outgoingConnections.length;

    if (incomingCount === 0 && outgoingCount === 0 && !argument.isBootstrap()) {
      issues.push({
        type: 'isolated',
        description: 'Argument has no connections to other arguments',
        severity: 'warning',
      });
    }

    const duplicateIncoming = this.findDuplicateConnections(incomingConnections);
    const duplicateOutgoing = this.findDuplicateConnections(outgoingConnections);

    if (duplicateIncoming.length > 0) {
      issues.push({
        type: 'duplicate_incoming',
        description: `Found ${duplicateIncoming.length} duplicate incoming connections`,
        severity: 'error',
      });
    }

    if (duplicateOutgoing.length > 0) {
      issues.push({
        type: 'duplicate_outgoing',
        description: `Found ${duplicateOutgoing.length} duplicate outgoing connections`,
        severity: 'error',
      });
    }

    return ok({
      argumentId: argument.getId(),
      incomingConnectionCount: incomingCount,
      outgoingConnectionCount: outgoingCount,
      issues,
      isValid: issues.filter((issue) => issue.severity === 'error').length === 0,
    });
  }

  private findDuplicateConnections(connections: StatementConnection[]): StatementConnection[] {
    const seen = new Set<string>();
    const duplicates: StatementConnection[] = [];

    for (const connection of connections) {
      const key = `${connection.connectedArgument.getId().getValue()}-${connection.statement.getId().getValue()}-${connection.fromPosition}-${connection.toPosition}`;

      if (seen.has(key)) {
        duplicates.push(connection);
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  }
}

export interface ConnectionValidationIssue {
  type: 'isolated' | 'duplicate_incoming' | 'duplicate_outgoing' | 'circular' | 'orphaned';
  description: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ConnectionValidationResult {
  argumentId: AtomicArgumentId;
  incomingConnectionCount: number;
  outgoingConnectionCount: number;
  issues: ConnectionValidationIssue[];
  isValid: boolean;
}
