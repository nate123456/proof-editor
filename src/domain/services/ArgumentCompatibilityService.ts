import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { OrderedSet } from '../entities/OrderedSet.js';
import type { AtomicArgumentId, StatementId } from '../shared/value-objects.js';

/**
 * Analyzes compatibility between arguments for logical connections.
 * Purely about domain logic - no spatial concerns.
 */
export class ArgumentCompatibilityService {
  /**
   * Check if one argument can logically follow another.
   * Based on OrderedSet relationships and statement compatibility.
   */
  canConnect(
    provider: AtomicArgument,
    consumer: AtomicArgument,
    orderedSets: Map<string, OrderedSet>,
  ): CompatibilityResult {
    // Provider must have conclusions
    const providerConclusionId = provider.getConclusionSet();
    if (!providerConclusionId) {
      return {
        isCompatible: false,
        reason: 'Provider has no conclusions',
        compatibilityScore: 0,
      };
    }

    // Consumer must have premises
    const consumerPremiseId = consumer.getPremiseSet();
    if (!consumerPremiseId) {
      return {
        isCompatible: false,
        reason: 'Consumer has no premises',
        compatibilityScore: 0,
      };
    }

    // Get the actual OrderedSet objects
    const providerConclusions = orderedSets.get(providerConclusionId.getValue());
    const consumerPremises = orderedSets.get(consumerPremiseId.getValue());

    if (!providerConclusions || !consumerPremises) {
      return {
        isCompatible: false,
        reason: 'OrderedSet not found in map',
        compatibilityScore: 0,
      };
    }

    // Check for direct identity match (strongest connection)
    if (providerConclusionId.equals(consumerPremiseId)) {
      return {
        isCompatible: true,
        connectionType: 'identity',
        sharedOrderedSetId: providerConclusionId,
        compatibilityScore: 1.0,
      };
    }

    // Check for content overlap (weaker connection)
    const overlap = this.calculateStatementOverlap(providerConclusions, consumerPremises);

    if (overlap.overlapCount > 0) {
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
    orderedSets: Map<string, OrderedSet>,
  ): PremiseProvider[] {
    const providers: PremiseProvider[] = [];
    const consumerPremises = consumer.getPremiseSet();

    if (!consumerPremises) {
      return providers;
    }

    for (const [id, provider] of Array.from(availableArguments.entries())) {
      if (id === consumer.getId().getValue()) continue;

      const compatibility = this.canConnect(provider, consumer, orderedSets);
      if (compatibility.isCompatible) {
        const conclusionSetId = provider.getConclusionSet();
        const conclusionSet = conclusionSetId
          ? orderedSets.get(conclusionSetId.getValue())
          : undefined;
        providers.push({
          providerId: provider.getId(),
          compatibility,
          providesStatements: conclusionSet?.getStatementIds() || [],
        });
      }
    }

    // Sort by compatibility score
    return providers.sort(
      (a, b) => b.compatibility.compatibilityScore - a.compatibility.compatibilityScore,
    );
  }

  /**
   * Analyze statement overlap between OrderedSets.
   * Used for finding partial matches and suggestions.
   */
  private calculateStatementOverlap(set1: OrderedSet, set2: OrderedSet): StatementOverlap {
    const ids1 = set1.getStatementIds();
    const ids2 = set2.getStatementIds();

    const shared: StatementId[] = [];
    for (const id1 of ids1) {
      if (ids2.some((id2) => id2.equals(id1))) {
        shared.push(id1);
      }
    }

    return {
      sharedStatements: shared,
      overlapCount: shared.length,
      overlapRatio: shared.length / Math.max(ids1.length, ids2.length),
    };
  }
}

// Types for service results
export interface CompatibilityResult {
  isCompatible: boolean;
  reason?: string;
  connectionType?: 'identity' | 'partial';
  sharedOrderedSetId?: import('../shared/value-objects.js').OrderedSetId;
  overlapStatements?: StatementId[];
  compatibilityScore: number; // 0-1
}

export interface PremiseProvider {
  providerId: AtomicArgumentId;
  compatibility: CompatibilityResult;
  providesStatements: readonly StatementId[];
}

export interface StatementOverlap {
  sharedStatements: StatementId[];
  overlapCount: number;
  overlapRatio: number;
}
