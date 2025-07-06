import { err, ok, type Result } from 'neverthrow';
import { ProcessingError } from '../errors/DomainErrors';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository';
import type { AtomicArgumentId } from '../shared/value-objects.js';
import type { ConnectionResolutionService } from './ConnectionResolutionService';
import type {
  ArgumentConnection,
  ArgumentDependencyAnalysis,
  BrokenLink,
  ChainIntegrityIssue,
  ChainIntegrityValidationResult,
  ConnectedPair,
  ConnectionGap,
  IPathCompletenessService,
  MinimalPathCompleteSet,
  PathCompleteArgumentSet,
  PathCompletenessValidationResult,
  RequiredIntermediateArguments,
} from './IPathCompletenessService.js';

/**
 * @deprecated Most functionality has been moved to TreeEntity.
 * Use TreeEntity methods for tree-specific path completeness operations.
 * This service remains for cross-tree argument analysis only.
 */
export class PathCompletenessService implements IPathCompletenessService {
  constructor(
    private readonly atomicArgumentRepo: IAtomicArgumentRepository,
    private readonly connectionService: ConnectionResolutionService,
  ) {}

  /**
   * Validates path-completeness for arbitrary argument sets.
   * Use TreeEntity.validatePathCompleteness() for tree-specific validation.
   */
  async validatePathCompleteness(
    argumentSet: AtomicArgumentId[],
  ): Promise<Result<PathCompletenessValidationResult, ProcessingError>> {
    if (argumentSet.length === 0) {
      const result: PathCompletenessValidationResult = {
        isComplete: true,
        argumentSet: [],
        missingArguments: [],
      };
      return ok(result);
    }

    const connections = await this.analyzeConnectionsInSet(argumentSet);
    const missingArguments = await this.findMissingIntermediateArguments(argumentSet, connections);
    const isComplete = missingArguments.length === 0;

    const result: PathCompletenessValidationResult = {
      isComplete,
      argumentSet,
      missingArguments,
    };

    return ok(result);
  }

  /**
   * @deprecated Use TreeEntity methods for tree-specific path completeness.
   * This simplified implementation returns minimal structure for compatibility.
   */
  async ensurePathCompleteness(
    startArgumentId: AtomicArgumentId,
    endArgumentId: AtomicArgumentId,
  ): Promise<Result<PathCompleteArgumentSet, ProcessingError>> {
    const startArg = await this.atomicArgumentRepo.findById(startArgumentId);
    const endArg = await this.atomicArgumentRepo.findById(endArgumentId);

    if (!startArg || !endArg) {
      return err(new ProcessingError('One or both arguments not found'));
    }

    const canConnect = await this.connectionService.canArgumentsConnect(startArg, endArg);
    if (canConnect.isErr()) {
      return err(canConnect.error);
    }

    const result: PathCompleteArgumentSet = {
      startArgument: startArgumentId,
      endArgument: endArgumentId,
      allRequiredArguments: canConnect.value ? [startArgumentId, endArgumentId] : [startArgumentId],
      allPaths: canConnect.value ? [[startArgumentId, endArgumentId]] : [],
    };

    return ok(result);
  }

  /**
   * @deprecated Use TreeEntity.findRequiredIntermediateArguments() for tree-specific analysis.
   * This method remains for cross-tree argument analysis.
   */
  async findRequiredIntermediateArguments(
    partialArgumentSet: AtomicArgumentId[],
  ): Promise<Result<RequiredIntermediateArguments, ProcessingError>> {
    const connectedPairs = await this.identifyConnectedPairs(partialArgumentSet);
    const gaps = this.identifyConnectionGaps(connectedPairs);
    const requiredArguments = await this.resolveGapsToArguments(gaps);

    const result: RequiredIntermediateArguments = {
      originalSet: partialArgumentSet,
      requiredArguments,
      gaps,
    };

    return ok(result);
  }

  /**
   * @deprecated Use TreeEntity.validateArgumentChainIntegrity() for tree-specific validation.
   * This method remains for cross-tree chain analysis.
   */
  async validateArgumentChainIntegrity(
    argumentChain: AtomicArgumentId[],
  ): Promise<Result<ChainIntegrityValidationResult, ProcessingError>> {
    if (argumentChain.length < 2) {
      const result: ChainIntegrityValidationResult = {
        isIntact: true,
        integrityIssues: [],
        brokenLinks: [],
      };
      return ok(result);
    }

    const integrityIssues: ChainIntegrityIssue[] = [];
    const brokenLinks: BrokenLink[] = [];

    for (let i = 0; i < argumentChain.length - 1; i++) {
      const currentId = argumentChain[i];
      const nextId = argumentChain[i + 1];

      if (!currentId || !nextId) {
        return err(
          new ProcessingError(
            `Invalid argument chain: missing argument at position ${i} or ${i + 1}`,
          ),
        );
      }

      const linkValidation = await this.validateArgumentLink(currentId, nextId);
      if (!linkValidation.isValid) {
        const brokenLink: BrokenLink = {
          from: currentId,
          to: nextId,
          reason: linkValidation.reason ?? 'Unknown reason',
        };
        brokenLinks.push(brokenLink);

        const issue: ChainIntegrityIssue = {
          type: 'broken_link',
          description: `No direct connection between ${currentId.getValue()} and ${nextId.getValue()}`,
          position: i,
        };
        integrityIssues.push(issue);
      }
    }

    const isIntact = integrityIssues.length === 0;
    const result: ChainIntegrityValidationResult = {
      isIntact,
      integrityIssues,
      brokenLinks,
    };

    return ok(result);
  }

  /**
   * @deprecated Use TreeEntity.computeMinimalPathCompleteSet() for tree-specific optimization.
   * This method remains for cross-tree set analysis.
   */
  async computeMinimalPathCompleteSet(
    requiredArguments: AtomicArgumentId[],
  ): Promise<Result<MinimalPathCompleteSet, ProcessingError>> {
    if (requiredArguments.length === 0) {
      const result: MinimalPathCompleteSet = {
        minimalArguments: [],
        redundantArguments: [],
      };
      return ok(result);
    }

    const allConnections = await this.buildConnectionGraph(requiredArguments);
    const minimalSet = this.findMinimalSpanningArguments(requiredArguments, allConnections);
    const redundantArguments = requiredArguments.filter(
      (arg) => !minimalSet.some((minArg) => minArg.equals(arg)),
    );

    const result: MinimalPathCompleteSet = {
      minimalArguments: minimalSet,
      redundantArguments,
    };
    return ok(result);
  }

  /**
   * @deprecated Use TreeEntity.analyzeArgumentDependencies() for tree-specific dependency analysis.
   * This method remains for cross-tree dependency analysis.
   */
  async analyzeArgumentDependencies(
    targetArgumentId: AtomicArgumentId,
  ): Promise<Result<ArgumentDependencyAnalysis, ProcessingError>> {
    const directDependencies = await this.findDirectDependencies(targetArgumentId);
    const transitiveDependencies = await this.findTransitiveDependencies(targetArgumentId);
    const dependencyLevels = await this.computeDependencyLevels(targetArgumentId);

    const analysis: ArgumentDependencyAnalysis = {
      targetArgument: targetArgumentId,
      directDependencies,
      transitiveDependencies,
      dependencyLevels,
    };

    return ok(analysis);
  }

  private async analyzeConnectionsInSet(
    argumentSet: AtomicArgumentId[],
  ): Promise<ArgumentConnection[]> {
    const connections: ArgumentConnection[] = [];

    for (const argumentId of argumentSet) {
      const argument = await this.atomicArgumentRepo.findById(argumentId);
      if (!argument) continue;

      const connectionsResult = await this.connectionService.findDirectConnections(argumentId);
      if (connectionsResult.isErr()) continue;

      const connectionMap = connectionsResult.value;

      for (const parent of connectionMap.getParents()) {
        if (argumentSet.some((id) => id.equals(parent.getId()))) {
          connections.push({
            from: parent.getId(),
            to: argumentId,
            type: 'direct',
          });
        }
      }
    }

    return connections;
  }

  private async findMissingIntermediateArguments(
    argumentSet: AtomicArgumentId[],
    connections: ArgumentConnection[],
  ): Promise<AtomicArgumentId[]> {
    const missing: AtomicArgumentId[] = [];
    const connectedPairs = new Set<string>();

    connections.forEach((conn) => {
      connectedPairs.add(`${conn.from.getValue()}->${conn.to.getValue()}`);
    });

    for (let i = 0; i < argumentSet.length - 1; i++) {
      for (let j = i + 1; j < argumentSet.length; j++) {
        const fromId = argumentSet[i];
        const toId = argumentSet[j];

        if (!fromId || !toId) {
          continue;
        }

        const pairKey = `${fromId.getValue()}->${toId.getValue()}`;

        if (!connectedPairs.has(pairKey)) {
          const pathResult = await this.connectionService.findPathCompleteArgument(fromId, toId);
          if (pathResult.isOk()) {
            const intermediatePaths = pathResult.value.getAllArguments();
            for (const intermediate of intermediatePaths) {
              if (
                !argumentSet.some((id) => id.equals(intermediate)) &&
                !missing.some((id) => id.equals(intermediate))
              ) {
                missing.push(intermediate);
              }
            }
          }
        }
      }
    }

    return missing;
  }

  private async validateAllIntermediateSteps(
    argumentIds: AtomicArgumentId[],
  ): Promise<Result<void, ProcessingError>> {
    for (const argumentId of argumentIds) {
      const argument = await this.atomicArgumentRepo.findById(argumentId);
      if (!argument) {
        return err(new ProcessingError(`Argument ${argumentId.getValue()} not found`));
      }

      if (!argument.isComplete()) {
        return err(new ProcessingError(`Argument ${argumentId.getValue()} is incomplete`));
      }
    }

    return ok(undefined);
  }

  private async identifyConnectedPairs(argumentSet: AtomicArgumentId[]): Promise<ConnectedPair[]> {
    const pairs: ConnectedPair[] = [];

    for (const argumentId of argumentSet) {
      const connectionsResult = await this.connectionService.findDirectConnections(argumentId);
      if (connectionsResult.isErr()) continue;

      const connectionMap = connectionsResult.value;

      for (const parent of connectionMap.getParents()) {
        if (argumentSet.some((id) => id.equals(parent.getId()))) {
          pairs.push({
            from: parent.getId(),
            to: argumentId,
          });
        }
      }
    }

    return pairs;
  }

  private identifyConnectionGaps(connectedPairs: ConnectedPair[]): ConnectionGap[] {
    const gaps: ConnectionGap[] = [];
    const directConnections = new Set(
      connectedPairs.map((pair) => `${pair.from.getValue()}->${pair.to.getValue()}`),
    );

    for (const pair1 of connectedPairs) {
      for (const pair2 of connectedPairs) {
        if (pair1.to.equals(pair2.from)) continue;

        const gapKey = `${pair1.to.getValue()}->${pair2.from.getValue()}`;
        if (!directConnections.has(gapKey)) {
          gaps.push({
            from: pair1.to,
            to: pair2.from,
          });
        }
      }
    }

    return gaps;
  }

  private async resolveGapsToArguments(gaps: ConnectionGap[]): Promise<AtomicArgumentId[]> {
    const required: AtomicArgumentId[] = [];

    for (const gap of gaps) {
      const pathResult = await this.connectionService.findPathCompleteArgument(gap.from, gap.to);

      if (pathResult.isOk()) {
        const intermediates = pathResult.value.getAllArguments();
        for (const intermediate of intermediates) {
          if (
            !gap.from.equals(intermediate) &&
            !gap.to.equals(intermediate) &&
            !required.some((id) => id.equals(intermediate))
          ) {
            required.push(intermediate);
          }
        }
      }
    }

    return required;
  }

  private async validateArgumentLink(
    fromId: AtomicArgumentId,
    toId: AtomicArgumentId,
  ): Promise<{ isValid: boolean; reason?: string }> {
    const fromArgument = await this.atomicArgumentRepo.findById(fromId);
    const toArgument = await this.atomicArgumentRepo.findById(toId);

    if (!fromArgument || !toArgument) {
      return { isValid: false, reason: 'One or both arguments not found' };
    }

    if (fromArgument.canConnectTo(toArgument)) {
      return { isValid: true };
    }

    return { isValid: false, reason: 'No shared ordered set reference' };
  }

  private async buildConnectionGraph(
    argumentIds: AtomicArgumentId[],
  ): Promise<Map<string, AtomicArgumentId[]>> {
    const graph = new Map<string, AtomicArgumentId[]>();

    for (const argumentId of argumentIds) {
      const connectionsResult = await this.connectionService.findDirectConnections(argumentId);
      if (connectionsResult.isErr()) continue;

      const connectionMap = connectionsResult.value;
      const connectedIds: AtomicArgumentId[] = [];

      for (const parent of connectionMap.getParents()) {
        if (argumentIds.some((id) => id.equals(parent.getId()))) {
          connectedIds.push(parent.getId());
        }
      }

      for (const child of connectionMap.getChildren()) {
        if (argumentIds.some((id) => id.equals(child.getId()))) {
          connectedIds.push(child.getId());
        }
      }

      graph.set(argumentId.getValue(), connectedIds);
    }

    return graph;
  }

  private findMinimalSpanningArguments(
    argumentIds: AtomicArgumentId[],
    connectionGraph: Map<string, AtomicArgumentId[]>,
  ): AtomicArgumentId[] {
    if (argumentIds.length === 0) return [];

    const visited = new Set<string>();
    const minimal: AtomicArgumentId[] = [];
    const firstArgument = argumentIds[0];
    if (!firstArgument) return [];
    const queue = [firstArgument];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      const currentKey = current.getValue();

      if (visited.has(currentKey)) continue;

      visited.add(currentKey);
      minimal.push(current);

      const connections = connectionGraph.get(currentKey) ?? [];
      for (const connected of connections) {
        if (!visited.has(connected.getValue())) {
          queue.push(connected);
        }
      }
    }

    return minimal;
  }

  private async findDirectDependencies(argumentId: AtomicArgumentId): Promise<AtomicArgumentId[]> {
    const connectionsResult = await this.connectionService.findDirectConnections(argumentId);
    if (connectionsResult.isErr()) return [];

    return connectionsResult.value.getParents().map((parent) => parent.getId());
  }

  private async findTransitiveDependencies(
    argumentId: AtomicArgumentId,
  ): Promise<AtomicArgumentId[]> {
    const treeResult = await this.connectionService.findArgumentTree(argumentId);
    if (treeResult.isErr()) return [];

    const allArguments = treeResult.value.getAllArguments();
    return allArguments.filter((id) => !id.equals(argumentId));
  }

  private async computeDependencyLevels(
    argumentId: AtomicArgumentId,
  ): Promise<Map<AtomicArgumentId, number>> {
    const levels = new Map<AtomicArgumentId, number>();
    const queue: { id: AtomicArgumentId; level: number }[] = [{ id: argumentId, level: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      const { id, level } = item;
      const idString = id.getValue();

      if (visited.has(idString)) continue;

      visited.add(idString);
      levels.set(id, level);

      const connectionsResult = await this.connectionService.findDirectConnections(id);
      if (connectionsResult.isOk()) {
        const parents = connectionsResult.value.getParents();
        for (const parent of parents) {
          if (!visited.has(parent.getId().getValue())) {
            queue.push({ id: parent.getId(), level: level + 1 });
          }
        }
      }
    }

    return levels;
  }
}
