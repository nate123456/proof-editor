# LSP Tree Querying Strategy

## Overview

This document defines the tree querying strategy for efficient traversal and manipulation of proof structures in the LSP layer. Based on research into mature tree technologies, we propose a hybrid approach optimizing for proof-specific navigation patterns.

## Core Requirements

### Navigation Patterns
- **Upward traversal**: Navigate to parent, grandparent, root ("parent of parent's parent")
- **Root finding**: Locate the "final base tree root" from any node
- **Deep drilling**: Traverse node → atomic argument → premise/conclusion → statements → characters
- **Bidirectional**: Support both ancestor and descendant navigation
- **Cross-branch**: Navigate between sibling branches and cousins

### Performance Requirements
- Real-time query response (<50ms for common queries)
- Incremental updates on document changes
- Efficient handling of large proof trees (10,000+ atomic arguments)
- Minimal memory overhead for query caching

## Technology Analysis

### Tree-sitter (Foundation Layer)
**Strengths**:
- Incremental parsing with real-time updates
- Already integrated in VS Code
- S-expression query language
- Proven performance at scale

**Limitations**:
- Designed for programming languages, not proof structures
- Limited ancestor navigation

### XPath 3.1 (Query Model)
**Strengths**:
- Comprehensive axis navigation (ancestor, descendant, parent, child, sibling)
- 20+ years of optimization
- Bidirectional traversal

**Trade-offs**:
- 3x slower than CSS for simple queries
- Worth it for complex traversals

### CSS Selectors (Fast Path)
**Strengths**:
- 30% faster than XPath for downward queries
- Simple, familiar syntax

**Limitations**:
- Forward-only (no ancestor navigation)
- Use only for known downward paths

## Proposed Hybrid Architecture

### Layer 1: Tree-sitter Grammar
Define proof structures as Tree-sitter grammar:

```scm
; Tree-sitter grammar for proof structures
(document
  (argument_tree)+)

(argument_tree
  root: (atomic_argument)
  connections: (connection_set))

(atomic_argument
  id: (identifier)
  premises: (ordered_set (statement)+)?
  conclusions: (ordered_set (statement)+)?
  line: (implication_line))

(statement
  text: (string_content)
  position: (integer))

(connection
  from: (conclusion_ref)
  to: (premise_ref))
```

### Layer 2: Query Language (ProofPath)
Custom query language inspired by XPath, optimized for proofs:

```
// Basic axes
parent::atomic_argument
ancestor::argument_tree
descendant::statement
child::ordered_set

// Specialized proof axes
premise-parent::atomic_argument    // AA containing this as premise
conclusion-child::atomic_argument  // AA using this as conclusion
proof-root::argument_tree         // Ultimate root of tree

// Deep drilling
/atomic_argument/premises/statement[2]/characters

// Complex queries
ancestor::atomic_argument[premises/statement = "P → Q"]/proof-root::argument_tree
```

### Layer 3: Performance Optimization

#### Query Result Cache
```typescript
interface QueryCache {
  // Cache keyed by query + node context
  results: Map<string, QueryResult>;
  
  // Invalidation based on document changes
  invalidate(change: DocumentChange): void;
  
  // LRU eviction for memory management
  evict(): void;
}
```

#### Common Query Fast Paths
Pre-compute and cache:
1. Parent pointers for O(1) ancestor access
2. Root references for each node
3. Connection indices for rapid traversal

## Query Language Specification

### Axis Navigation
| Axis | Description | Performance |
|------|-------------|-------------|
| `parent::` | Immediate parent | O(1) with cache |
| `ancestor::` | All ancestors | O(h) where h=height |
| `ancestor-or-self::` | Node + ancestors | O(h) |
| `child::` | Immediate children | O(1) |
| `descendant::` | All descendants | O(n) subtree size |
| `descendant-or-self::` | Node + descendants | O(n) |
| `premise-parent::` | AA containing as premise | O(1) indexed |
| `conclusion-child::` | AA using as conclusion | O(k) connections |
| `proof-root::` | Tree root | O(1) cached |
| `connected::` | All connected AAs | O(m) edges |

### Node Tests
```
atomic_argument           // Any atomic argument
atomic_argument[@id='x']  // Specific ID
statement                 // Any statement
statement[1]             // First statement (1-indexed)
ordered_set[@type='premises']  // Premise set
```

### Predicates
```
[premises/statement = "P"]     // Has premise "P"
[count(premises/*) > 2]        // More than 2 premises
[connected::atomic_argument]   // Has connections
[@id = parent::*/@id]         // Self-reference check
```

### Functions
```
text()          // String content
position()      // Position in parent
count()         // Child count
root()          // Document root
proof-root()    // Argument tree root
```

## Implementation Examples

### Finding Root from Any Node
```typescript
// ProofPath query
const rootQuery = "proof-root::argument_tree";

// Optimized implementation
function findProofRoot(node: ProofNode): ArgumentTree {
  // O(1) with caching
  if (node.cachedRoot) return node.cachedRoot;
  
  // O(h) traversal with parent pointers
  let current = node;
  while (current.parent) {
    current = current.parent;
  }
  
  // Cache for future queries
  node.cachedRoot = current as ArgumentTree;
  return node.cachedRoot;
}
```

### Parent Navigation Chain
```typescript
// ProofPath: "parent::*/parent::*/parent::*"
// Or: "ancestor::*[3]"

function getAncestor(node: ProofNode, level: number): ProofNode | null {
  let current = node;
  for (let i = 0; i < level && current; i++) {
    current = current.parent;
  }
  return current;
}
```

### Deep Drilling Example
```typescript
// ProofPath: "/atomic_argument[@id='AA1']/premises/statement[2]/text()"

function drillToText(
  atomicArg: AtomicArgument, 
  premiseIndex: number
): string {
  return atomicArg
    .premises
    .statements[premiseIndex - 1]  // Convert to 0-indexed
    .text;
}
```

### Complex Traversal
```typescript
// Find all atomic arguments that use conclusion "Q" as a premise
// ProofPath: "//statement[text()='Q']/conclusion-child::atomic_argument"

function findConclusionUsers(conclusion: string): AtomicArgument[] {
  // Use pre-built index for O(1) lookup
  return conclusionIndex.get(conclusion) || [];
}
```

## Performance Optimization Strategies

### 1. Index Building
Build indices during initial parse:
```typescript
interface ProofIndices {
  parentPointers: Map<NodeId, NodeId>;
  rootCache: Map<NodeId, NodeId>;
  conclusionToPremise: Map<string, Set<AtomicArgumentId>>;
  premiseToConclusion: Map<string, Set<AtomicArgumentId>>;
  nodePositions: Map<NodeId, Position>;
}
```

### 2. Incremental Updates
Update indices on document changes:
```typescript
function updateIndices(change: DocumentChange) {
  // Only recompute affected paths
  const affected = findAffectedNodes(change);
  
  for (const node of affected) {
    updateParentPointers(node);
    invalidateRootCache(node);
    updateConnectionIndices(node);
  }
}
```

### 3. Query Planning
Optimize query execution:
```typescript
class QueryPlanner {
  plan(query: ProofPath): ExecutionPlan {
    // Analyze query for optimization opportunities
    const steps = parse(query);
    
    // Use indices when available
    if (steps[0].axis === 'descendant' && steps[0].test === 'statement') {
      return new IndexedStatementPlan(steps);
    }
    
    // Default traversal
    return new TraversalPlan(steps);
  }
}
```

### 4. Result Caching
Cache frequently used queries:
```typescript
class QueryCache {
  private cache = new LRUCache<string, QueryResult>(1000);
  
  execute(query: string, context: ProofNode): QueryResult {
    const key = `${query}:${context.id}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    const result = this.executeQuery(query, context);
    this.cache.set(key, result);
    return result;
  }
}
```

## LSP Protocol Integration

### Query Request
```typescript
interface ProofQueryRequest {
  method: 'proof/query';
  params: {
    textDocument: TextDocumentIdentifier;
    query: string;  // ProofPath expression
    context?: {     // Optional starting node
      nodeId: string;
    };
  };
}

interface ProofQueryResponse {
  results: ProofNode[];
  executionTime: number;  // Milliseconds
}
```

### Navigation Request
```typescript
interface ProofNavigateRequest {
  method: 'proof/navigate';
  params: {
    textDocument: TextDocumentIdentifier;
    from: NodeIdentifier;
    axis: NavigationAxis;
    steps?: number;  // For ancestor[n] navigation
  };
}

type NavigationAxis = 
  | 'parent' 
  | 'ancestor' 
  | 'proof-root'
  | 'premise-parent'
  | 'conclusion-child';
```

## Benchmarks and Performance Targets

### Query Performance Targets
| Query Type | Target | Rationale |
|------------|--------|-----------|
| parent:: | <1ms | Direct pointer access |
| ancestor:: (full chain) | <5ms | O(h) traversal |
| proof-root:: | <1ms | Cached access |
| descendant:: (full tree) | <50ms | Full subtree scan |
| Complex predicate | <100ms | Multiple traversals |

### Scalability Targets
- 10,000 atomic arguments: All queries <100ms
- 100,000 atomic arguments: Common queries <100ms, complex <500ms
- Memory overhead: <10% of document size for indices

## Migration Path

### Phase 1: Tree-sitter Grammar
1. Define proof structure grammar
2. Integrate with existing parser
3. Validate against test documents

### Phase 2: Basic Navigation
1. Implement parent/child axes
2. Add ancestor/descendant support
3. Build initial index structures

### Phase 3: Proof-Specific Features
1. Add premise-parent/conclusion-child axes
2. Implement proof-root navigation
3. Optimize with caching

### Phase 4: Advanced Queries
1. Full ProofPath language support
2. Query planner optimization
3. Performance monitoring

## Future Enhancements

### Streaming Queries
For massive documents, support streaming results:
```typescript
interface StreamingQuery {
  query: string;
  onResult: (node: ProofNode) => void;
  onComplete: () => void;
}
```

### Query Composition
Build complex queries from simpler parts:
```typescript
const baseQuery = new QueryBuilder()
  .descendant('atomic_argument')
  .where('premises/statement', 'contains', 'P');

const extendedQuery = baseQuery
  .ancestor('argument_tree')
  .child('atomic_argument');
```

### Visual Query Builder
LSP support for interactive query construction with real-time preview.

## References
- Tree-sitter documentation
- XPath 3.1 specification
- VS Code Language Server Protocol
- Performance analysis of tree query languages