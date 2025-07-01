import { ProcessingError } from '../errors/DomainErrors';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository';
import { err, ok, type Result } from '../shared/result.js';
import { type AtomicArgumentId } from '../shared/value-objects.js';
import { type ConnectionResolutionService } from './ConnectionResolutionService';

export class PathCompletenessService {
  constructor(
    private readonly atomicArgumentRepo: IAtomicArgumentRepository,
    private readonly connectionService: ConnectionResolutionService
  ) {}

  /**
   * Validates path-completeness for arbitrary argument sets.
   * Use TreeEntity.validatePathCompleteness() for tree-specific validation.
   */
  async validatePathCompleteness(
    argumentSet: AtomicArgumentId[]
  ): Promise<Result<PathCompletenessValidationResult, ProcessingError>> {
    if (argumentSet.length === 0) {
      const result = new PathCompletenessValidationResult(true, [], []);
      return ok(result);
    }

    const connections = await this.analyzeConnectionsInSet(argumentSet);
    const missingArguments = this.findMissingIntermediateArguments(argumentSet, connections);
    const isComplete = missingArguments.length === 0;

    const result = new PathCompletenessValidationResult(isComplete, argumentSet, missingArguments);

    return ok(result);
  }

  /**
   * Ensures path-completeness between two specific arguments.
   * Cross-entity operation that spans argument boundaries.
   */
  async ensurePathCompleteness(
    startArgumentId: AtomicArgumentId,
    endArgumentId: AtomicArgumentId
  ): Promise<Result<PathCompleteArgumentSet, ProcessingError>> {
    const pathResult = this.connectionService.findPathCompleteArgument(
      startArgumentId,
      endArgumentId
    );

    if (pathResult.isErr()) {
      return err(new ProcessingError('No path exists between arguments', pathResult.error));
    }

    const pathCompleteArgument = pathResult.value;
    const allRequiredArguments = pathCompleteArgument.getAllArguments();

    const validation = await this.validateAllIntermediateSteps([...allRequiredArguments]);
    if (validation.isErr()) return err(validation.error);

    const result = new PathCompleteArgumentSet(
      startArgumentId,
      endArgumentId,
      [...allRequiredArguments],
      pathCompleteArgument.getAllPaths().map(path => [...path])
    );

    return ok(result);
  }

  /**
   * @deprecated Use TreeEntity.findRequiredIntermediateArguments() for tree-specific analysis.
   * This method remains for cross-tree argument analysis.
   */
  async findRequiredIntermediateArguments(
    partialArgumentSet: AtomicArgumentId[]
  ): Promise<Result<RequiredIntermediateArguments, ProcessingError>> {
    const connectedPairs = await this.identifyConnectedPairs(partialArgumentSet);
    const gaps = this.identifyConnectionGaps(connectedPairs);
    const requiredArguments = this.resolveGapsToArguments(gaps);

    const result = new RequiredIntermediateArguments(partialArgumentSet, requiredArguments, gaps);

    return ok(result);
  }

  /**
   * @deprecated Use TreeEntity.validateArgumentChainIntegrity() for tree-specific validation.
   * This method remains for cross-tree chain analysis.
   */
  async validateArgumentChainIntegrity(
    argumentChain: AtomicArgumentId[]
  ): Promise<Result<ChainIntegrityValidationResult, ProcessingError>> {
    if (argumentChain.length < 2) {
      const result = new ChainIntegrityValidationResult(true, [], []);
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
            `Invalid argument chain: missing argument at position ${i} or ${i + 1}`
          )
        );
      }

      const linkValidation = await this.validateArgumentLink(currentId, nextId);
      if (!linkValidation.isValid) {
        const brokenLink = new BrokenLink(
          currentId,
          nextId,
          linkValidation.reason ?? 'Unknown reason'
        );
        brokenLinks.push(brokenLink);

        const issue = new ChainIntegrityIssue(
          'broken_link',
          `No direct connection between ${currentId.getValue()} and ${nextId.getValue()}`,
          i
        );
        integrityIssues.push(issue);
      }
    }

    const isIntact = integrityIssues.length === 0;
    const result = new ChainIntegrityValidationResult(isIntact, integrityIssues, brokenLinks);

    return ok(result);
  }

  /**
   * @deprecated Use TreeEntity.computeMinimalPathCompleteSet() for tree-specific optimization.
   * This method remains for cross-tree set analysis.
   */
  async computeMinimalPathCompleteSet(
    requiredArguments: AtomicArgumentId[]
  ): Promise<Result<MinimalPathCompleteSet, ProcessingError>> {
    if (requiredArguments.length === 0) {
      const result = new MinimalPathCompleteSet([], []);
      return ok(result);
    }

    const allConnections = await this.buildConnectionGraph(requiredArguments);
    const minimalSet = this.findMinimalSpanningArguments(requiredArguments, allConnections);
    const redundantArguments = requiredArguments.filter(
      arg => !minimalSet.some(minArg => minArg.equals(arg))
    );

    const result = new MinimalPathCompleteSet(minimalSet, redundantArguments);
    return ok(result);
  }

  /**
   * @deprecated Use TreeEntity.analyzeArgumentDependencies() for tree-specific dependency analysis.
   * This method remains for cross-tree dependency analysis.
   */
  async analyzeArgumentDependencies(
    targetArgumentId: AtomicArgumentId
  ): Promise<Result<ArgumentDependencyAnalysis, ProcessingError>> {
    const directDependencies = await this.findDirectDependencies(targetArgumentId);
    const transitiveDependencies = this.findTransitiveDependencies(targetArgumentId);
    const dependencyLevels = await this.computeDependencyLevels(targetArgumentId);

    const analysis = new ArgumentDependencyAnalysis(
      targetArgumentId,
      directDependencies,
      transitiveDependencies,
      dependencyLevels
    );

    return ok(analysis);
  }

  private async analyzeConnectionsInSet(
    argumentSet: AtomicArgumentId[]
  ): Promise<ArgumentConnection[]> {
    const connections: ArgumentConnection[] = [];

    for (const argumentId of argumentSet) {
      const argument = await this.atomicArgumentRepo.findById(argumentId);
      if (!argument) continue;

      const connectionsResult = await this.connectionService.findDirectConnections(argumentId);
      if (connectionsResult.isErr()) continue;

      const connectionMap = connectionsResult.value;

      for (const parent of connectionMap.getParents()) {
        if (argumentSet.some(id => id.equals(parent.getId()))) {
          connections.push(new ArgumentConnection(parent.getId(), argumentId, 'direct'));
        }
      }
    }

    return connections;
  }

  private findMissingIntermediateArguments(
    argumentSet: AtomicArgumentId[],
    connections: ArgumentConnection[]
  ): AtomicArgumentId[] {
    const missing: AtomicArgumentId[] = [];
    const connectedPairs = new Set<string>();

    connections.forEach(conn => {
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
          const pathResult = this.connectionService.findPathCompleteArgument(fromId, toId);
          if (pathResult.isOk()) {
            const intermediatePaths = pathResult.value.getAllArguments();
            for (const intermediate of intermediatePaths) {
              if (
                !argumentSet.some(id => id.equals(intermediate)) &&
                !missing.some(id => id.equals(intermediate))
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
    argumentIds: AtomicArgumentId[]
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
        if (argumentSet.some(id => id.equals(parent.getId()))) {
          pairs.push(new ConnectedPair(parent.getId(), argumentId));
        }
      }
    }

    return pairs;
  }

  private identifyConnectionGaps(connectedPairs: ConnectedPair[]): ConnectionGap[] {
    const gaps: ConnectionGap[] = [];
    const directConnections = new Set(
      connectedPairs.map(pair => `${pair.from.getValue()}->${pair.to.getValue()}`)
    );

    for (const pair1 of connectedPairs) {
      for (const pair2 of connectedPairs) {
        if (pair1.to.equals(pair2.from)) continue;

        const gapKey = `${pair1.to.getValue()}->${pair2.from.getValue()}`;
        if (!directConnections.has(gapKey)) {
          gaps.push(new ConnectionGap(pair1.to, pair2.from));
        }
      }
    }

    return gaps;
  }

  private resolveGapsToArguments(gaps: ConnectionGap[]): AtomicArgumentId[] {
    const required: AtomicArgumentId[] = [];

    for (const gap of gaps) {
      const pathResult = this.connectionService.findPathCompleteArgument(gap.from, gap.to);

      if (pathResult.isOk()) {
        const intermediates = pathResult.value.getAllArguments();
        for (const intermediate of intermediates) {
          if (
            !gap.from.equals(intermediate) &&
            !gap.to.equals(intermediate) &&
            !required.some(id => id.equals(intermediate))
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
    toId: AtomicArgumentId
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
    argumentIds: AtomicArgumentId[]
  ): Promise<Map<string, AtomicArgumentId[]>> {
    const graph = new Map<string, AtomicArgumentId[]>();

    for (const argumentId of argumentIds) {
      const connectionsResult = await this.connectionService.findDirectConnections(argumentId);
      if (connectionsResult.isErr()) continue;

      const connectionMap = connectionsResult.value;
      const connectedIds: AtomicArgumentId[] = [];

      for (const parent of connectionMap.getParents()) {
        if (argumentIds.some(id => id.equals(parent.getId()))) {
          connectedIds.push(parent.getId());
        }
      }

      for (const child of connectionMap.getChildren()) {
        if (argumentIds.some(id => id.equals(child.getId()))) {
          connectedIds.push(child.getId());
        }
      }

      graph.set(argumentId.getValue(), connectedIds);
    }

    return graph;
  }

  private findMinimalSpanningArguments(
    argumentIds: AtomicArgumentId[],
    connectionGraph: Map<string, AtomicArgumentId[]>
  ): AtomicArgumentId[] {
    if (argumentIds.length === 0) return [];

    const visited = new Set<string>();
    const minimal: AtomicArgumentId[] = [];
    const firstArgument = argumentIds[0];
    if (!firstArgument) return [];
    const queue = [firstArgument];

    while (queue.length > 0) {
      const current = queue.shift()!;
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

    return connectionsResult.value.getParents().map(parent => parent.getId());
  }

  private findTransitiveDependencies(argumentId: AtomicArgumentId): AtomicArgumentId[] {
    const treeResult = this.connectionService.findArgumentTree(argumentId);
    if (treeResult.isErr()) return [];

    const allArguments = treeResult.value.getAllArguments();
    return allArguments.filter(id => !id.equals(argumentId));
  }

  private async computeDependencyLevels(
    argumentId: AtomicArgumentId
  ): Promise<Map<AtomicArgumentId, number>> {
    const levels = new Map<AtomicArgumentId, number>();
    const queue: { id: AtomicArgumentId; level: number }[] = [{ id: argumentId, level: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
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

export class PathCompletenessValidationResult {
  constructor(
    public readonly isComplete: boolean,
    public readonly argumentSet: AtomicArgumentId[],
    public readonly missingArguments: AtomicArgumentId[]
  ) {}
}

export class PathCompleteArgumentSet {
  constructor(
    public readonly startArgument: AtomicArgumentId,
    public readonly endArgument: AtomicArgumentId,
    public readonly allRequiredArguments: AtomicArgumentId[],
    public readonly allPaths: AtomicArgumentId[][]
  ) {}
}

export class RequiredIntermediateArguments {
  constructor(
    public readonly originalSet: AtomicArgumentId[],
    public readonly requiredArguments: AtomicArgumentId[],
    public readonly gaps: ConnectionGap[]
  ) {}
}

export class ChainIntegrityValidationResult {
  constructor(
    public readonly isIntact: boolean,
    public readonly integrityIssues: ChainIntegrityIssue[],
    public readonly brokenLinks: BrokenLink[]
  ) {}
}

export class MinimalPathCompleteSet {
  constructor(
    public readonly minimalArguments: AtomicArgumentId[],
    public readonly redundantArguments: AtomicArgumentId[]
  ) {}
}

export class ArgumentDependencyAnalysis {
  constructor(
    public readonly targetArgument: AtomicArgumentId,
    public readonly directDependencies: AtomicArgumentId[],
    public readonly transitiveDependencies: AtomicArgumentId[],
    public readonly dependencyLevels: Map<AtomicArgumentId, number>
  ) {}
}

export class ArgumentConnection {
  constructor(
    public readonly from: AtomicArgumentId,
    public readonly to: AtomicArgumentId,
    public readonly type: 'direct' | 'transitive'
  ) {}
}

export class ConnectedPair {
  constructor(
    public readonly from: AtomicArgumentId,
    public readonly to: AtomicArgumentId
  ) {}
}

export class ConnectionGap {
  constructor(
    public readonly from: AtomicArgumentId,
    public readonly to: AtomicArgumentId
  ) {}
}

export class ChainIntegrityIssue {
  constructor(
    public readonly type: string,
    public readonly description: string,
    public readonly position: number
  ) {}
}

export class BrokenLink {
  constructor(
    public readonly from: AtomicArgumentId,
    public readonly to: AtomicArgumentId,
    public readonly reason: string
  ) {}
}
