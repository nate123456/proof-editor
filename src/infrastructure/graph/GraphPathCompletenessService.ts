import { DirectedGraph } from 'graphology';
import { bidirectional } from 'graphology-shortest-path';
import { allSimplePaths } from 'graphology-simple-path';
import { err, ok, type Result } from 'neverthrow';
import type { AtomicArgument } from '../../domain/entities/AtomicArgument.js';
import { ProcessingError } from '../../domain/errors/DomainErrors.js';
import type { IAtomicArgumentRepository } from '../../domain/repositories/IAtomicArgumentRepository.js';
import type {
  ArgumentDependencyAnalysis,
  BrokenLink,
  ChainIntegrityIssue,
  ChainIntegrityValidationResult,
  IPathCompletenessService,
  MinimalPathCompleteSet,
  PathCompleteArgumentSet,
  PathCompletenessValidationResult,
  RequiredIntermediateArguments,
} from '../../domain/services/IPathCompletenessService.js';
import { AtomicArgumentId } from '../../domain/shared/value-objects/index.js';

export class GraphPathCompletenessService implements IPathCompletenessService {
  constructor(private readonly atomicArgumentRepo: IAtomicArgumentRepository) {}

  /**
   * Validates path-completeness for arbitrary argument sets using graph algorithms.
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

    const graph = await this.buildArgumentDependencyGraph(argumentSet);
    if (graph.isErr()) {
      return err(graph.error);
    }

    const missingArguments = await this.findMissingIntermediateArguments(argumentSet, graph.value);
    const isComplete = missingArguments.length === 0;

    const result: PathCompletenessValidationResult = {
      isComplete,
      argumentSet,
      missingArguments,
    };
    return ok(result);
  }

  /**
   * Ensures path-completeness between two specific arguments using shortest path algorithms.
   */
  async ensurePathCompleteness(
    startArgumentId: AtomicArgumentId,
    endArgumentId: AtomicArgumentId,
  ): Promise<Result<PathCompleteArgumentSet, ProcessingError>> {
    const graph = await this.buildGlobalArgumentGraph();
    if (graph.isErr()) {
      return err(graph.error);
    }

    const startId = startArgumentId.getValue();
    const endId = endArgumentId.getValue();

    // Use graphology's path finding algorithms
    try {
      // Find all simple paths
      const allPaths = allSimplePaths(graph.value, startId, endId);

      if (allPaths.length === 0) {
        return err(new ProcessingError('No path exists between arguments'));
      }

      // Collect all arguments in all paths
      const allArgumentsInPaths = new Set<AtomicArgumentId>();
      const convertedPaths: AtomicArgumentId[][] = [];

      for (const path of allPaths) {
        const convertedPath: AtomicArgumentId[] = [];
        for (const nodeId of path) {
          const argIdResult = AtomicArgumentId.create(nodeId);
          if (argIdResult.isOk()) {
            allArgumentsInPaths.add(argIdResult.value);
            convertedPath.push(argIdResult.value);
          }
        }
        convertedPaths.push(convertedPath);
      }

      const validation = await this.validateAllIntermediateSteps([...allArgumentsInPaths]);
      if (validation.isErr()) return err(validation.error);

      const result: PathCompleteArgumentSet = {
        startArgument: startArgumentId,
        endArgument: endArgumentId,
        allRequiredArguments: [...allArgumentsInPaths],
        allPaths: convertedPaths,
      };

      return ok(result);
    } catch (error) {
      return err(new ProcessingError(`Path finding failed: ${error}`));
    }
  }

  /**
   * Validates argument chain integrity using graph connectivity analysis.
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

    const graph = await this.buildArgumentDependencyGraph(argumentChain);
    if (graph.isErr()) {
      return err(graph.error);
    }

    const integrityIssues: ChainIntegrityIssue[] = [];
    const brokenLinks: BrokenLink[] = [];

    // Check connectivity between consecutive arguments
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

      const linkValidation = await this.validateArgumentLink(currentId, nextId, graph.value);
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
   * Computes minimal path-complete set using graph spanning algorithms.
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

    const graph = await this.buildArgumentDependencyGraph(requiredArguments);
    if (graph.isErr()) {
      return err(graph.error);
    }

    const minimalSet = this.findMinimalSpanningArguments(requiredArguments, graph.value);
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
   * Find required intermediate arguments for path completeness using graph analysis.
   */
  async findRequiredIntermediateArguments(
    partialArgumentSet: AtomicArgumentId[],
  ): Promise<Result<RequiredIntermediateArguments, ProcessingError>> {
    const graph = await this.buildGlobalArgumentGraph();
    if (graph.isErr()) {
      return err(graph.error);
    }

    const missing: AtomicArgumentId[] = [];
    const gaps: Array<{ from: AtomicArgumentId; to: AtomicArgumentId }> = [];
    const argumentSetIds = new Set(partialArgumentSet.map((id) => id.getValue()));

    for (let i = 0; i < partialArgumentSet.length; i++) {
      for (let j = i + 1; j < partialArgumentSet.length; j++) {
        const fromId = partialArgumentSet[i]?.getValue();
        const toId = partialArgumentSet[j]?.getValue();

        if (!fromId || !toId) continue;

        try {
          const path = bidirectional(graph.value, fromId, toId);

          if (path && path.length > 2) {
            for (let k = 1; k < path.length - 1; k++) {
              const intermediateId = path[k];
              if (intermediateId && !argumentSetIds.has(intermediateId)) {
                const argIdResult = AtomicArgumentId.create(intermediateId);
                if (argIdResult.isOk() && !missing.some((id) => id.equals(argIdResult.value))) {
                  missing.push(argIdResult.value);
                }
              }
            }

            if (path.length > 2) {
              const fromArgResult = AtomicArgumentId.create(fromId);
              const toArgResult = AtomicArgumentId.create(toId);
              if (fromArgResult.isOk() && toArgResult.isOk()) {
                gaps.push({
                  from: fromArgResult.value,
                  to: toArgResult.value,
                });
              }
            }
          }
        } catch {
          const fromArgResult = AtomicArgumentId.create(fromId);
          const toArgResult = AtomicArgumentId.create(toId);
          if (fromArgResult.isOk() && toArgResult.isOk()) {
            gaps.push({
              from: fromArgResult.value,
              to: toArgResult.value,
            });
          }
        }
      }
    }

    const result: RequiredIntermediateArguments = {
      originalSet: partialArgumentSet,
      requiredArguments: missing,
      gaps,
    };

    return ok(result);
  }

  /**
   * Analyzes argument dependencies using graph traversal algorithms.
   */
  async analyzeArgumentDependencies(
    targetArgumentId: AtomicArgumentId,
  ): Promise<Result<ArgumentDependencyAnalysis, ProcessingError>> {
    const graph = await this.buildGlobalArgumentGraph();
    if (graph.isErr()) {
      return err(graph.error);
    }

    const targetId = targetArgumentId.getValue();

    // Find direct dependencies (direct predecessors)
    const directDependencies = graph.value
      .inNeighbors(targetId)
      .map((nodeId) => {
        const idResult = AtomicArgumentId.create(nodeId);
        return idResult.isOk() ? idResult.value : null;
      })
      .filter((id): id is AtomicArgumentId => id !== null);

    // Find transitive dependencies using BFS
    const transitiveDependencies = this.findTransitiveDependencies(targetId, graph.value);

    // Compute dependency levels
    const dependencyLevels = this.computeDependencyLevels(targetId, graph.value);

    const analysis: ArgumentDependencyAnalysis = {
      targetArgument: targetArgumentId,
      directDependencies,
      transitiveDependencies,
      dependencyLevels,
    };

    return ok(analysis);
  }

  /**
   * Build dependency graph for a specific set of arguments.
   */
  private async buildArgumentDependencyGraph(
    argumentIds: AtomicArgumentId[],
  ): Promise<Result<DirectedGraph, ProcessingError>> {
    const graph = new DirectedGraph();
    const argumentMap = new Map<string, AtomicArgument>();

    // Load arguments
    for (const argId of argumentIds) {
      const argument = await this.atomicArgumentRepo.findById(argId);
      if (!argument) {
        return err(new ProcessingError(`Argument ${argId.getValue()} not found`));
      }
      argumentMap.set(argId.getValue(), argument);
      graph.addNode(argId.getValue());
    }

    // Add edges based on premise-conclusion relationships
    for (const [consumerId, consumer] of argumentMap) {
      const premiseSet = consumer.getPremiseSet();

      if (premiseSet) {
        for (const [providerId, provider] of argumentMap) {
          if (providerId === consumerId) continue;

          const conclusionSet = provider.getConclusionSet();
          if (conclusionSet && premiseSet && conclusionSet.equals(premiseSet)) {
            graph.addDirectedEdge(providerId, consumerId);
          }
        }
      }
    }

    return ok(graph);
  }

  /**
   * Build global argument dependency graph.
   */
  private async buildGlobalArgumentGraph(): Promise<Result<DirectedGraph, ProcessingError>> {
    const allArguments = await this.atomicArgumentRepo.findAll();
    const argumentIds = allArguments.map((arg) => arg.getId());

    return this.buildArgumentDependencyGraph(argumentIds);
  }

  /**
   * Find missing intermediate arguments using path analysis.
   */
  private async findMissingIntermediateArguments(
    argumentSet: AtomicArgumentId[],
    graph: DirectedGraph,
  ): Promise<AtomicArgumentId[]> {
    const missing: AtomicArgumentId[] = [];
    const argumentSetIds = new Set(argumentSet.map((id) => id.getValue()));

    // Check all pairs for missing intermediate nodes
    for (let i = 0; i < argumentSet.length; i++) {
      for (let j = i + 1; j < argumentSet.length; j++) {
        const fromId = argumentSet[i]?.getValue();
        const toId = argumentSet[j]?.getValue();

        if (!fromId || !toId) continue;

        try {
          // Find shortest path
          const path = bidirectional(graph, fromId, toId);

          if (path && path.length > 2) {
            // There are intermediate nodes
            for (let k = 1; k < path.length - 1; k++) {
              const intermediateId = path[k];
              if (intermediateId && !argumentSetIds.has(intermediateId)) {
                const argIdResult = AtomicArgumentId.create(intermediateId);
                if (argIdResult.isOk() && !missing.some((id) => id.equals(argIdResult.value))) {
                  missing.push(argIdResult.value);
                }
              }
            }
          }
        } catch {
          // Ignore graph traversal errors - continue with remaining paths
        }
      }
    }

    return missing;
  }

  /**
   * Validate that all intermediate steps are complete.
   */
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

  /**
   * Validate link between two arguments.
   */
  private async validateArgumentLink(
    fromId: AtomicArgumentId,
    toId: AtomicArgumentId,
    graph: DirectedGraph,
  ): Promise<{ isValid: boolean; reason?: string }> {
    const fromIdStr = fromId.getValue();
    const toIdStr = toId.getValue();

    // Check if there's a direct edge
    if (graph.hasDirectedEdge(fromIdStr, toIdStr)) {
      return { isValid: true };
    }

    // Check if arguments exist and can connect
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

  /**
   * Find minimal spanning arguments using BFS.
   */
  private findMinimalSpanningArguments(
    argumentIds: AtomicArgumentId[],
    graph: DirectedGraph,
  ): AtomicArgumentId[] {
    if (argumentIds.length === 0) return [];

    const visited = new Set<string>();
    const minimal: AtomicArgumentId[] = [];
    const firstArgument = argumentIds[0];
    if (!firstArgument) return [];

    const queue = [firstArgument.getValue()];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) continue;

      visited.add(current);
      const nodeIdResult = AtomicArgumentId.create(current);
      if (nodeIdResult.isOk()) {
        minimal.push(nodeIdResult.value);
      }

      // Add connected nodes
      for (const neighbor of [...graph.inNeighbors(current), ...graph.outNeighbors(current)]) {
        if (!visited.has(neighbor) && argumentIds.some((id) => id.getValue() === neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return minimal;
  }

  /**
   * Find transitive dependencies using BFS.
   */
  private findTransitiveDependencies(targetId: string, graph: DirectedGraph): AtomicArgumentId[] {
    const dependencies: AtomicArgumentId[] = [];
    const visited = new Set<string>();
    const queue = [targetId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) continue;

      visited.add(current);

      for (const predecessor of graph.inNeighbors(current)) {
        if (!visited.has(predecessor)) {
          queue.push(predecessor);
          const argIdResult = AtomicArgumentId.create(predecessor);
          if (argIdResult.isOk()) {
            dependencies.push(argIdResult.value);
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Compute dependency levels using BFS.
   */
  private computeDependencyLevels(
    targetId: string,
    graph: DirectedGraph,
  ): Map<AtomicArgumentId, number> {
    const levels = new Map<AtomicArgumentId, number>();
    const queue: Array<{ id: string; level: number }> = [{ id: targetId, level: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item || visited.has(item.id)) continue;

      visited.add(item.id);
      const argIdResult = AtomicArgumentId.create(item.id);
      if (argIdResult.isOk()) {
        levels.set(argIdResult.value, item.level);
      }

      for (const predecessor of graph.inNeighbors(item.id)) {
        if (!visited.has(predecessor)) {
          queue.push({ id: predecessor, level: item.level + 1 });
        }
      }
    }

    return levels;
  }
}
