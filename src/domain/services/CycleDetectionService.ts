import { err, ok, type Result } from 'neverthrow';
import type { AtomicArgument } from '../entities/AtomicArgument.js';
import { ProcessingError } from '../errors/DomainErrors.js';
import { AtomicArgumentId, type OrderedSetId } from '../shared/value-objects.js';
import type {
  ArgumentCycle,
  CycleDetection,
  CycleSeverity,
  ICycleDetectionService,
} from './ICycleDetectionService.js';

export class CycleDetectionService implements ICycleDetectionService {
  /**
   * Check if connecting two arguments would create a logical cycle.
   * Traces through argument dependencies via OrderedSet connections.
   */
  wouldCreateCycle(
    provider: AtomicArgument,
    consumer: AtomicArgument,
    argumentMap: Map<string, AtomicArgument>,
  ): Result<CycleDetection, ProcessingError> {
    // Build logical dependency graph that includes the new connection
    const dependencies = this.buildLogicalDependencyGraph(argumentMap);

    // Add the proposed connection: consumer depends on provider
    const consumerDeps = dependencies.get(consumer.getId().getValue()) || [];
    consumerDeps.push(provider.getId());
    dependencies.set(consumer.getId().getValue(), consumerDeps);

    // Check if provider is reachable from consumer (creates cycle)
    const visited = new Set<string>();
    let cyclePath: AtomicArgumentId[] = [];

    const findPath = (
      from: AtomicArgumentId,
      to: AtomicArgumentId,
      currentPath: AtomicArgumentId[],
    ): boolean => {
      const fromValue = from.getValue();
      const toValue = to.getValue();

      if (fromValue === toValue) {
        cyclePath = [...currentPath, from];
        return true;
      }

      if (visited.has(fromValue)) {
        return false;
      }

      visited.add(fromValue);
      const newPath = [...currentPath, from];

      const deps = dependencies.get(fromValue) || [];
      for (const dep of deps) {
        if (findPath(dep, to, newPath)) {
          return true;
        }
      }

      return false;
    };

    const wouldCycle = findPath(provider.getId(), consumer.getId(), []);

    if (wouldCycle) {
      return ok({
        hasCycle: true,
        cyclePath: cyclePath,
        description: `Logical cycle detected: ${cyclePath.map((id) => id.getValue()).join(' -> ')}`,
      });
    }

    return ok({
      hasCycle: false,
    });
  }

  /**
   * Find all existing cycles in argument connections.
   * Used for validation and integrity checking.
   */
  findAllCycles(
    argumentMap: Map<string, AtomicArgument>,
  ): Result<ArgumentCycle[], ProcessingError> {
    try {
      const cycles: ArgumentCycle[] = [];
      const dependencies = this.buildLogicalDependencyGraph(argumentMap);

      // Tarjan's algorithm for finding strongly connected components
      let index = 0;
      const stack: AtomicArgumentId[] = [];
      const indices = new Map<string, number>();
      const lowlinks = new Map<string, number>();
      const onStack = new Set<string>();

      const strongconnect = (v: AtomicArgumentId) => {
        indices.set(v.getValue(), index);
        lowlinks.set(v.getValue(), index);
        index++;
        stack.push(v);
        onStack.add(v.getValue());

        const deps = dependencies.get(v.getValue()) || [];
        for (const w of deps) {
          if (!indices.has(w.getValue())) {
            strongconnect(w);
            const vLowlink = lowlinks.get(v.getValue());
            const wLowlink = lowlinks.get(w.getValue());
            if (vLowlink !== undefined && wLowlink !== undefined) {
              lowlinks.set(v.getValue(), Math.min(vLowlink, wLowlink));
            }
          } else if (onStack.has(w.getValue())) {
            const vLowlink = lowlinks.get(v.getValue());
            const wIndex = indices.get(w.getValue());
            if (vLowlink !== undefined && wIndex !== undefined) {
              lowlinks.set(v.getValue(), Math.min(vLowlink, wIndex));
            }
          }
        }

        if (lowlinks.get(v.getValue()) === indices.get(v.getValue())) {
          const component: AtomicArgumentId[] = [];
          let w: AtomicArgumentId;
          do {
            const popped = stack.pop();
            if (!popped) break;
            w = popped;
            onStack.delete(w.getValue());
            component.push(w);
          } while (w.getValue() !== v.getValue());

          if (component.length > 1) {
            cycles.push({
              argumentIds: component,
              length: component.length,
              sharedOrderedSets: this.findSharedSetsInCycle(component, argumentMap),
            });
          }
        }
      };

      for (const [argId, _] of argumentMap) {
        if (!indices.has(argId)) {
          const idResult = AtomicArgumentId.create(argId);
          if (idResult.isOk()) {
            strongconnect(idResult.value);
          }
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
      // (In a real system, arguments might have types)
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
   * Build dependency graph based on OrderedSet connections.
   * An argument depends on arguments that provide its premises.
   */
  private buildLogicalDependencyGraph(
    argumentMap: Map<string, AtomicArgument>,
  ): Map<string, AtomicArgumentId[]> {
    const graph = new Map<string, AtomicArgumentId[]>();

    for (const [consumerId, consumer] of argumentMap) {
      const deps: AtomicArgumentId[] = [];
      const premiseSet = consumer.getPremiseSet();

      if (premiseSet) {
        // Find arguments that provide this premise set
        for (const [providerId, provider] of argumentMap) {
          if (providerId === consumerId) continue;

          const conclusionSet = provider.getConclusionSet();
          if (conclusionSet && premiseSet && conclusionSet.equals(premiseSet)) {
            deps.push(provider.getId());
          }
        }
      }

      graph.set(consumerId, deps);
    }

    return graph;
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
