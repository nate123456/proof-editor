import { DirectedGraph } from 'graphology';
import { stronglyConnectedComponents } from 'graphology-components';
import { hasCycle } from 'graphology-dag';
import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';
import type { AtomicArgument } from '../../domain/entities/AtomicArgument.js';
import { ProcessingError } from '../../domain/errors/DomainErrors.js';
import type {
  ArgumentCycle,
  CycleDetection,
  CycleSeverity,
  ICycleDetectionService,
} from '../../domain/services/ICycleDetectionService.js';
import { AtomicArgumentId, type OrderedSetId } from '../../domain/shared/value-objects/index.js';

@injectable()
export class GraphCycleDetectionService implements ICycleDetectionService {
  /**
   * Check if connecting two arguments would create a logical cycle.
   * Builds a dependency graph and uses graphology's cycle detection.
   */
  wouldCreateCycle(
    provider: AtomicArgument,
    consumer: AtomicArgument,
    argumentMap: Map<string, AtomicArgument>,
  ): Result<CycleDetection, ProcessingError> {
    try {
      const graph = this.buildDependencyGraph(argumentMap);

      // Add the proposed connection
      const consumerId = consumer.getId().getValue();
      const providerId = provider.getId().getValue();

      // Ensure both nodes exist
      if (!graph.hasNode(consumerId)) {
        graph.addNode(consumerId);
      }
      if (!graph.hasNode(providerId)) {
        graph.addNode(providerId);
      }

      // Add edge: consumer depends on provider
      graph.addDirectedEdge(consumerId, providerId);

      // Check if this creates a cycle
      try {
        if (hasCycle(graph)) {
          // Find the specific cycle path
          const cyclePath = this.findCyclePath(graph, providerId, consumerId);
          return ok({
            hasCycle: true,
            cyclePath,
            description: `Logical cycle detected: ${cyclePath.map((id) => id.getValue()).join(' -> ')}`,
          });
        }
      } catch (_error) {
        // If hasCycle throws, it means there's a cycle
        const cyclePath = this.findCyclePath(graph, providerId, consumerId);
        return ok({
          hasCycle: true,
          cyclePath,
          description: `Logical cycle detected: ${cyclePath.map((id) => id.getValue()).join(' -> ')}`,
        });
      }

      return ok({
        hasCycle: false,
      });
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to check cycle: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Find all existing cycles in argument connections.
   * Uses Tarjan's algorithm via graphology's stronglyConnectedComponents.
   */
  findAllCycles(
    argumentMap: Map<string, AtomicArgument>,
  ): Result<ArgumentCycle[], ProcessingError> {
    try {
      const graph = this.buildDependencyGraph(argumentMap);
      const cycles: ArgumentCycle[] = [];

      // Find strongly connected components
      const components = stronglyConnectedComponents(graph);

      // Components with more than one node are cycles
      for (const component of components) {
        if (component.length > 1) {
          // Build the cycle information
          const cycleArgumentIds = component
            .map((nodeId) => {
              const idResult = AtomicArgumentId.create(nodeId);
              return idResult.isOk() ? idResult.value : null;
            })
            .filter((id): id is AtomicArgumentId => id !== null);

          const sharedOrderedSets = this.findSharedSetsInCycle(cycleArgumentIds, argumentMap);

          cycles.push({
            argumentIds: cycleArgumentIds,
            length: cycleArgumentIds.length,
            sharedOrderedSets,
          });
        }
      }

      return ok(cycles);
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to find cycles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Analyze cycle severity based on argument types.
   * Some cycles might be acceptable in certain proof systems.
   */
  analyzeCycleSeverity(
    cycle: ArgumentCycle,
    argumentMap: Map<string, AtomicArgument>,
  ): CycleSeverity {
    // Analyze the types of arguments in the cycle
    let hasDefinitions = false;
    let hasDeductions = false;

    for (const argId of cycle.argumentIds) {
      const arg = argumentMap.get(argId.getValue());
      if (!arg) continue;

      // Check argument characteristics
      const hasNoPremises = !arg.getPremiseSet();
      if (hasNoPremises) {
        hasDefinitions = true;
      } else {
        hasDeductions = true;
      }
    }

    // Cycles involving only definitions might be acceptable
    if (hasDefinitions && !hasDeductions) {
      return {
        severity: 'low',
        isAcceptable: true,
        reason: 'Cycle involves only definitional arguments',
      };
    }

    // Mixed or deductive cycles are problematic
    return {
      severity: 'high',
      isAcceptable: false,
      reason: 'Circular logical dependencies violate proof validity',
    };
  }

  /**
   * Build dependency graph from argument map.
   * An argument depends on arguments that provide its premises.
   */
  private buildDependencyGraph(argumentMap: Map<string, AtomicArgument>): DirectedGraph {
    const graph = new DirectedGraph();

    // Add all nodes first
    for (const [argId] of argumentMap) {
      graph.addNode(argId);
    }

    // Add edges based on premise-conclusion connections
    for (const [consumerId, consumer] of argumentMap) {
      const premiseSet = consumer.getPremiseSet();

      if (premiseSet) {
        // Find arguments that provide this premise set
        for (const [providerId, provider] of argumentMap) {
          if (providerId === consumerId) continue;

          const conclusionSet = provider.getConclusionSet();
          if (conclusionSet && premiseSet && conclusionSet.equals(premiseSet)) {
            // Consumer depends on provider
            graph.addDirectedEdge(consumerId, providerId);
          }
        }
      }
    }

    return graph;
  }

  /**
   * Find a specific cycle path between two nodes.
   * Uses DFS to trace the cycle.
   */
  private findCyclePath(
    graph: DirectedGraph,
    startNode: string,
    targetNode: string,
  ): AtomicArgumentId[] {
    const _path: string[] = [];
    const visited = new Set<string>();

    const dfs = (current: string, target: string, currentPath: string[]): string[] | null => {
      if (current === target && currentPath.length > 0) {
        return [...currentPath, current];
      }

      if (visited.has(current)) {
        return null;
      }

      visited.add(current);
      currentPath.push(current);

      // Check all neighbors
      for (const neighbor of graph.outNeighbors(current)) {
        const result = dfs(neighbor, target, currentPath);
        if (result) {
          return result;
        }
      }

      currentPath.pop();
      return null;
    };

    const cyclePath = dfs(startNode, targetNode, []) || [startNode];

    // Convert to AtomicArgumentIds
    return cyclePath
      .map((nodeId) => {
        const idResult = AtomicArgumentId.create(nodeId);
        return idResult.isOk() ? idResult.value : null;
      })
      .filter((id): id is AtomicArgumentId => id !== null);
  }

  /**
   * Find OrderedSets involved in a cycle.
   */
  private findSharedSetsInCycle(
    cycleArgs: AtomicArgumentId[],
    argumentMap: Map<string, AtomicArgument>,
  ): OrderedSetId[] {
    const sharedSets: OrderedSetId[] = [];

    for (let i = 0; i < cycleArgs.length; i++) {
      const currentId = cycleArgs[i];
      const nextIndex = (i + 1) % cycleArgs.length;
      const nextId = cycleArgs[nextIndex];

      if (!currentId || !nextId) continue;

      const current = argumentMap.get(currentId.getValue());
      const next = argumentMap.get(nextId.getValue());

      if (current && next) {
        const currentConclusion = current.getConclusionSet();
        const nextPremise = next.getPremiseSet();

        if (currentConclusion && nextPremise && currentConclusion.equals(nextPremise)) {
          sharedSets.push(currentConclusion);
        }
      }
    }

    return sharedSets;
  }
}
