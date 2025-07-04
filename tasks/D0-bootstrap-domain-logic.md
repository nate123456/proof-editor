# Task D0: Bootstrap Domain Logic

## Status
- **Phase**: 1 - Domain Layer (Priority 0 - Must complete first!)
- **Priority**: Critical (Blocks all user interaction)
- **Estimated Effort**: 2-3 hours
- **Dependencies**: None
- **Blocks**: Everything - users can't start without this
- **COMPLETED**: ✅ All bootstrap functionality implemented and tested

## Goal
Implement bootstrap logic that allows users to start building proofs from scratch. The system must support creating empty atomic arguments and building up from nothing.

## Context
From CLAUDE.md: "Bootstrap: First atomic argument starts empty (no validation needed)"

This is CRITICAL - without bootstrap support, users cannot:
1. Create their first argument
2. Start with an empty document
3. Build proofs incrementally

## Required Implementation

### 1. Bootstrap Service
Create `src/domain/services/BootstrapService.ts`:
```typescript
import { Result, ok, err } from 'neverthrow';
import { ValidationError } from '../shared/errors.js';
import { ProofDocument } from '../aggregates/ProofDocument.js';
import { Statement, OrderedSet, AtomicArgument } from '../core/index.js';

/**
 * Handles bootstrap scenarios where users start from nothing.
 * This is the entry point for all proof construction.
 */
export class BootstrapService {
  /**
   * Initialize a new document with bootstrap support.
   * Creates an empty document ready for proof construction.
   */
  initializeEmptyDocument(): Result<ProofDocument, ValidationError> {
    const doc = ProofDocument.create();
    if (doc.isErr()) {
      return err(doc.error);
    }
    
    // Document starts completely empty - no statements, no arguments
    // User will add content through UI
    return ok(doc.value);
  }
  
  /**
   * Create the first atomic argument in a document.
   * This is the bootstrap case - no premises or conclusions yet.
   */
  createBootstrapArgument(
    document: ProofDocument
  ): Result<BootstrapResult, ValidationError> {
    // Create empty atomic argument
    const emptyArg = document.createAtomicArgument(null, null);
    if (emptyArg.isErr()) {
      return err(emptyArg.error);
    }
    
    // Create initial tree for the argument
    const tree = document.createTree(Position2D.create(100, 100));
    if (tree.isErr()) {
      return err(tree.error);
    }
    
    // Add empty argument as root node
    const node = document.createRootNode(
      tree.value.getId(),
      emptyArg.value.getId()
    );
    if (node.isErr()) {
      return err(node.error);
    }
    
    return ok({
      argument: emptyArg.value,
      tree: tree.value,
      node: node.value,
      instructions: 'Click the empty implication line to add premises and conclusions'
    });
  }
  
  /**
   * Transform empty argument into one with content.
   * This is how users build up from bootstrap state.
   */
  populateEmptyArgument(
    document: ProofDocument,
    argumentId: ArgumentId,
    premiseContents: string[],
    conclusionContents: string[]
  ): Result<PopulationResult, ValidationError> {
    const argument = document.getArgument(argumentId);
    if (!argument) {
      return err(new ValidationError('Argument not found'));
    }
    
    // Verify it's actually empty (bootstrap state)
    if (argument.getPremiseSet() || argument.getConclusionSet()) {
      return err(new ValidationError('Argument is not empty'));
    }
    
    // Create statements for premises
    const premiseStatements: Statement[] = [];
    for (const content of premiseContents) {
      const stmt = document.createStatement(content);
      if (stmt.isErr()) {
        return err(stmt.error);
      }
      premiseStatements.push(stmt.value);
    }
    
    // Create statements for conclusions
    const conclusionStatements: Statement[] = [];
    for (const content of conclusionContents) {
      const stmt = document.createStatement(content);
      if (stmt.isErr()) {
        return err(stmt.error);
      }
      conclusionStatements.push(stmt.value);
    }
    
    // Create ordered sets (can be empty!)
    const premiseSet = premiseStatements.length > 0
      ? document.createOrderedSet(premiseStatements.map(s => s.getId()))
      : null;
      
    const conclusionSet = conclusionStatements.length > 0
      ? document.createOrderedSet(conclusionStatements.map(s => s.getId()))
      : null;
    
    if (premiseSet?.isErr()) {
      return err(premiseSet.error);
    }
    if (conclusionSet?.isErr()) {
      return err(conclusionSet.error);
    }
    
    // Create new argument with content
    const newArg = document.createAtomicArgument(
      premiseSet?.value || null,
      conclusionSet?.value || null
    );
    if (newArg.isErr()) {
      return err(newArg.error);
    }
    
    // Need to update tree node to point to new argument
    // This is handled by tree update operations
    
    return ok({
      oldArgumentId: argumentId,
      newArgument: newArg.value,
      premiseStatements,
      conclusionStatements
    });
  }
  
  /**
   * Check if document is in bootstrap state.
   * Useful for UI to show appropriate helpers.
   */
  isBootstrapState(document: ProofDocument): BootstrapStatus {
    const stats = document.getStats();
    
    if (stats.statementCount === 0 && stats.argumentCount === 0) {
      return {
        isBootstrap: true,
        stage: 'empty-document',
        nextAction: 'Create your first argument'
      };
    }
    
    if (stats.argumentCount === 1 && stats.statementCount === 0) {
      return {
        isBootstrap: true,
        stage: 'empty-argument',
        nextAction: 'Add premises and conclusions to your argument'
      };
    }
    
    if (stats.treeCount === 0 && stats.argumentCount > 0) {
      return {
        isBootstrap: true,
        stage: 'no-trees',
        nextAction: 'Create a tree to visualize your arguments'
      };
    }
    
    return {
      isBootstrap: false,
      stage: 'active',
      nextAction: null
    };
  }
}

// Types for bootstrap operations
interface BootstrapResult {
  argument: AtomicArgument;
  tree: ProofTree;
  node: ProofNode;
  instructions: string;
}

interface PopulationResult {
  oldArgumentId: ArgumentId;
  newArgument: AtomicArgument;
  premiseStatements: Statement[];
  conclusionStatements: Statement[];
}

interface BootstrapStatus {
  isBootstrap: boolean;
  stage: 'empty-document' | 'empty-argument' | 'no-trees' | 'active';
  nextAction: string | null;
}
```

### 2. Empty State Specifications
Create `src/domain/specifications/BootstrapSpecifications.ts`:
```typescript
/**
 * Specifications for bootstrap and empty state validation.
 * These override normal validation rules.
 */
export class CanCreateEmptyArgumentSpec {
  isSatisfiedBy(document: ProofDocument): boolean {
    // Always allow first argument to be empty
    return document.getStats().argumentCount === 0;
  }
}

export class CanHaveEmptyOrderedSetSpec {
  isSatisfiedBy(context: 'bootstrap' | 'normal'): boolean {
    // Only in bootstrap context
    return context === 'bootstrap';
  }
}

export class RequiresValidationSpec {
  isSatisfiedBy(
    argumentCount: number,
    statementCount: number
  ): boolean {
    // No validation needed for bootstrap
    if (argumentCount === 0 || statementCount === 0) {
      return false;
    }
    return true;
  }
}
```

### 3. Bootstrap-Aware Entity Methods
Update entities to support bootstrap:

```typescript
// In Statement.ts
export class Statement {
  static createPlaceholder(): Statement {
    // For UI placeholder before user types
    return new Statement(
      StatementId.generate(),
      new StatementContent('[Enter text]'),
      Timestamps.create()
    );
  }
}

// In OrderedSet.ts  
export class OrderedSet {
  static createEmpty(): Result<OrderedSet, ValidationError> {
    // Explicitly allow empty for bootstrap
    return ok(new OrderedSet(
      OrderedSetId.generate(),
      [],
      Timestamps.create()
    ));
  }
  
  isEmpty(): boolean {
    return this.statementIds.length === 0;
  }
}

// In AtomicArgument.ts
export class AtomicArgument {
  static createBootstrap(): AtomicArgument {
    // Bypass all validation for bootstrap
    return new AtomicArgument(
      ArgumentId.generate(),
      null,
      null,
      Timestamps.create()
    );
  }
  
  isBootstrap(): boolean {
    return !this.premiseSet && !this.conclusionSet;
  }
  
  canPopulate(): boolean {
    // Can only populate if currently empty
    return this.isBootstrap();
  }
}
```

### 4. Bootstrap Domain Events
Add bootstrap-specific events:

```typescript
// Domain events for bootstrap operations
export interface BootstrapArgumentCreated {
  type: 'BootstrapArgumentCreated';
  aggregateId: string;
  payload: {
    argumentId: string;
    treeId: string;
    timestamp: Date;
  };
}

export interface BootstrapArgumentPopulated {
  type: 'BootstrapArgumentPopulated';
  aggregateId: string;
  payload: {
    oldArgumentId: string;
    newArgumentId: string;
    premiseCount: number;
    conclusionCount: number;
  };
}
```

## Testing Requirements

### Bootstrap Tests
```typescript
describe('BootstrapService', () => {
  test('creates empty document ready for use', () => {
    const service = new BootstrapService();
    const doc = service.initializeEmptyDocument();
    
    expect(doc.isOk()).toBe(true);
    expect(doc.value.getStats()).toEqual({
      statementCount: 0,
      argumentCount: 0,
      treeCount: 0
    });
  });
  
  test('creates bootstrap argument with tree', () => {
    const service = new BootstrapService();
    const doc = service.initializeEmptyDocument().value;
    
    const result = service.createBootstrapArgument(doc);
    expect(result.isOk()).toBe(true);
    expect(result.value.argument.isBootstrap()).toBe(true);
    expect(result.value.tree).toBeDefined();
  });
  
  test('populates empty argument with content', () => {
    const service = new BootstrapService();
    const doc = service.initializeEmptyDocument().value;
    const bootstrap = service.createBootstrapArgument(doc).value;
    
    const result = service.populateEmptyArgument(
      doc,
      bootstrap.argument.getId(),
      ['All men are mortal', 'Socrates is a man'],
      ['Socrates is mortal']
    );
    
    expect(result.isOk()).toBe(true);
    expect(result.value.premiseStatements).toHaveLength(2);
    expect(result.value.conclusionStatements).toHaveLength(1);
  });
  
  test('correctly identifies bootstrap stages', () => {
    const service = new BootstrapService();
    const doc = service.initializeEmptyDocument().value;
    
    let status = service.isBootstrapState(doc);
    expect(status.stage).toBe('empty-document');
    
    service.createBootstrapArgument(doc);
    status = service.isBootstrapState(doc);
    expect(status.stage).toBe('empty-argument');
  });
});
```

## Success Criteria
- [ ] Users can start with completely empty document
- [ ] First argument can be created with no content
- [ ] Empty OrderedSets allowed in bootstrap context
- [ ] Bootstrap state properly detected and communicated
- [ ] Smooth transition from empty to populated state
- [ ] No validation errors during bootstrap
- [ ] Clear instructions for next steps
- [ ] Bootstrap events properly emitted

## Notes
- Bootstrap is THE critical path for user onboarding
- Must feel natural and intuitive
- No errors or validation during initial creation
- Progressive disclosure - complexity comes later
- UI should guide through bootstrap stages
- Consider tutorial/onboarding overlay