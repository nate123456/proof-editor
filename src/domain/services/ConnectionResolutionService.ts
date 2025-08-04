import { err, ok, type Result } from 'neverthrow';

import type { AtomicArgument } from '../entities/AtomicArgument';
import type { Statement } from '../entities/Statement';
import { ProcessingError } from '../errors/DomainErrors';
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
      const argumentsResult = await this.atomicArgumentRepo.findArgumentsUsingStatement(
        premise.getId(),
      );

      if (argumentsResult.isErr()) {
        return err(
          new ProcessingError(
            `Failed to find arguments using statement: ${argumentsResult.error.message}`,
          ),
        );
      }

      for (const otherArg of argumentsResult.value) {
        if (otherArg.getId().equals(argument.getId())) {
          continue;
        }

        const otherConclusions = otherArg.getConclusions();
        otherConclusions.forEach((conclusion, conclusionPos) => {
          if (premise.getId().equals(conclusion.getId())) {
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
      const argumentsResult = await this.atomicArgumentRepo.findArgumentsUsingStatement(
        conclusion.getId(),
      );

      if (argumentsResult.isErr()) {
        return err(
          new ProcessingError(
            `Failed to find arguments using statement: ${argumentsResult.error.message}`,
          ),
        );
      }

      for (const otherArg of argumentsResult.value) {
        if (otherArg.getId().equals(argument.getId())) {
          continue;
        }

        const otherPremises = otherArg.getPremises();
        otherPremises.forEach((premise, premisePos) => {
          if (conclusion.getId().equals(premise.getId())) {
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

  async countConnectionsForArgument(
    argument: AtomicArgument,
  ): Promise<Result<{ incoming: number; outgoing: number }, ProcessingError>> {
    const connectionsResult = await this.findAllConnectionsForArgument(argument);
    if (connectionsResult.isErr()) {
      return err(connectionsResult.error);
    }

    const connections = connectionsResult.value;
    return ok({
      incoming: connections.incomingConnections.length,
      outgoing: connections.outgoingConnections.length,
    });
  }

  async findPotentialProviders(
    argumentId: AtomicArgumentId,
  ): Promise<Result<AtomicArgument[], ProcessingError>> {
    const argumentResult = await this.atomicArgumentRepo.findById(argumentId);
    if (argumentResult.isErr()) {
      return err(new ProcessingError(`Failed to get argument: ${argumentResult.error.message}`));
    }

    const argument = argumentResult.value;
    const premises = argument.getPremises();
    const providers: AtomicArgument[] = [];

    for (const premise of premises) {
      const candidatesResult = await this.atomicArgumentRepo.findArgumentsUsingStatement(
        premise.getId(),
      );

      if (candidatesResult.isErr()) {
        return err(
          new ProcessingError(`Failed to find candidates: ${candidatesResult.error.message}`),
        );
      }

      for (const candidate of candidatesResult.value) {
        if (candidate.getId().equals(argumentId)) {
          continue;
        }

        // Check if this candidate provides the premise as a conclusion
        const hasAsPremise = candidate
          .getConclusions()
          .some((conclusion) => conclusion.getId().equals(premise.getId()));

        if (hasAsPremise && !providers.some((p) => p.getId().equals(candidate.getId()))) {
          providers.push(candidate);
        }
      }
    }

    return ok(providers);
  }

  async findPotentialConsumers(
    argumentId: AtomicArgumentId,
  ): Promise<Result<AtomicArgument[], ProcessingError>> {
    const argumentResult = await this.atomicArgumentRepo.findById(argumentId);
    if (argumentResult.isErr()) {
      return err(new ProcessingError(`Failed to get argument: ${argumentResult.error.message}`));
    }

    const argument = argumentResult.value;
    const conclusions = argument.getConclusions();
    const consumers: AtomicArgument[] = [];

    for (const conclusion of conclusions) {
      const candidatesResult = await this.atomicArgumentRepo.findArgumentsUsingStatement(
        conclusion.getId(),
      );

      if (candidatesResult.isErr()) {
        return err(
          new ProcessingError(`Failed to find candidates: ${candidatesResult.error.message}`),
        );
      }

      for (const candidate of candidatesResult.value) {
        if (candidate.getId().equals(argumentId)) {
          continue;
        }

        // Check if this candidate uses the conclusion as a premise
        const hasAsPremise = candidate
          .getPremises()
          .some((premise) => premise.getId().equals(conclusion.getId()));

        if (hasAsPremise && !consumers.some((c) => c.getId().equals(candidate.getId()))) {
          consumers.push(candidate);
        }
      }
    }

    return ok(consumers);
  }

  async findCommonConnections(
    arg1: AtomicArgument,
    arg2: AtomicArgument,
  ): Promise<
    Result<
      { sharedProviders: AtomicArgument[]; sharedConsumers: AtomicArgument[] },
      ProcessingError
    >
  > {
    const providers1Result = await this.findPotentialProviders(arg1.getId());
    if (providers1Result.isErr()) {
      return err(providers1Result.error);
    }

    const providers2Result = await this.findPotentialProviders(arg2.getId());
    if (providers2Result.isErr()) {
      return err(providers2Result.error);
    }

    const consumers1Result = await this.findPotentialConsumers(arg1.getId());
    if (consumers1Result.isErr()) {
      return err(consumers1Result.error);
    }

    const consumers2Result = await this.findPotentialConsumers(arg2.getId());
    if (consumers2Result.isErr()) {
      return err(consumers2Result.error);
    }

    const sharedProviders = providers1Result.value.filter((p1) =>
      providers2Result.value.some((p2) => p1.getId().equals(p2.getId())),
    );

    const sharedConsumers = consumers1Result.value.filter((c1) =>
      consumers2Result.value.some((c2) => c1.getId().equals(c2.getId())),
    );

    return ok({ sharedProviders, sharedConsumers });
  }
}
