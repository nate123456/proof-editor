# Task D3: Domain Services

## Status
- **Phase**: 1 - Domain Layer
- **Priority**: High
- **Estimated Effort**: 3-4 hours
- **Dependencies**: D1 (Core entities), D2 (ProofDocument aggregate)
- **Blocks**: Application layer services

## Goal
Implement stateless domain services that encapsulate complex business logic not belonging to a single entity. These services work with domain entities to enforce business rules.

## Context
Domain services contain business logic that doesn't naturally fit within a single entity or value object. They are stateless and work with domain objects to perform operations.

## Required Implementation

### 1. OrderedSet Identity Service
Create `src/domain/services/OrderedSetIdentityService.ts`:
```typescript
import { OrderedSet, AtomicArgument } from '../core/index.js';
import { OrderedSetId, ArgumentId } from '../core/value-objects.js';

/**
 * Tracks and analyzes OrderedSet identity relationships.
 * This is THE core mechanism for discovering connections.
 */
export class OrderedSetIdentityService {
  /**
   * Find all arguments that could connect based on shared OrderedSet identity.
   * Returns pairs of arguments where conclusion of one IS premise of another.
   */
  findPotentialConnections(
    arguments: Map<string, AtomicArgument>
  ): ConnectionOpportunity[] {
    const opportunities: ConnectionOpportunity[] = [];
    const argumentList = Array.from(arguments.values());
    
    for (let i = 0; i < argumentList.length; i++) {
      const provider = argumentList[i];
      const conclusionSet = provider.getConclusionSet();
      if (!conclusionSet) continue;
      
      for (let j = 0; j < argumentList.length; j++) {
        if (i === j) continue;
        
        const consumer = argumentList[j];
        const premiseSet = consumer.getPremiseSet();
        if (!premiseSet) continue;
        
        // The key check: object identity, not content!
        if (conclusionSet === premiseSet) {
          opportunities.push({
            providerId: provider.getId(),
            consumerId: consumer.getId(),
            sharedSetId: conclusionSet.getId(),
            connectionType: 'direct'
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
    arguments: Map<string, AtomicArgument>,
    startArgumentId: ArgumentId
  ): ConnectionPath[] {
    const paths: ConnectionPath[] = [];
    const visited = new Set<string>();
    
    const traverse = (
      currentId: ArgumentId,
      path: ArgumentId[],
      sharedSets: OrderedSetId[]
    ) => {
      if (visited.has(currentId.getValue())) {
        return; // Prevent cycles
      }
      
      visited.add(currentId.getValue());
      const current = arguments.get(currentId.getValue());
      if (!current) return;
      
      const conclusionSet = current.getConclusionSet();
      if (!conclusionSet) {
        visited.delete(currentId.getValue());
        return;
      }
      
      // Find all arguments that use this conclusion as premise
      for (const [id, arg] of arguments) {
        if (id === currentId.getValue()) continue;
        
        const premiseSet = arg.getPremiseSet();
        if (premiseSet && premiseSet === conclusionSet) {
          const newPath = [...path, arg.getId()];
          const newSharedSets = [...sharedSets, conclusionSet.getId()];
          
          paths.push({
            steps: newPath,
            sharedSets: newSharedSets,
            length: newPath.length
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
    const ids1 = new Set(set1.getStatementIds().map(id => id.getValue()));
    const ids2 = new Set(set2.getStatementIds().map(id => id.getValue()));
    
    const intersection = new Set([...ids1].filter(id => ids2.has(id)));
    const union = new Set([...ids1, ...ids2]);
    
    return {
      sharedStatements: intersection.size,
      totalStatements: union.size,
      jaccardIndex: intersection.size / union.size,
      isIdentical: set1 === set2
    };
  }
}

// Types for service results
interface ConnectionOpportunity {
  providerId: ArgumentId;      // Argument providing conclusion
  consumerId: ArgumentId;      // Argument consuming as premise
  sharedSetId: OrderedSetId;   // The shared OrderedSet
  connectionType: 'direct' | 'transitive';
}

interface ConnectionPath {
  steps: ArgumentId[];         // Sequence of arguments in path
  sharedSets: OrderedSetId[]; // OrderedSets shared along path
  length: number;             // Number of steps
}

interface SetSimilarity {
  sharedStatements: number;
  totalStatements: number;
  jaccardIndex: number;      // 0-1 similarity score
  isIdentical: boolean;      // True if same object reference
}
```

### 2. Argument Compatibility Service
Create `src/domain/services/ArgumentCompatibilityService.ts`:
```typescript
import { AtomicArgument, OrderedSet, Statement } from '../core/index.js';
import { ArgumentId, StatementId } from '../core/value-objects.js';

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
    consumer: AtomicArgument
  ): CompatibilityResult {
    // Provider must have conclusions
    const providerConclusions = provider.getConclusionSet();
    if (!providerConclusions) {
      return {
        isCompatible: false,
        reason: 'Provider has no conclusions',
        compatibilityScore: 0
      };
    }
    
    // Consumer must have premises
    const consumerPremises = consumer.getPremiseSet();
    if (!consumerPremises) {
      return {
        isCompatible: false,
        reason: 'Consumer has no premises',
        compatibilityScore: 0
      };
    }
    
    // Check for direct identity match (strongest connection)
    if (providerConclusions === consumerPremises) {
      return {
        isCompatible: true,
        connectionType: 'identity',
        sharedOrderedSetId: providerConclusions.getId(),
        compatibilityScore: 1.0
      };
    }
    
    // Check for content overlap (weaker connection)
    const overlap = this.calculateStatementOverlap(
      providerConclusions,
      consumerPremises
    );
    
    if (overlap.overlapCount > 0) {
      return {
        isCompatible: true,
        connectionType: 'partial',
        overlapStatements: overlap.sharedStatements,
        compatibilityScore: overlap.overlapRatio
      };
    }
    
    return {
      isCompatible: false,
      reason: 'No statement overlap between conclusion and premise',
      compatibilityScore: 0
    };
  }
  
  /**
   * Find the best matches for an argument's premises.
   * Returns arguments that could provide required statements.
   */
  findPremiseProviders(
    consumer: AtomicArgument,
    availableArguments: Map<string, AtomicArgument>
  ): PremiseProvider[] {
    const providers: PremiseProvider[] = [];
    const consumerPremises = consumer.getPremiseSet();
    
    if (!consumerPremises) {
      return providers;
    }
    
    for (const [id, provider] of availableArguments) {
      if (id === consumer.getId().getValue()) continue;
      
      const compatibility = this.canConnect(provider, consumer);
      if (compatibility.isCompatible) {
        providers.push({
          providerId: provider.getId(),
          compatibility,
          providesStatements: provider.getConclusionSet()?.getStatementIds() || []
        });
      }
    }
    
    // Sort by compatibility score
    return providers.sort((a, b) => 
      b.compatibility.compatibilityScore - a.compatibility.compatibilityScore
    );
  }
  
  /**
   * Analyze statement overlap between OrderedSets.
   * Used for finding partial matches and suggestions.
   */
  private calculateStatementOverlap(
    set1: OrderedSet,
    set2: OrderedSet
  ): StatementOverlap {
    const ids1 = set1.getStatementIds();
    const ids2 = set2.getStatementIds();
    
    const shared: StatementId[] = [];
    for (const id1 of ids1) {
      if (ids2.some(id2 => id2.equals(id1))) {
        shared.push(id1);
      }
    }
    
    return {
      sharedStatements: shared,
      overlapCount: shared.length,
      overlapRatio: shared.length / Math.max(ids1.length, ids2.length)
    };
  }
}

// Types for service results
interface CompatibilityResult {
  isCompatible: boolean;
  reason?: string;
  connectionType?: 'identity' | 'partial';
  sharedOrderedSetId?: OrderedSetId;
  overlapStatements?: StatementId[];
  compatibilityScore: number; // 0-1
}

interface PremiseProvider {
  providerId: ArgumentId;
  compatibility: CompatibilityResult;
  providesStatements: StatementId[];
}

interface StatementOverlap {
  sharedStatements: StatementId[];
  overlapCount: number;
  overlapRatio: number;
}
```

### 3. Cycle Detection Service
Create `src/domain/services/CycleDetectionService.ts`:
```typescript
import { AtomicArgument, OrderedSet } from '../core/index.js';
import { ArgumentId, OrderedSetId } from '../core/value-objects.js';
import { DomainError } from '../core/DomainError.js';

/**
 * Detects circular dependencies in logical argument connections.
 * Ensures arguments don't depend on their own conclusions.
 */
export class CycleDetectionService {
  /**
   * Check if connecting two arguments would create a logical cycle.
   * Traces through argument dependencies via OrderedSet connections.
   */
  wouldCreateCycle(
    provider: AtomicArgument,
    consumer: AtomicArgument,
    arguments: Map<string, AtomicArgument>
  ): CycleDetection {
    // Build logical dependency graph based on OrderedSet connections
    const dependencies = this.buildLogicalDependencyGraph(arguments);
    
    // Check if consumer is reachable from provider (would create cycle)
    const visited = new Set<string>();
    const path: ArgumentId[] = [];
    
    const isReachable = (
      from: ArgumentId,
      to: ArgumentId,
      currentPath: ArgumentId[]
    ): boolean => {
      if (from.getValue() === to.getValue()) {
        return true;
      }
      
      if (visited.has(from.getValue())) {
        return false;
      }
      
      visited.add(from.getValue());
      currentPath.push(from);
      
      const deps = dependencies.get(from.getValue()) || [];
      for (const dep of deps) {
        if (isReachable(dep, to, [...currentPath])) {
          path.push(...currentPath, dep);
          return true;
        }
      }
      
      return false;
    };
    
    const wouldCycle = isReachable(consumer.getId(), provider.getId(), []);
    
    return {
      hasCycle: wouldCycle,
      cyclePath: wouldCycle ? path : undefined,
      description: wouldCycle
        ? `Logical cycle detected: ${path.map(id => id.getValue()).join(' -> ')}`
        : undefined
    };
  }
  
  /**
   * Find all existing cycles in argument connections.
   * Used for validation and integrity checking.
   */
  findAllCycles(
    arguments: Map<string, AtomicArgument>
  ): ArgumentCycle[] {
    const cycles: ArgumentCycle[] = [];
    const dependencies = this.buildLogicalDependencyGraph(arguments);
    
    // Tarjan's algorithm for finding strongly connected components
    let index = 0;
    const stack: ArgumentId[] = [];
    const indices = new Map<string, number>();
    const lowlinks = new Map<string, number>();
    const onStack = new Set<string>();
    
    const strongconnect = (v: ArgumentId) => {
      indices.set(v.getValue(), index);
      lowlinks.set(v.getValue(), index);
      index++;
      stack.push(v);
      onStack.add(v.getValue());
      
      const deps = dependencies.get(v.getValue()) || [];
      for (const w of deps) {
        if (!indices.has(w.getValue())) {
          strongconnect(w);
          lowlinks.set(
            v.getValue(),
            Math.min(
              lowlinks.get(v.getValue())!,
              lowlinks.get(w.getValue())!
            )
          );
        } else if (onStack.has(w.getValue())) {
          lowlinks.set(
            v.getValue(),
            Math.min(
              lowlinks.get(v.getValue())!,
              indices.get(w.getValue())!
            )
          );
        }
      }
      
      if (lowlinks.get(v.getValue()) === indices.get(v.getValue())) {
        const component: ArgumentId[] = [];
        let w: ArgumentId;
        do {
          w = stack.pop()!;
          onStack.delete(w.getValue());
          component.push(w);
        } while (w.getValue() !== v.getValue());
        
        if (component.length > 1) {
          cycles.push({
            argumentIds: component,
            length: component.length,
            sharedOrderedSets: this.findSharedSetsInCycle(component, arguments)
          });
        }
      }
    };
    
    for (const [argId, _] of arguments) {
      if (!indices.has(argId)) {
        const id = ArgumentId.create(argId);
        if (id && !(id instanceof DomainError)) {
          strongconnect(id);
        }
      }
    }
    
    return cycles;
  }
  
  /**
   * Analyze cycle severity based on argument types.
   * Some cycles might be acceptable in certain proof systems.
   */
  analyzeCycleSeverity(
    cycle: ArgumentCycle,
    arguments: Map<string, AtomicArgument>
  ): CycleSeverity {
    // Analyze the types of arguments in the cycle
    let hasDefinitions = false;
    let hasDeductions = false;
    
    for (const argId of cycle.argumentIds) {
      const arg = arguments.get(argId.getValue());
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
        reason: 'Cycle involves only definitional arguments'
      };
    }
    
    // Mixed or deductive cycles are problematic
    return {
      severity: 'high',
      isAcceptable: false,
      reason: 'Circular logical dependencies violate proof validity'
    };
  }
  
  /**
   * Build dependency graph based on OrderedSet connections.
   * An argument depends on arguments that provide its premises.
   */
  private buildLogicalDependencyGraph(
    arguments: Map<string, AtomicArgument>
  ): Map<string, ArgumentId[]> {
    const graph = new Map<string, ArgumentId[]>();
    
    for (const [consumerId, consumer] of arguments) {
      const deps: ArgumentId[] = [];
      const premiseSet = consumer.getPremiseSet();
      
      if (premiseSet) {
        // Find arguments that provide this premise set
        for (const [providerId, provider] of arguments) {
          if (providerId === consumerId) continue;
          
          const conclusionSet = provider.getConclusionSet();
          if (conclusionSet && conclusionSet === premiseSet) {
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
    cycleArgs: ArgumentId[],
    arguments: Map<string, AtomicArgument>
  ): OrderedSetId[] {
    const sharedSets: OrderedSetId[] = [];
    
    for (let i = 0; i < cycleArgs.length; i++) {
      const current = arguments.get(cycleArgs[i].getValue());
      const next = arguments.get(cycleArgs[(i + 1) % cycleArgs.length].getValue());
      
      if (current && next) {
        const currentConclusion = current.getConclusionSet();
        const nextPremise = next.getPremiseSet();
        
        if (currentConclusion && nextPremise && currentConclusion === nextPremise) {
          sharedSets.push(currentConclusion.getId());
        }
      }
    }
    
    return sharedSets;
  }
}

// Types for service results
interface CycleDetection {
  hasCycle: boolean;
  cyclePath?: ArgumentId[];
  description?: string;
}

interface ArgumentCycle {
  argumentIds: ArgumentId[];
  length: number;
  sharedOrderedSets: OrderedSetId[];
}

interface CycleSeverity {
  severity: 'low' | 'medium' | 'high';
  isAcceptable: boolean;
  reason: string;
}
```

### 4. Domain Service Specifications
Create `src/domain/specifications/ProofSpecifications.ts`:
```typescript
/**
 * Domain specifications encapsulate business rules as objects.
 * Can be composed and reused across the domain.
 */
export class CanCreateStatementSpec {
  isSatisfiedBy(content: string): boolean {
    return content.trim().length > 0 && content.length <= 1000;
  }
  
  reasonForDissatisfaction(content: string): string | null {
    if (content.trim().length === 0) {
      return 'Statement content cannot be empty';
    }
    if (content.length > 1000) {
      return 'Statement content exceeds maximum length';
    }
    return null;
  }
}

export class CanAttachNodeSpec {
  isSatisfiedBy(
    hasParentPremises: boolean,
    hasChildConclusions: boolean,
    isValidPosition: boolean
  ): boolean {
    return hasParentPremises && hasChildConclusions && isValidPosition;
  }
}

export class IsValidProofTreeSpec {
  isSatisfiedBy(
    hasRoot: boolean,
    hasNoCycles: boolean,
    allNodesConnected: boolean
  ): boolean {
    return hasRoot && hasNoCycles && allNodesConnected;
  }
}
```

## Testing Requirements

### Service Tests
```typescript
describe('OrderedSetIdentityService', () => {
  test('finds direct connections via shared OrderedSet identity', () => {
    const service = new OrderedSetIdentityService();
    
    // Create shared OrderedSet
    const sharedSet = OrderedSet.create([stmt1, stmt2]);
    
    // Two arguments sharing the set
    const arg1 = AtomicArgument.create(null, sharedSet);
    const arg2 = AtomicArgument.create(sharedSet, null);
    
    const connections = service.findPotentialConnections(
      new Map([
        [arg1.getId().getValue(), arg1],
        [arg2.getId().getValue(), arg2]
      ])
    );
    
    expect(connections).toHaveLength(1);
    expect(connections[0].sharedSetId).toBe(sharedSet.getId());
  });
});

describe('CycleDetectionService', () => {
  test('detects logical cycles in argument connections', () => {
    const service = new CycleDetectionService();
    
    // Create shared OrderedSets for connections
    const set1 = OrderedSet.create([stmt1]);
    const set2 = OrderedSet.create([stmt2]);
    const set3 = OrderedSet.create([stmt3]);
    
    // Create arguments that would form a cycle:
    // arg1: set1 -> set2
    // arg2: set2 -> set3  
    // arg3: set3 -> set1 (closes the cycle)
    const arg1 = AtomicArgument.create(set1, set2);
    const arg2 = AtomicArgument.create(set2, set3);
    const arg3 = AtomicArgument.create(set3, set1);
    
    const arguments = new Map([
      [arg1.getId().getValue(), arg1],
      [arg2.getId().getValue(), arg2],
      [arg3.getId().getValue(), arg3]
    ]);
    
    // Check if connecting arg3 to arg1 would create cycle
    const result = service.wouldCreateCycle(arg3, arg1, arguments);
    
    expect(result.hasCycle).toBe(true);
    expect(result.cyclePath).toBeDefined();
    expect(result.cyclePath?.length).toBe(3);
  });
  
  test('finds all cycles in argument graph', () => {
    const service = new CycleDetectionService();
    
    // Create arguments with cycles
    const arguments = createArgumentsWithCycle();
    
    const cycles = service.findAllCycles(arguments);
    
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0].sharedOrderedSets).toBeDefined();
  });
});
```

## Success Criteria
- [ ] All services are stateless (no instance variables)
- [ ] Services work with domain entities only
- [ ] Complex business logic properly encapsulated
- [ ] No infrastructure dependencies
- [ ] No repository injection in domain services
- [ ] NO spatial/visual concepts (trees, nodes, positions)
- [ ] Focus on logical connections through OrderedSets
- [ ] Comprehensive test coverage
- [ ] Clear service boundaries (single responsibility)

## Notes
- Domain services are stateless - they operate on entities
- If a service needs state, it should probably be an entity
- Services can call other services
- Keep services focused on single responsibility
- These services form the core business logic of proof construction
- Trees and attachments are PRESENTATION concerns, not domain
- Domain focuses on logical connections only