# Task A1: Commands and Queries

## Status
- **Phase**: 2 - Application Layer
- **Priority**: High  
- **Estimated Effort**: 4-5 hours
- **Dependencies**: None (DTOs only, no domain dependency)
- **Blocks**: A2 (Mappers), A3 (Application Service)

## Goal
Define command and query DTOs that form the application's public API. These DTOs define the boundaries between the presentation layer and application layer, following CQRS principles.

## Context
Commands represent intentions to change state, while queries represent requests for information. DTOs ensure the domain model is never exposed to outer layers.

## Required Implementation

### 1. Command DTOs
Create `src/application/commands/statement-commands.ts`:
```typescript
// Commands are simple data structures - no behavior
export interface CreateStatementCommand {
  documentId: string;
  content: string;
}

export interface UpdateStatementCommand {
  documentId: string;
  statementId: string;
  content: string;
}

export interface DeleteStatementCommand {
  documentId: string;
  statementId: string;
}
```

Create `src/application/commands/orderedset-commands.ts`:
```typescript
export interface CreateOrderedSetCommand {
  documentId: string;
  statementIds: string[];
}

// Note: OrderedSets are typically created implicitly when creating arguments
// This command might be used for explicit creation in advanced scenarios
```

Create `src/application/commands/argument-commands.ts`:
```typescript
export interface CreateAtomicArgumentCommand {
  documentId: string;
  premiseStatementIds: string[];    // Will create/find OrderedSet
  conclusionStatementIds: string[]; // Will create/find OrderedSet
  sideLabel?: {
    left?: string;
    right?: string;
  };
}

export interface UpdateArgumentSideLabelsCommand {
  documentId: string;
  argumentId: string;
  sideLabels: {
    left?: string;
    right?: string;
  };
}
```

Create `src/application/commands/tree-commands.ts`:
```typescript
export interface CreateTreeCommand {
  documentId: string;
  position: {
    x: number;
    y: number;
  };
}

export interface MoveTreeCommand {
  documentId: string;
  treeId: string;
  position: {
    x: number;
    y: number;
  };
}

export interface CreateRootNodeCommand {
  documentId: string;
  treeId: string;
  argumentId: string;
}

export interface AttachNodeCommand {
  documentId: string;
  treeId: string;
  argumentId: string;
  parentNodeId: string;
  premisePosition: number;
  fromPosition?: number; // For multi-conclusion arguments
}

export interface DetachNodeCommand {
  documentId: string;
  treeId: string;
  nodeId: string;
}

// Branch creation - core workflow!
export interface CreateBranchFromSelectionCommand {
  documentId: string;
  sourceArgumentId: string;
  selectedText: string;
  position: 'premise' | 'conclusion';
  newTreeId?: string; // Optional: create in new tree
}

// Batch operations
export interface BatchCreateStatementsCommand {
  documentId: string;
  statements: Array<{
    content: string;
    externalId?: string; // For import tracking
  }>;
}

export interface BatchAttachNodesCommand {
  documentId: string;
  treeId: string;
  attachments: Array<{
    argumentId: string;
    parentNodeId: string;
    premisePosition: number;
  }>;
}
```

Create `src/application/commands/document-commands.ts`:
```typescript
export interface CreateDocumentCommand {
  // Empty for now - documents created with defaults
}

export interface LoadDocumentCommand {
  path: string;
}

export interface SaveDocumentCommand {
  documentId: string;
  path?: string; // Optional for save-as
}

export interface ImportDocumentCommand {
  yamlContent: string;
  path?: string;
}

export interface ExportDocumentCommand {
  documentId: string;
  format: 'yaml' | 'json' | 'svg';
}

export interface ValidateDocumentCommand {
  documentId: string;
  includeCustomScripts?: boolean;
}
```

Create `src/application/commands/validation-commands.ts`:
```typescript
export interface RunCustomValidationScriptCommand {
  documentId: string;
  scriptContent: string;
  scriptId?: string;
}

export interface ValidateProofPathCommand {
  documentId: string;
  fromNodeId: string;
  toNodeId: string;
}
```

Create `src/application/commands/bootstrap-commands.ts`:
```typescript
// Bootstrap commands for initial document state
export interface InitializeEmptyDocumentCommand {
  documentId: string;
}

export interface CreateBootstrapArgumentCommand {
  documentId: string;
  treeId: string;
  position?: {
    x: number;
    y: number;
  };
}

export interface PopulateEmptyArgumentCommand {
  documentId: string;
  argumentId: string;
  premiseContents: string[];
  conclusionContents: string[];
  sideLabels?: {
    left?: string;
    right?: string;
  };
}
```

### 2. Query DTOs
Create `src/application/queries/statement-queries.ts`:
```typescript
export interface GetStatementQuery {
  documentId: string;
  statementId: string;
}

export interface ListStatementsQuery {
  documentId: string;
  filter?: {
    unused?: boolean;      // Only unused statements
    searchText?: string;   // Content contains text
  };
}

export interface StatementDTO {
  id: string;
  content: string;
  usageCount: number;
  createdAt: string;
  modifiedAt: string;
}

// Statement flow analysis
export interface TraceStatementFlowQuery {
  documentId: string;
  statementId: string;
  maxDepth?: number;
}

export interface GetStatementUsageQuery {
  documentId: string;
  statementId: string;
}

export interface StatementFlowDTO {
  statementId: string;
  usedIn: Array<{
    orderedSetId: string;
    argumentId: string;
    role: 'premise' | 'conclusion';
  }>;
  flowPaths: Array<{
    path: string[];
    distance: number;
  }>;
}
```

Create `src/application/queries/connection-queries.ts`:
```typescript
export interface FindConnectionsQuery {
  documentId: string;
  argumentId?: string;      // Connections for specific argument
  orderedSetId?: string;    // Arguments using this OrderedSet
}

export interface GetConnectionPathsQuery {
  documentId: string;
  fromArgumentId: string;
  toArgumentId?: string;    // Optional: find paths to specific target
  maxDepth?: number;        // Limit search depth
}

export interface ConnectionDTO {
  providerId: string;       // Argument providing conclusion
  consumerId: string;       // Argument consuming as premise  
  sharedOrderedSetId: string;
  connectionType: 'direct' | 'transitive';
}

export interface ConnectionPathDTO {
  steps: string[];          // Argument IDs in sequence
  sharedSets: string[];     // OrderedSet IDs along path
  totalLength: number;
}
```

Create `src/application/queries/tree-queries.ts`:
```typescript
export interface GetTreeQuery {
  documentId: string;
  treeId: string;
}

export interface ListTreesQuery {
  documentId: string;
}

export interface GetTreeStructureQuery {
  documentId: string;
  treeId: string;
  includeArguments?: boolean; // Include argument details
}

export interface TreeDTO {
  id: string;
  position: {
    x: number;
    y: number;
  };
  bounds?: {
    width: number;
    height: number;
  };
  nodeCount: number;
  rootNodeIds: string[];
}

export interface TreeStructureDTO {
  treeId: string;
  nodes: TreeNodeDTO[];
  connections: NodeConnectionDTO[];
  depth: number;
  breadth: number;
}

// Tree analysis queries
export interface GetTreeDepthQuery {
  documentId: string;
  treeId: string;
}

export interface GetTreeBranchesQuery {
  documentId: string;
  treeId: string;
  fromNodeId: string;
}

export interface FindPathBetweenNodesQuery {
  documentId: string;
  treeId: string;
  fromNodeId: string;
  toNodeId: string;
}

export interface GetSubtreeQuery {
  documentId: string;
  treeId: string;
  rootNodeId: string;
  maxDepth?: number;
}

export interface TreeNodeDTO {
  nodeId: string;
  argumentId: string;
  position?: {           // Computed position for rendering
    x: number;
    y: number;
  };
  isRoot: boolean;
  argument?: AtomicArgumentDTO; // If includeArguments=true
}

export interface NodeConnectionDTO {
  fromNodeId: string;
  toNodeId: string;
  premisePosition: number;
  fromPosition?: number;
}
```

Create `src/application/queries/document-queries.ts`:
```typescript
export interface GetDocumentQuery {
  documentId: string;
}

export interface GetDocumentStateQuery {
  documentId: string;
  includeStats?: boolean;
}

export interface DocumentDTO {
  id: string;
  version: number;
  createdAt: string;
  modifiedAt: string;
  statements: Record<string, StatementDTO>;
  orderedSets: Record<string, OrderedSetDTO>;
  atomicArguments: Record<string, AtomicArgumentDTO>;
  trees: Record<string, TreeDTO>;
  stats?: DocumentStatsDTO;
}

export interface DocumentStatsDTO {
  statementCount: number;
  argumentCount: number;
  treeCount: number;
  connectionCount: number;
  unusedStatements: string[];
  unconnectedArguments: string[];
  cyclesDetected: Array<{
    path: string[];
    severity: 'low' | 'medium' | 'high';
  }>;
  validationStatus: {
    isValid: boolean;
    errors: ValidationErrorDTO[];
  };
}

// Validation queries
export interface GetValidationReportQuery {
  documentId: string;
  includeCustomScripts?: boolean;
}

export interface AnalyzeProofStructureQuery {
  documentId: string;
  analysisType: 'completeness' | 'consistency' | 'complexity';
}

export interface ValidationErrorDTO {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: {
    treeId?: string;
    nodeId?: string;
    argumentId?: string;
  };
}

export interface OrderedSetDTO {
  id: string;
  statementIds: string[];
  usageCount: number;
  usedBy: Array<{
    argumentId: string;
    usage: 'premise' | 'conclusion';
  }>;
}

export interface AtomicArgumentDTO {
  id: string;
  premiseSetId: string | null;
  conclusionSetId: string | null;
  sideLabels?: {
    left?: string;
    right?: string;
  };
}
```

Create `src/application/queries/bootstrap-queries.ts`:
```typescript
export interface GetBootstrapStatusQuery {
  documentId: string;
}

export interface GetBootstrapInstructionsQuery {
  documentId: string;
  context?: 'empty_document' | 'empty_argument' | 'first_connection';
}

export interface BootstrapStatusDTO {
  isInBootstrapState: boolean;
  hasEmptyArguments: boolean;
  hasStatements: boolean;
  hasConnections: boolean;
  nextSteps: string[];
  currentPhase: 'empty' | 'first_argument' | 'populating' | 'complete';
}

export interface BootstrapInstructionsDTO {
  instructions: string[];
  availableActions: string[];
  exampleCommands?: Array<{
    description: string;
    command: string;
  }>;
}
```

### 3. Operation Results
Create `src/application/dtos/operation-results.ts`:
```typescript
// Add operation metadata pattern from existing code
export interface OperationMetadata {
  operationId: string;
  timestamp: string;
  userId?: string;
  correlationId?: string;
  source?: 'user' | 'system' | 'import';
}

// Extend commands with metadata
export interface CommandWithMetadata<T> {
  metadata: OperationMetadata;
  payload: T;
}
```

Continue with existing operation results:
```typescript
// Consistent result structure for all operations
export interface CommandResult<T = void> {
  success: boolean;
  data?: T;
  error?: ErrorDTO;
  events?: EventDTO[];
}

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: ErrorDTO;
}

export interface ErrorDTO {
  code: string;
  message: string;
  details?: any;
}

export interface EventDTO {
  type: string;
  payload: Record<string, any>;
  timestamp: string;
}

// Specific command results
export interface CreateStatementResult {
  statementId: string;
  statement: StatementDTO;
}

export interface CreateArgumentResult {
  argumentId: string;
  argument: AtomicArgumentDTO;
  createdOrderedSets?: string[]; // IDs of any newly created OrderedSets
}

export interface AttachNodeResult {
  nodeId: string;
  treeStructure: TreeStructureDTO; // Updated tree structure
}

export interface BranchCreationResult {
  newStatement: StatementDTO;
  newArgument: AtomicArgumentDTO;
  connectionPoint: {
    sourceArgumentId: string;
    targetArgumentId: string;
    sharedOrderedSetId: string;
  };
  newTreeId?: string; // If created in new tree
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorDTO[];
  warnings: ValidationErrorDTO[];
  customScriptResults?: Array<{
    scriptId: string;
    passed: boolean;
    messages: string[];
  }>;
}

export interface ImportResult {
  documentId: string;
  stats: {
    statementsImported: number;
    argumentsImported: number;
    treesImported: number;
    errors: string[];
  };
}

export interface BootstrapResult {
  success: boolean;
  phase: 'empty' | 'first_argument' | 'populating' | 'complete';
  createdEntities?: {
    argumentId?: string;
    treeId?: string;
    statementIds?: string[];
    orderedSetIds?: string[];
  };
  nextSteps: string[];
}
```

### 4. Pagination and Filtering
Create `src/application/dtos/common-patterns.ts`:
```typescript
export interface PaginationParams {
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface FilterParams<T> {
  where?: Partial<T>;
  include?: string[];
  exclude?: string[];
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

// Field selection for GraphQL-style queries
export interface FieldSelection {
  fields?: string[];
  expand?: string[];
  depth?: number;
}
```

### 5. Validation Rules
Create `src/application/validation/command-validators.ts`:
```typescript
// Application-level validation (not domain rules)
export class CommandValidator {
  static validateCreateStatement(cmd: CreateStatementCommand): string[] {
    const errors: string[] = [];
    
    if (!cmd.documentId) {
      errors.push('Document ID is required');
    }
    
    if (!cmd.content) {
      errors.push('Statement content is required');
    }
    
    return errors;
  }
  
  static validateAttachNode(cmd: AttachNodeCommand): string[] {
    const errors: string[] = [];
    
    if (!cmd.documentId) errors.push('Document ID is required');
    if (!cmd.treeId) errors.push('Tree ID is required');
    if (!cmd.argumentId) errors.push('Argument ID is required');
    if (!cmd.parentNodeId) errors.push('Parent node ID is required');
    if (cmd.premisePosition < 0) errors.push('Premise position must be non-negative');
    
    return errors;
  }
  
  // ... validators for other commands
}
```

## Testing Requirements

### DTO Tests
```typescript
describe('Command DTOs', () => {
  test('CreateStatementCommand structure', () => {
    const command: CreateStatementCommand = {
      documentId: 'doc123',
      content: 'All men are mortal'
    };
    
    expect(command).toHaveProperty('documentId');
    expect(command).toHaveProperty('content');
  });
  
  test('Command validation', () => {
    const invalidCommand: CreateStatementCommand = {
      documentId: '',
      content: ''
    };
    
    const errors = CommandValidator.validateCreateStatement(invalidCommand);
    expect(errors).toContain('Document ID is required');
    expect(errors).toContain('Statement content is required');
  });
});

describe('Query DTOs', () => {
  test('FindConnectionsQuery with filters', () => {
    const query: FindConnectionsQuery = {
      documentId: 'doc123',
      argumentId: 'arg456'
    };
    
    expect(query.argumentId).toBeDefined();
  });
});
```

## Success Criteria
- [ ] All commands follow naming convention (VerbNounCommand)
- [ ] All queries follow naming convention (GetXQuery, FindXQuery, ListXQuery)
- [ ] DTOs use primitive types only (no domain objects)
- [ ] Clear separation between commands (write) and queries (read)
- [ ] Validation rules at application boundary
- [ ] Consistent result structures
- [ ] No business logic in DTOs

## Notes
- DTOs are the contract between layers
- Commands can trigger multiple domain operations
- Queries can aggregate data from multiple sources
- Keep DTOs simple - just data, no behavior
- Version DTOs if needed for backward compatibility
- Bootstrap operations (empty states) are critical - includes InitializeEmptyDocument, CreateBootstrapArgument, and PopulateEmptyArgument commands
- Bootstrap queries help guide users through initial setup with GetBootstrapStatus and GetBootstrapInstructions
- Branch creation is a core user workflow
- Validation can be user-defined (custom scripts)
- Operation metadata enables tracking and correlation