import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { OrderedSet } from '../entities/OrderedSet.js';
import type { AtomicArgumentId, OrderedSetId } from '../shared/value-objects.js';

/**
 * Tracks and analyzes OrderedSet identity relationships.
 * This is THE core mechanism for discovering connections.
 */
export class OrderedSetIdentityService {
  /**
   * Find all arguments that could connect based on shared OrderedSet identity.
   * Returns pairs of arguments where conclusion of one IS premise of another.
   */
  findPotentialConnections(argumentMap: Map<string, AtomicArgument>): ConnectionOpportunity[] {
    const opportunities: ConnectionOpportunity[] = [];
    const argumentList = Array.from(argumentMap.values());

    for (let i = 0; i < argumentList.length; i++) {
      const provider = argumentList[i];
      if (!provider) continue;

      const conclusionSet = provider.getConclusionSet();
      if (!conclusionSet) continue;

      for (let j = 0; j < argumentList.length; j++) {
        if (i === j) continue;

        const consumer = argumentList[j];
        if (!consumer) continue;

        const premiseSet = consumer.getPremiseSet();
        if (!premiseSet) continue;

        // The key check: object identity, not content!
        if (conclusionSet.equals(premiseSet)) {
          opportunities.push({
            providerId: provider.getId(),
            consumerId: consumer.getId(),
            sharedSetId: conclusionSet,
            connectionType: 'direct',
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Analyze connection paths through shared OrderedSets.
   * Finds transitive connections A->B->C where sets are shared.
   */
  analyzeConnectionPaths(
    argumentMap: Map<string, AtomicArgument>,
    startArgumentId: AtomicArgumentId,
  ): ConnectionPath[] {
    const paths: ConnectionPath[] = [];
    const visited = new Set<string>();

    const traverse = (
      currentId: AtomicArgumentId,
      path: AtomicArgumentId[],
      sharedSets: OrderedSetId[],
    ) => {
      if (visited.has(currentId.getValue())) {
        return; // Prevent cycles
      }

      visited.add(currentId.getValue());
      const current = argumentMap.get(currentId.getValue());
      if (!current) return;

      const conclusionSet = current.getConclusionSet();
      if (!conclusionSet) {
        visited.delete(currentId.getValue());
        return;
      }

      // Find all arguments that use this conclusion as premise
      for (const [id, arg] of argumentMap) {
        if (id === currentId.getValue()) continue;

        const premiseSet = arg.getPremiseSet();
        if (premiseSet && conclusionSet && premiseSet.equals(conclusionSet)) {
          const newPath = [...path, arg.getId()];
          const newSharedSets = [...sharedSets, conclusionSet];

          paths.push({
            steps: newPath,
            sharedSets: newSharedSets,
            length: newPath.length,
          });

          // Continue traversing
          traverse(arg.getId(), newPath, newSharedSets);
        }
      }

      visited.delete(currentId.getValue());
    };

    traverse(startArgumentId, [startArgumentId], []);
    return paths;
  }

  /**
   * Check if two OrderedSets have potential for connection
   * based on their statement overlap (weaker than identity).
   */
  analyzeSimilarity(set1: OrderedSet, set2: OrderedSet): SetSimilarity {
    const ids1 = new Set(set1.getStatementIds().map((id) => id.getValue()));
    const ids2 = new Set(set2.getStatementIds().map((id) => id.getValue()));

    const intersection = new Set([...ids1].filter((id) => ids2.has(id)));
    const union = new Set([...ids1, ...ids2]);

    return {
      sharedStatements: intersection.size,
      totalStatements: union.size,
      jaccardIndex: intersection.size / union.size,
      isIdentical: set1.isSameAs(set2),
    };
  }
}

// Types for service results
export interface ConnectionOpportunity {
  providerId: AtomicArgumentId; // Argument providing conclusion
  consumerId: AtomicArgumentId; // Argument consuming as premise
  sharedSetId: OrderedSetId; // The shared OrderedSet
  connectionType: 'direct' | 'transitive';
}

export interface ConnectionPath {
  steps: AtomicArgumentId[]; // Sequence of arguments in path
  sharedSets: OrderedSetId[]; // OrderedSets shared along path
  length: number; // Number of steps
}

export interface SetSimilarity {
  sharedStatements: number;
  totalStatements: number;
  jaccardIndex: number; // 0-1 similarity score
  isIdentical: boolean; // True if same object reference
}
