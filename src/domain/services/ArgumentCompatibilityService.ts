import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Statement } from '../entities/Statement.js';
import type { AtomicArgumentId, StatementId } from '../shared/value-objects/index.js';

/**
 * Analyzes compatibility between arguments for logical connections.
 * Purely about domain logic - no spatial concerns.
 */
export class ArgumentCompatibilityService {
  /**
   * Check if one argument can logically follow another.
   * Based on statement relationships and compatibility.
   */
  canConnect(provider: AtomicArgument, consumer: AtomicArgument): CompatibilityResult {
    // Provider must have conclusions
    const providerConclusions = provider.getConclusions();
    if (providerConclusions.length === 0) {
      return {
        isCompatible: false,
        reason: 'Provider has no conclusions',
        compatibilityScore: 0,
      };
    }

    // Consumer must have premises
    const consumerPremises = consumer.getPremises();
    if (consumerPremises.length === 0) {
      return {
        isCompatible: false,
        reason: 'Consumer has no premises',
        compatibilityScore: 0,
      };
    }

    // Check for statement overlap
    const overlap = this.calculateStatementOverlap(providerConclusions, consumerPremises);

    if (overlap.overlapCount > 0) {
      // Check for exact match (all consumer premises provided by provider conclusions)
      const allPremisesProvided = consumerPremises.every((premise) =>
        providerConclusions.some((conclusion) => conclusion.getId().equals(premise.getId())),
      );

      if (allPremisesProvided) {
        return {
          isCompatible: true,
          connectionType: 'complete',
          overlapStatements: overlap.sharedStatements,
          compatibilityScore: 1.0,
        };
      }

      return {
        isCompatible: true,
        connectionType: 'partial',
        overlapStatements: overlap.sharedStatements,
        compatibilityScore: overlap.overlapRatio,
      };
    }

    return {
      isCompatible: false,
      reason: 'No statement overlap between conclusion and premise',
      compatibilityScore: 0,
    };
  }

  /**
   * Find the best matches for an argument's premises.
   * Returns arguments that could provide required statements.
   */
  findPremiseProviders(
    consumer: AtomicArgument,
    availableArguments: Map<string, AtomicArgument>,
  ): PremiseProvider[] {
    const providers: PremiseProvider[] = [];
    const consumerPremises = consumer.getPremises();

    if (consumerPremises.length === 0) {
      return providers;
    }

    for (const [id, provider] of Array.from(availableArguments.entries())) {
      if (id === consumer.getId().getValue()) continue;

      const compatibility = this.canConnect(provider, consumer);
      if (compatibility.isCompatible) {
        providers.push({
          providerId: provider.getId(),
          compatibility,
          providesStatements: provider.getConclusions().map((s) => s.getId()),
        });
      }
    }

    // Sort by compatibility score
    return providers.sort(
      (a, b) => b.compatibility.compatibilityScore - a.compatibility.compatibilityScore,
    );
  }

  /**
   * Find arguments that could use this argument's conclusions.
   * Returns arguments whose premises could be satisfied by this argument.
   */
  findConclusionConsumers(
    provider: AtomicArgument,
    availableArguments: Map<string, AtomicArgument>,
  ): ConclusionConsumer[] {
    const consumers: ConclusionConsumer[] = [];
    const providerConclusions = provider.getConclusions();

    if (providerConclusions.length === 0) {
      return consumers;
    }

    for (const [id, consumer] of Array.from(availableArguments.entries())) {
      if (id === provider.getId().getValue()) continue;

      const compatibility = this.canConnect(provider, consumer);
      if (compatibility.isCompatible) {
        consumers.push({
          consumerId: consumer.getId(),
          compatibility,
          requiresStatements: consumer.getPremises().map((s) => s.getId()),
        });
      }
    }

    // Sort by compatibility score
    return consumers.sort(
      (a, b) => b.compatibility.compatibilityScore - a.compatibility.compatibilityScore,
    );
  }

  /**
   * Analyze statement overlap between two statement arrays.
   * Used for finding partial matches and suggestions.
   */
  private calculateStatementOverlap(
    statements1: readonly Statement[],
    statements2: readonly Statement[],
  ): StatementOverlap {
    const shared: StatementId[] = [];
    for (const stmt1 of statements1) {
      if (statements2.some((stmt2) => stmt2.getId().equals(stmt1.getId()))) {
        shared.push(stmt1.getId());
      }
    }

    return {
      sharedStatements: shared,
      overlapCount: shared.length,
      overlapRatio: shared.length / Math.max(statements1.length, statements2.length),
    };
  }

  /**
   * Check if adding a connection would create a cycle.
   * This is a simple version - a more sophisticated implementation
   * would track the full dependency graph.
   */
  wouldCreateCycle(
    provider: AtomicArgument,
    consumer: AtomicArgument,
    existingConnections: Map<string, Set<string>>,
  ): boolean {
    const providerId = provider.getId().getValue();
    const consumerId = consumer.getId().getValue();

    // Check if consumer already provides to provider (direct cycle)
    const consumerProvides = existingConnections.get(consumerId);
    if (consumerProvides?.has(providerId)) {
      return true;
    }

    // Check for indirect cycles using DFS
    const visited = new Set<string>();
    const stack: string[] = [consumerId];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || visited.has(current)) continue;
      visited.add(current);

      const provides = existingConnections.get(current);
      if (provides) {
        for (const target of provides) {
          if (target === providerId) {
            return true; // Found cycle
          }
          stack.push(target);
        }
      }
    }

    return false;
  }
}

// Types for service results
export interface CompatibilityResult {
  isCompatible: boolean;
  reason?: string;
  connectionType?: 'complete' | 'partial';
  overlapStatements?: StatementId[];
  compatibilityScore: number; // 0-1
}

export interface PremiseProvider {
  providerId: AtomicArgumentId;
  compatibility: CompatibilityResult;
  providesStatements: readonly StatementId[];
}

export interface ConclusionConsumer {
  consumerId: AtomicArgumentId;
  compatibility: CompatibilityResult;
  requiresStatements: readonly StatementId[];
}

export interface StatementOverlap {
  sharedStatements: StatementId[];
  overlapCount: number;
  overlapRatio: number;
}
