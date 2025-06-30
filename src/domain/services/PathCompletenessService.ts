import { AtomicArgumentEntity } from '../entities/AtomicArgumentEntity';
import { AtomicArgumentId } from '../shared/value-objects.js';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository';
import { ConnectionResolutionService } from './ConnectionResolutionService';
import type { Result } from '../shared/result.js';
import { ProcessingError } from '../errors/DomainErrors';

export class PathCompletenessService {
  constructor(
    private readonly atomicArgumentRepo: IAtomicArgumentRepository,
    private readonly connectionService: ConnectionResolutionService
  ) {}

  async validatePathCompleteness(
    argumentSet: AtomicArgumentId[]
  ): Promise<Result<PathCompletenessValidationResult, ProcessingError>> {
    if (argumentSet.length === 0) {
      const result = new PathCompletenessValidationResult(true, [], []);
      return { success: true, data: result };
    }

    const connections = await this.analyzeConnectionsInSet(argumentSet);
    const missingArguments = await this.findMissingIntermediateArguments(argumentSet, connections);
    const isComplete = missingArguments.length === 0;

    const result = new PathCompletenessValidationResult(
      isComplete,
      argumentSet,
      missingArguments
    );

    return { success: true, data: result };
  }

  async ensurePathCompleteness(
    startArgumentId: AtomicArgumentId,
    endArgumentId: AtomicArgumentId
  ): Promise<Result<PathCompleteArgumentSet, ProcessingError>> {
    const pathResult = await this.connectionService.findPathCompleteArgument(
      startArgumentId,
      endArgumentId
    );

    if (!pathResult.success) {
      return {
        success: false,
        error: new ProcessingError('No path exists between arguments', pathResult.error)
      };
    }

    const pathCompleteArgument = pathResult.data;
    const allRequiredArguments = pathCompleteArgument.getAllArguments();
    
    const validation = await this.validateAllIntermediateSteps([...allRequiredArguments]);
    if (!validation.success) return validation;

    const result = new PathCompleteArgumentSet(
      startArgumentId,
      endArgumentId,
      [...allRequiredArguments],
      pathCompleteArgument.getAllPaths().map(path => [...path])
    );

    return { success: true, data: result };
  }

  async findRequiredIntermediateArguments(
    partialArgumentSet: AtomicArgumentId[]
  ): Promise<Result<RequiredIntermediateArguments, ProcessingError>> {
    const connectedPairs = await this.identifyConnectedPairs(partialArgumentSet);
    const gaps = await this.identifyConnectionGaps(connectedPairs);
    const requiredArguments = await this.resolveGapsToArguments(gaps);

    const result = new RequiredIntermediateArguments(
      partialArgumentSet,
      requiredArguments,
      gaps
    );

    return { success: true, data: result };
  }

  async validateArgumentChainIntegrity(
    argumentChain: AtomicArgumentId[]
  ): Promise<Result<ChainIntegrityValidationResult, ProcessingError>> {
    if (argumentChain.length < 2) {
      const result = new ChainIntegrityValidationResult(true, [], []);
      return { success: true, data: result };
    }

    const integrityIssues: ChainIntegrityIssue[] = [];
    const brokenLinks: BrokenLink[] = [];

    for (let i = 0; i < argumentChain.length - 1; i++) {
      const currentId = argumentChain[i];
      const nextId = argumentChain[i + 1];

      const linkValidation = await this.validateArgumentLink(currentId, nextId);
      if (!linkValidation.isValid) {
        const brokenLink = new BrokenLink(currentId, nextId, linkValidation.reason || 'Unknown reason');
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

    return { success: true, data: result };
  }

  async computeMinimalPathCompleteSet(
    requiredArguments: AtomicArgumentId[]
  ): Promise<Result<MinimalPathCompleteSet, ProcessingError>> {
    if (requiredArguments.length === 0) {
      const result = new MinimalPathCompleteSet([], []);
      return { success: true, data: result };
    }

    const allConnections = await this.buildConnectionGraph(requiredArguments);
    const minimalSet = this.findMinimalSpanningArguments(requiredArguments, allConnections);
    const redundantArguments = requiredArguments.filter(
      arg => !minimalSet.some(minArg => minArg.equals(arg))
    );

    const result = new MinimalPathCompleteSet(minimalSet, redundantArguments);
    return { success: true, data: result };
  }

  async analyzeArgumentDependencies(
    targetArgumentId: AtomicArgumentId
  ): Promise<Result<ArgumentDependencyAnalysis, ProcessingError>> {
    const directDependencies = await this.findDirectDependencies(targetArgumentId);
    const transitiveDependencies = await this.findTransitiveDependencies(targetArgumentId);
    const dependencyLevels = await this.computeDependencyLevels(targetArgumentId);

    const analysis = new ArgumentDependencyAnalysis(
      targetArgumentId,
      directDependencies,
      transitiveDependencies,
      dependencyLevels
    );

    return { success: true, data: analysis };
  }

  private async analyzeConnectionsInSet(
    argumentSet: AtomicArgumentId[]
  ): Promise<ArgumentConnection[]> {
    const connections: ArgumentConnection[] = [];

    for (const argumentId of argumentSet) {
      const argument = await this.atomicArgumentRepo.findById(argumentId);
      if (!argument) continue;

      const connectionsResult = await this.connectionService.findDirectConnections(argumentId);
      if (!connectionsResult.success) continue;

      const connectionMap = connectionsResult.data;
      
      for (const parent of connectionMap.getParents()) {
        if (argumentSet.some(id => id.equals(parent.getId()))) {
          connections.push(new ArgumentConnection(parent.getId(), argumentId, 'direct'));
        }
      }
    }

    return connections;
  }

  private async findMissingIntermediateArguments(
    argumentSet: AtomicArgumentId[],
    connections: ArgumentConnection[]
  ): Promise<AtomicArgumentId[]> {
    const missing: AtomicArgumentId[] = [];
    const connectedPairs = new Set<string>();

    connections.forEach(conn => {
      connectedPairs.add(`${conn.from.getValue()}->${conn.to.getValue()}`);
    });

    for (let i = 0; i < argumentSet.length - 1; i++) {
      for (let j = i + 1; j < argumentSet.length; j++) {
        const fromId = argumentSet[i];
        const toId = argumentSet[j];
        const pairKey = `${fromId.getValue()}->${toId.getValue()}`;

        if (!connectedPairs.has(pairKey)) {
          const pathResult = await this.connectionService.findPathCompleteArgument(fromId, toId);
          if (pathResult.success) {
            const intermediatePaths = pathResult.data.getAllArguments();
            for (const intermediate of intermediatePaths) {
              if (!argumentSet.some(id => id.equals(intermediate)) &&
                  !missing.some(id => id.equals(intermediate))) {
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
        return {
          success: false,
          error: new ProcessingError(`Argument ${argumentId.getValue()} not found`)
        };
      }

      if (!argument.isComplete()) {
        return {
          success: false,
          error: new ProcessingError(`Argument ${argumentId.getValue()} is incomplete`)
        };
      }
    }

    return { success: true, data: undefined };
  }

  private async identifyConnectedPairs(
    argumentSet: AtomicArgumentId[]
  ): Promise<ConnectedPair[]> {
    const pairs: ConnectedPair[] = [];

    for (const argumentId of argumentSet) {
      const connectionsResult = await this.connectionService.findDirectConnections(argumentId);
      if (!connectionsResult.success) continue;

      const connectionMap = connectionsResult.data;
      
      for (const parent of connectionMap.getParents()) {
        if (argumentSet.some(id => id.equals(parent.getId()))) {
          pairs.push(new ConnectedPair(parent.getId(), argumentId));
        }
      }
    }

    return pairs;
  }

  private async identifyConnectionGaps(
    connectedPairs: ConnectedPair[]
  ): Promise<ConnectionGap[]> {
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

  private async resolveGapsToArguments(
    gaps: ConnectionGap[]
  ): Promise<AtomicArgumentId[]> {
    const required: AtomicArgumentId[] = [];

    for (const gap of gaps) {
      const pathResult = await this.connectionService.findPathCompleteArgument(
        gap.from,
        gap.to
      );

      if (pathResult.success) {
        const intermediates = pathResult.data.getAllArguments();
        for (const intermediate of intermediates) {
          if (!gap.from.equals(intermediate) && 
              !gap.to.equals(intermediate) &&
              !required.some(id => id.equals(intermediate))) {
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
      if (!connectionsResult.success) continue;

      const connectionMap = connectionsResult.data;
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
    const queue = [argumentIds[0]];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentKey = current.getValue();

      if (visited.has(currentKey)) continue;

      visited.add(currentKey);
      minimal.push(current);

      const connections = connectionGraph.get(currentKey) || [];
      for (const connected of connections) {
        if (!visited.has(connected.getValue())) {
          queue.push(connected);
        }
      }
    }

    return minimal;
  }

  private async findDirectDependencies(
    argumentId: AtomicArgumentId
  ): Promise<AtomicArgumentId[]> {
    const connectionsResult = await this.connectionService.findDirectConnections(argumentId);
    if (!connectionsResult.success) return [];

    return connectionsResult.data.getParents().map(parent => parent.getId());
  }

  private async findTransitiveDependencies(
    argumentId: AtomicArgumentId
  ): Promise<AtomicArgumentId[]> {
    const treeResult = await this.connectionService.findArgumentTree(argumentId);
    if (!treeResult.success) return [];

    const allArguments = treeResult.data.getAllArguments();
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
      if (connectionsResult.success) {
        const parents = connectionsResult.data.getParents();
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