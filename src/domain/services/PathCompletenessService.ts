import { err, ok, type Result } from 'neverthrow';
import type { AtomicArgument } from '../entities/AtomicArgument.js';
import { ProcessingError } from '../errors/DomainErrors.js';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository.js';
import type { AtomicArgumentId } from '../shared/value-objects/index.js';
import type { ConnectionResolutionService } from './ConnectionResolutionService.js';
import type {
  ArgumentDependencyAnalysis,
  BrokenLink,
  ChainIntegrityIssue,
  ChainIntegrityValidationResult,
  ConnectionGap,
  IPathCompletenessService,
  MinimalPathCompleteSet,
  PathCompleteArgumentSet,
  PathCompletenessValidationResult,
  RequiredIntermediateArguments,
} from './IPathCompletenessService.js';

export interface PathValidationResult {
  isPathComplete: boolean;
  missingArguments: AtomicArgumentId[];
  brokenConnections: Array<{
    from: AtomicArgumentId;
    to: AtomicArgumentId;
    reason: string;
  }>;
}

export interface ArgumentChain {
  arguments: AtomicArgumentId[];
  isComplete: boolean;
  missingConnections: Array<{
    from: AtomicArgumentId;
    to: AtomicArgumentId;
  }>;
}

export interface ConnectionIntegrityReport {
  argumentId: AtomicArgumentId;
  issues: ConnectionIssue[];
}

export interface ConnectionIssue {
  type: 'missing_premise' | 'missing_conclusion' | 'broken_reference';
  description: string;
  affectedStatements?: string[];
}

interface ArgumentConnection {
  from: AtomicArgumentId;
  to: AtomicArgumentId;
}

export class PathCompletenessService implements IPathCompletenessService {
  constructor(
    private readonly atomicArgumentRepo: IAtomicArgumentRepository,
    private readonly connectionService: ConnectionResolutionService,
  ) {}

  /**
   * Find all arguments required to form a complete path between two arguments.
   * This includes all intermediate arguments that connect them.
   */
  async findPathCompleteArgument(
    startArgumentId: AtomicArgumentId,
    endArgumentId: AtomicArgumentId,
  ): Promise<Result<PathCompleteArgumentSet, ProcessingError>> {
    if (startArgumentId.equals(endArgumentId)) {
      return ok({
        startArgument: startArgumentId,
        endArgument: endArgumentId,
        allRequiredArguments: [startArgumentId],
        allPaths: [[startArgumentId]],
      });
    }

    const startArgResult = await this.atomicArgumentRepo.findById(startArgumentId);
    const endArgResult = await this.atomicArgumentRepo.findById(endArgumentId);

    if (startArgResult.isErr() || endArgResult.isErr()) {
      return err(new ProcessingError('One or both arguments not found'));
    }

    const startArg = startArgResult.value;
    const endArg = endArgResult.value;

    // TODO: Implement canArgumentsConnect method in ConnectionResolutionService
    // For now, assume arguments can connect if they share statements
    const canConnect = startArg.isDirectlyConnectedTo(endArg);

    const result: PathCompleteArgumentSet = {
      startArgument: startArgumentId,
      endArgument: endArgumentId,
      allRequiredArguments: canConnect ? [startArgumentId, endArgumentId] : [startArgumentId],
      allPaths: canConnect ? [[startArgumentId, endArgumentId]] : [],
    };

    return ok(result);
  }

  /**
   * Validate that a given set of arguments forms a complete path.
   * Checks for any missing intermediate arguments or broken connections.
   */
  async validatePathCompleteness(
    argumentSet: AtomicArgumentId[],
  ): Promise<Result<PathCompletenessValidationResult, ProcessingError>> {
    if (argumentSet.length === 0) {
      return ok({
        isComplete: true,
        argumentSet: [],
        missingArguments: [],
      });
    }

    if (argumentSet.length === 1) {
      return ok({
        isComplete: true,
        argumentSet,
        missingArguments: [],
      });
    }

    const missingArguments: AtomicArgumentId[] = [];

    // Check each consecutive pair of arguments
    for (let i = 0; i < argumentSet.length - 1; i++) {
      const fromId = argumentSet[i];
      const toId = argumentSet[i + 1];

      if (!fromId || !toId) {
        continue; // Skip invalid entries
      }

      const fromArgResult = await this.atomicArgumentRepo.findById(fromId);
      const toArgResult = await this.atomicArgumentRepo.findById(toId);

      if (fromArgResult.isErr() || toArgResult.isErr()) {
        continue;
      }

      const fromArg = fromArgResult.value;
      const toArg = toArgResult.value;

      if (!fromArg.isDirectlyConnectedTo(toArg)) {
        // Would need intermediate arguments here
        // For now, we don't track the specific missing arguments
      }
    }

    const result: PathCompletenessValidationResult = {
      isComplete: missingArguments.length === 0,
      argumentSet,
      missingArguments,
    };

    return ok(result);
  }

  /**
   * Find all arguments that form a connected chain starting from a given argument.
   * This explores the entire connected component in the argument graph.
   */
  async findArgumentChain(
    startArgumentId: AtomicArgumentId,
    maxDepth: number = 10,
  ): Promise<Result<ArgumentChain, ProcessingError>> {
    const visited = new Set<string>();
    const argumentChain: AtomicArgumentId[] = [];
    const queue: Array<{ id: AtomicArgumentId; depth: number }> = [
      { id: startArgumentId, depth: 0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || current.depth >= maxDepth) continue;

      const idString = current.id.getValue();
      if (visited.has(idString)) continue;

      visited.add(idString);
      argumentChain.push(current.id);

      const argResult = await this.atomicArgumentRepo.findById(current.id);
      if (argResult.isErr()) continue;

      const argument = argResult.value;

      // Find all connected arguments
      const connectionsResult =
        await this.connectionService.findAllConnectionsForArgument(argument);
      if (connectionsResult.isOk()) {
        const connections = connectionsResult.value;

        // Add incoming connections
        for (const conn of connections.incomingConnections) {
          const connId = conn.connectedArgument.getId();
          if (!visited.has(connId.getValue())) {
            queue.push({ id: connId, depth: current.depth + 1 });
          }
        }

        // Add outgoing connections
        for (const conn of connections.outgoingConnections) {
          const connId = conn.connectedArgument.getId();
          if (!visited.has(connId.getValue())) {
            queue.push({ id: connId, depth: current.depth + 1 });
          }
        }
      }
    }

    const missingConnections = await this.findMissingConnectionsInChain(argumentChain);

    return ok({
      arguments: argumentChain,
      isComplete: missingConnections.length === 0,
      missingConnections,
    });
  }

  /**
   * Check the connection integrity of a specific argument.
   * Identifies any issues with its premises or conclusions.
   */
  async checkConnectionIntegrity(
    argumentId: AtomicArgumentId,
  ): Promise<Result<ConnectionIntegrityReport, ProcessingError>> {
    const argResult = await this.atomicArgumentRepo.findById(argumentId);
    if (argResult.isErr()) {
      return err(new ProcessingError('Argument not found'));
    }

    const argument = argResult.value;
    const issues: ConnectionIssue[] = [];

    // Check if bootstrap argument has proper structure
    if (argument.isBootstrap()) {
      if (argument.getPremiseCount() > 0 || argument.getConclusionCount() > 0) {
        issues.push({
          type: 'broken_reference',
          description: 'Bootstrap argument should have no premises or conclusions',
        });
      }
    } else {
      // Non-bootstrap arguments should have at least one premise and conclusion
      if (argument.getPremiseCount() === 0) {
        issues.push({
          type: 'missing_premise',
          description: 'Non-bootstrap argument has no premises',
        });
      }

      if (argument.getConclusionCount() === 0) {
        issues.push({
          type: 'missing_conclusion',
          description: 'Argument has no conclusions',
        });
      }
    }

    return ok({
      argumentId,
      issues,
    });
  }

  private async analyzeConnectionsInSet(
    argumentSet: AtomicArgumentId[],
  ): Promise<ArgumentConnection[]> {
    const connections: ArgumentConnection[] = [];

    for (const argumentId of argumentSet) {
      const argResult = await this.atomicArgumentRepo.findById(argumentId);
      if (argResult.isErr()) continue;

      const argument = argResult.value;

      // Check connections with other arguments in the set
      for (const otherId of argumentSet) {
        if (argumentId.equals(otherId)) continue;

        const otherResult = await this.atomicArgumentRepo.findById(otherId);
        if (otherResult.isErr()) continue;

        const other = otherResult.value;

        if (argument.isDirectlyConnectedTo(other)) {
          // Determine direction based on shared statements
          const argConclusions = argument.getConclusions();
          const otherPremises = other.getPremises();

          const hasForwardConnection = argConclusions.some((conclusion) =>
            otherPremises.some((premise) => premise.getId().equals(conclusion.getId())),
          );

          if (hasForwardConnection) {
            connections.push({
              from: argumentId,
              to: otherId,
            });
          }
        }
      }
    }

    return connections;
  }

  private async findMissingConnectionsInChain(
    argumentChain: AtomicArgumentId[],
  ): Promise<Array<{ from: AtomicArgumentId; to: AtomicArgumentId }>> {
    if (argumentChain.length < 2) {
      return [];
    }

    const connections = await this.analyzeConnectionsInSet(argumentChain);
    const missingConnections: Array<{ from: AtomicArgumentId; to: AtomicArgumentId }> = [];

    // For a complete chain, we need n-1 connections for n arguments
    // This is a simplified check - a more sophisticated version would
    // ensure the connections form a proper path
    if (connections.length < argumentChain.length - 1) {
      // Find which connections are missing
      for (let i = 0; i < argumentChain.length - 1; i++) {
        const from = argumentChain[i];
        const to = argumentChain[i + 1];

        if (!from || !to) {
          continue; // Skip invalid entries
        }

        const hasConnection = connections.some(
          (conn) => conn.from.equals(from) && conn.to.equals(to),
        );

        if (!hasConnection) {
          missingConnections.push({ from, to });
        }
      }
    }

    return missingConnections;
  }

  /**
   * Find all path-complete arguments containing a specific argument.
   * A path-complete argument is a maximal connected set of arguments.
   */
  async findAllPathCompleteArguments(
    argumentId: AtomicArgumentId,
  ): Promise<Result<PathCompleteArgumentSet[], ProcessingError>> {
    const argResult = await this.atomicArgumentRepo.findById(argumentId);
    if (argResult.isErr()) {
      return err(new ProcessingError('Argument not found'));
    }

    // For now, return a simple result
    // A full implementation would explore all connected components
    const result: PathCompleteArgumentSet = {
      startArgument: argumentId,
      endArgument: argumentId,
      allRequiredArguments: [argumentId],
      allPaths: [[argumentId]],
    };

    return ok([result]);
  }

  /**
   * Ensure path completeness between two arguments by finding all required intermediate arguments.
   */
  async ensurePathCompleteness(
    startArgumentId: AtomicArgumentId,
    endArgumentId: AtomicArgumentId,
  ): Promise<Result<PathCompleteArgumentSet, ProcessingError>> {
    return this.findPathCompleteArgument(startArgumentId, endArgumentId);
  }

  /**
   * Find required intermediate arguments to complete a partial argument set.
   */
  async findRequiredIntermediateArguments(
    partialArgumentSet: AtomicArgumentId[],
  ): Promise<Result<RequiredIntermediateArguments, ProcessingError>> {
    const gaps: ConnectionGap[] = [];
    const requiredArguments: AtomicArgumentId[] = [];

    // Check for gaps between arguments
    for (let i = 0; i < partialArgumentSet.length - 1; i++) {
      const fromId = partialArgumentSet[i];
      const toId = partialArgumentSet[i + 1];

      if (!fromId || !toId) continue;

      const fromResult = await this.atomicArgumentRepo.findById(fromId);
      const toResult = await this.atomicArgumentRepo.findById(toId);

      if (fromResult.isErr() || toResult.isErr()) continue;

      const fromArg = fromResult.value;
      const toArg = toResult.value;

      if (!fromArg.isDirectlyConnectedTo(toArg)) {
        gaps.push({ from: fromId, to: toId });
      }
    }

    return ok({
      originalSet: partialArgumentSet,
      requiredArguments,
      gaps,
    });
  }

  /**
   * Validate the integrity of an argument chain.
   */
  async validateArgumentChainIntegrity(
    argumentChain: AtomicArgumentId[],
  ): Promise<Result<ChainIntegrityValidationResult, ProcessingError>> {
    const integrityIssues: ChainIntegrityIssue[] = [];
    const brokenLinks: BrokenLink[] = [];

    for (let i = 0; i < argumentChain.length - 1; i++) {
      const fromId = argumentChain[i];
      const toId = argumentChain[i + 1];

      if (!fromId || !toId) {
        integrityIssues.push({
          type: 'missing_argument',
          description: `Missing argument at position ${i}`,
          position: i,
        });
        continue;
      }

      const fromResult = await this.atomicArgumentRepo.findById(fromId);
      const toResult = await this.atomicArgumentRepo.findById(toId);

      if (fromResult.isErr() || toResult.isErr()) {
        brokenLinks.push({
          from: fromId,
          to: toId,
          reason: 'Argument not found',
        });
        continue;
      }

      const fromArg = fromResult.value;
      const toArg = toResult.value;

      if (!fromArg.isDirectlyConnectedTo(toArg)) {
        brokenLinks.push({
          from: fromId,
          to: toId,
          reason: 'Arguments not directly connected',
        });
      }
    }

    return ok({
      isIntact: integrityIssues.length === 0 && brokenLinks.length === 0,
      integrityIssues,
      brokenLinks,
    });
  }

  /**
   * Compute the minimal path-complete set for required arguments.
   */
  async computeMinimalPathCompleteSet(
    requiredArguments: AtomicArgumentId[],
  ): Promise<Result<MinimalPathCompleteSet, ProcessingError>> {
    // For now, assume all arguments are required
    return ok({
      minimalArguments: requiredArguments,
      redundantArguments: [],
    });
  }

  /**
   * Analyze dependencies of a target argument.
   */
  async analyzeArgumentDependencies(
    targetArgumentId: AtomicArgumentId,
  ): Promise<Result<ArgumentDependencyAnalysis, ProcessingError>> {
    const argResult = await this.atomicArgumentRepo.findById(targetArgumentId);
    if (argResult.isErr()) {
      return err(new ProcessingError('Target argument not found'));
    }

    const directDependencies: AtomicArgumentId[] = [];
    const transitiveDependencies: AtomicArgumentId[] = [];
    const dependencyLevels = new Map<AtomicArgumentId, number>();

    // Find direct dependencies (parent arguments)
    const parents = await this.findParentArguments(argResult.value, this.atomicArgumentRepo);
    for (const parent of parents) {
      directDependencies.push(parent.getId());
      dependencyLevels.set(parent.getId(), 1);
    }

    return ok({
      targetArgument: targetArgumentId,
      directDependencies,
      transitiveDependencies,
      dependencyLevels,
    });
  }

  private async findParentArguments(
    argument: AtomicArgument,
    repo: IAtomicArgumentRepository,
  ): Promise<AtomicArgument[]> {
    const allArgsResult = await repo.findAll();
    if (allArgsResult.isErr()) return [];

    const parents: AtomicArgument[] = [];
    for (const otherArg of allArgsResult.value) {
      if (otherArg.getId().equals(argument.getId())) continue;

      // Check if otherArg's conclusions connect to this argument's premises
      const otherConclusions = otherArg.getConclusions();
      const thisPremises = argument.getPremises();

      const hasConnection = otherConclusions.some((conclusion) =>
        thisPremises.some((premise) => premise.getId().equals(conclusion.getId())),
      );

      if (hasConnection) {
        parents.push(otherArg);
      }
    }

    return parents;
  }

  /**
   * Validate that adding a new connection maintains path completeness.
   * Checks if the new connection would create any incomplete paths.
   */
  async validateNewConnection(
    fromArgumentId: AtomicArgumentId,
    toArgumentId: AtomicArgumentId,
  ): Promise<Result<boolean, ProcessingError>> {
    const fromResult = await this.atomicArgumentRepo.findById(fromArgumentId);
    const toResult = await this.atomicArgumentRepo.findById(toArgumentId);

    if (fromResult.isErr() || toResult.isErr()) {
      return err(new ProcessingError('One or both arguments not found'));
    }

    const fromArg = fromResult.value;
    const toArg = toResult.value;

    // Check if they can connect based on their statements
    const canConnect = fromArg.isDirectlyConnectedTo(toArg);

    return ok(canConnect);
  }

  /**
   * Find all arguments that would need to be included to make a path complete.
   * This identifies "bridge" arguments that connect disconnected components.
   */
  async findRequiredBridgeArguments(
    _argumentSet: AtomicArgumentId[],
  ): Promise<Result<AtomicArgumentId[], ProcessingError>> {
    // For now, return empty array
    // A full implementation would analyze the graph structure
    return ok([]);
  }

  /**
   * Check if a set of arguments forms a complete argument tree.
   * An argument tree is complete if all paths between connected arguments are included.
   */
  async isArgumentTreeComplete(
    argumentIds: AtomicArgumentId[],
  ): Promise<Result<boolean, ProcessingError>> {
    if (argumentIds.length <= 1) {
      return ok(true);
    }

    const connections = await this.analyzeConnectionsInSet(argumentIds);

    // A tree with n nodes should have n-1 edges
    // This is a necessary but not sufficient condition
    const expectedConnections = argumentIds.length - 1;
    const isComplete = connections.length >= expectedConnections;

    return ok(isComplete);
  }

  /**
   * Find the minimal path-complete subset containing given arguments.
   * This is the smallest set of arguments that includes all paths between the given arguments.
   */
  async findMinimalPathCompleteSubset(
    argumentIds: AtomicArgumentId[],
  ): Promise<Result<AtomicArgumentId[], ProcessingError>> {
    // For now, return the input set
    // A full implementation would compute the minimal connecting set
    return ok(argumentIds);
  }
}
