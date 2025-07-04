# Task A2: Domain Mappers

## Status
- **Phase**: 2 - Application Layer
- **Priority**: High
- **Estimated Effort**: 3-4 hours
- **Dependencies**: A1 (Commands/Queries), D1 (Core Domain Entities)
- **Blocks**: A3 (Application Service)

## Goal
Implement domain mappers that translate between domain entities and DTOs, maintaining strict architectural boundaries. These mappers ensure that domain entities never cross layer boundaries and provide clean translation between the pure domain model and application layer DTOs.

## Context
The Application layer needs to translate between:
- **Domain entities** (pure business objects with behavior)
- **DTOs** (data transfer objects for API boundaries)

Mappers are essential for maintaining CLEAN architecture - they prevent domain entities from leaking into outer layers and provide a translation mechanism that preserves architectural integrity.

### Key Design Decisions
1. **Functional Pattern**: All mappers are pure functions, not classes (following existing codebase)
2. **neverthrow Results**: Use neverthrow for all validation and error handling
3. **Value Object Access**: Use `.getValue()` method for all value objects
4. **Bidirectional Translation**: Support both entity→DTO and DTO→entity conversions
5. **Batch Operations**: Provide both single and array conversion functions

## Current Mapper Pattern
Based on existing codebase in `src/application/mappers/`, we follow this pattern:
```typescript
// Functional exports (not classes)
export function entityToDTO(entity: Entity): EntityDTO
export function entityToDomain(dto: EntityDTO): Result<Entity, ValidationError>
export function entitiesToDTOs(entities: Entity[]): EntityDTO[]
export function entitiesToDomains(dtos: EntityDTO[]): Result<Entity[], ValidationError>
```

### Implementation Priorities
1. **Critical Path First**: Statement → OrderedSet → AtomicArgument → Tree
2. **Bootstrap Support**: Essential for empty document workflow
3. **Connection Analysis**: Enable proof tree navigation
4. **Validation Mapping**: Preserve error context and location

## Required Implementation

### 1. Enhanced Statement Mapper
Update `src/application/mappers/StatementMapper.ts` (already exists, needs validation functions):
```typescript
import { err, ok, type Result } from 'neverthrow';
import { Statement } from '../../domain/entities/Statement.js';
import { ValidationError } from '../../domain/shared/result.js';
import type { StatementDTO } from '../queries/statement-queries.js';

// Existing functions: statementToDTO, statementToDomain, statementsToDTOs, statementsToDomains

/**
 * Validate content for statement commands
 */
export function validateStatementContent(content: string): Result<string, ValidationError> {
  if (!content || content.trim().length === 0) {
    return err(new ValidationError('Statement content cannot be empty'));
  }
  
  if (content.length > 10000) {
    return err(new ValidationError('Statement content cannot exceed 10,000 characters'));
  }
  
  return ok(content.trim());
}

/**
 * Convert statement flow data to DTO
 */
export function statementFlowToDTO(flow: any): StatementFlowDTO {
  return {
    statementId: flow.statementId.getValue(),
    usedIn: flow.usedIn.map((usage: any) => ({
      orderedSetId: usage.orderedSetId.getValue(),
      argumentId: usage.argumentId.getValue(),
      role: usage.role
    })),
    flowPaths: flow.flowPaths.map((path: any) => ({
      path: path.path.map((id: any) => id.getValue()),
      distance: path.distance
    }))
  };
}
```

### 2. Enhanced OrderedSet Mapper
Update `src/application/mappers/OrderedSetMapper.ts` (already exists, needs validation functions):
```typescript
import { err, ok, type Result } from 'neverthrow';
import { OrderedSet } from '../../domain/entities/OrderedSet.js';
import { ValidationError } from '../../domain/shared/result.js';
import type { OrderedSetDTO } from '../queries/shared-types.js';

// Existing functions: orderedSetToDTO, orderedSetToDomain, orderedSetsToDTOs, orderedSetsToDomains

/**
 * Validate statement IDs for OrderedSet creation
 */
export function validateStatementIds(statementIds: string[]): Result<string[], ValidationError> {
  if (!statementIds || statementIds.length === 0) {
    return err(new ValidationError('OrderedSet must contain at least one statement'));
  }

  // Check for duplicates
  const uniqueIds = new Set(statementIds);
  if (uniqueIds.size !== statementIds.length) {
    return err(new ValidationError('OrderedSet cannot contain duplicate statement IDs'));
  }

  // Validate ID format (basic validation)
  for (const id of statementIds) {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return err(new ValidationError('All statement IDs must be non-empty strings'));
    }
  }

  return ok(statementIds);
}
```

### 3. Enhanced AtomicArgument Mapper
Update `src/application/mappers/AtomicArgumentMapper.ts` (already exists, needs validation functions):
```typescript
import { err, ok, type Result } from 'neverthrow';
import { AtomicArgument } from '../../domain/entities/AtomicArgument.js';
import { ValidationError } from '../../domain/shared/result.js';
import type { AtomicArgumentDTO } from '../queries/shared-types.js';

// Existing functions: atomicArgumentToDTO, atomicArgumentToDomain, atomicArgumentsToDTOs, atomicArgumentsToDomains

/**
 * Validate side labels for argument creation/update
 */
export function validateSideLabels(sideLabels?: { left?: string; right?: string }): Result<{ left?: string; right?: string } | undefined, ValidationError> {
  if (!sideLabels) {
    return ok(undefined);
  }

  // Validate left label
  if (sideLabels.left !== undefined) {
    if (typeof sideLabels.left !== 'string') {
      return err(new ValidationError('Left side label must be a string'));
    }
    if (sideLabels.left.length > 500) {
      return err(new ValidationError('Left side label cannot exceed 500 characters'));
    }
  }

  // Validate right label
  if (sideLabels.right !== undefined) {
    if (typeof sideLabels.right !== 'string') {
      return err(new ValidationError('Right side label must be a string'));
    }
    if (sideLabels.right.length > 500) {
      return err(new ValidationError('Right side label cannot exceed 500 characters'));
    }
  }

  return ok({
    left: sideLabels.left?.trim() || undefined,
    right: sideLabels.right?.trim() || undefined
  });
}
```

### 4. Enhanced Tree Mapper
Update `src/application/mappers/TreeMapper.ts` (already exists, needs enhancement for structure DTOs):
```typescript
import { err, ok, type Result } from 'neverthrow';
import { Tree } from '../../domain/entities/Tree.js';
import { ValidationError } from '../../domain/shared/result.js';
import type { TreeDTO } from '../queries/shared-types.js';
import type { TreeStructureDTO, TreeNodeDTO, NodeConnectionDTO } from '../queries/tree-queries.js';
import type { NodeRepository } from '../../domain/repositories/NodeRepository.js';
import type { ArgumentRepository } from '../../domain/repositories/ArgumentRepository.js';

// Existing functions: treeToDTO, treeToDomain, treesToDTOs, treesToDomains

/**
 * Convert Tree with detailed structure to DTO
 * Requires repositories to resolve node and argument details
 */
export async function treeToStructureDTO(
  tree: Tree, 
  nodeRepository: NodeRepository,
  argumentRepository: ArgumentRepository,
  includeArguments = false
): Promise<TreeStructureDTO> {
  const nodeIds = tree.getNodeIds();
  const nodes: TreeNodeDTO[] = [];
  const connections: NodeConnectionDTO[] = [];

  // Build nodes array with full details
  for (const nodeId of nodeIds) {
    const nodeResult = await nodeRepository.findById(nodeId);
    if (nodeResult.isOk()) {
      const node = nodeResult.value;
      const nodeDTO: TreeNodeDTO = {
        nodeId: nodeId.getValue(),
        argumentId: node.getArgumentId().getValue(),
        isRoot: tree.isRootNode(nodeId),
        position: node.getPosition() ? {
          x: node.getPosition().x,
          y: node.getPosition().y
        } : undefined
      };

      // Include argument details if requested
      if (includeArguments) {
        const argResult = await argumentRepository.findById(node.getArgumentId());
        if (argResult.isOk()) {
          nodeDTO.argument = atomicArgumentToDTO(argResult.value);
        }
      }

      nodes.push(nodeDTO);

      // Build connections from parent-child relationships
      const parent = node.getParentNodeId();
      if (parent) {
        connections.push({
          fromNodeId: nodeId.getValue(),
          toNodeId: parent.getValue(),
          premisePosition: node.getPremisePosition(),
          fromPosition: node.getFromPosition()
        });
      }
    }
  }

  return {
    treeId: tree.getId().getValue(),
    nodes,
    connections,
    depth: calculateTreeDepth(tree, nodes),
    breadth: calculateTreeBreadth(tree, nodes)
  };
}

/**
 * Validate tree position
 */
export function validatePosition(position: { x: number; y: number }): Result<{ x: number; y: number }, ValidationError> {
  if (typeof position.x !== 'number' || typeof position.y !== 'number') {
    return err(new ValidationError('Tree position coordinates must be numbers'));
  }

  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    return err(new ValidationError('Tree position coordinates must be finite numbers'));
  }

  return ok(position);
}

/**
 * Validate premise position for node attachment
 */
export function validatePremisePosition(position: number): Result<number, ValidationError> {
  if (!Number.isInteger(position) || position < 0) {
    return err(new ValidationError('Premise position must be a non-negative integer'));
  }

  if (position > 100) { // reasonable upper limit
    return err(new ValidationError('Premise position cannot exceed 100'));
  }

  return ok(position);
}

// Helper functions with proper implementation
function calculateTreeDepth(tree: Tree, nodes: TreeNodeDTO[]): number {
  if (nodes.length === 0) return 0;
  
  // Find root nodes
  const rootNodes = nodes.filter(n => n.isRoot);
  if (rootNodes.length === 0) return 0;
  
  // Calculate max depth from each root
  let maxDepth = 0;
  const visited = new Set<string>();
  
  function getDepth(nodeId: string, currentDepth: number): number {
    if (visited.has(nodeId)) return currentDepth;
    visited.add(nodeId);
    
    const children = nodes.filter(n => 
      n.nodeId !== nodeId && 
      nodes.some(connection => 
        connection.nodeId === nodeId && 
        connection.isRoot === false
      )
    );
    
    if (children.length === 0) return currentDepth;
    
    return Math.max(...children.map(child => 
      getDepth(child.nodeId, currentDepth + 1)
    ));
  }
  
  for (const root of rootNodes) {
    maxDepth = Math.max(maxDepth, getDepth(root.nodeId, 1));
  }
  
  return maxDepth;
}

function calculateTreeBreadth(tree: Tree, nodes: TreeNodeDTO[]): number {
  if (nodes.length === 0) return 0;
  
  // Breadth is the maximum number of nodes at any level
  const levels = new Map<number, number>();
  const visited = new Set<string>();
  
  function assignLevel(nodeId: string, level: number): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    levels.set(level, (levels.get(level) || 0) + 1);
    
    // Find children of this node
    const children = nodes.filter(n => 
      n.nodeId !== nodeId && 
      // Check connections to find children
      nodes.some(connection => 
        connection.nodeId === nodeId
      )
    );
    
    children.forEach(child => assignLevel(child.nodeId, level + 1));
  }
  
  // Start from root nodes
  nodes.filter(n => n.isRoot).forEach(root => 
    assignLevel(root.nodeId, 0)
  );
  
  return Math.max(...levels.values());
}
```

### 5. Enhanced Document Mapper  
Update `src/application/mappers/DocumentMapper.ts` (already exists, needs stats mapping):
```typescript
import { err, ok, type Result } from 'neverthrow';
import { ProofDocument } from '../../domain/aggregates/ProofDocument.js';
import { ValidationError } from '../../domain/shared/result.js';
import { DocumentDTO, DocumentStatsDTO } from '../queries/document-queries.js';
import { ValidationErrorDTO } from '../queries/shared-types.js';
import { statementToDTO, statementsToDTOs } from './StatementMapper.js';
import { orderedSetToDTO, orderedSetsToDTOs } from './OrderedSetMapper.js';
import { atomicArgumentToDTO, atomicArgumentsToDTOs } from './AtomicArgumentMapper.js';
import { treeToDTO, treesToDTOs } from './TreeMapper.js';
import { validationErrorToDTO, validationErrorsToDTOs } from './ValidationMapper.js';

/**
 * Convert ProofDocument aggregate to DTO
 */
export function documentToDTO(document: ProofDocument, includeStats = false): DocumentDTO {
  const dto: DocumentDTO = {
    id: document.getId().getValue(),
    version: document.getVersion(),
    createdAt: document.getCreatedAt().toISOString(),
    modifiedAt: document.getModifiedAt().toISOString(),
    statements: {},
    orderedSets: {},
    atomicArguments: {},
    trees: {}
  };

  // Map statements
  for (const [id, statement] of document.getStatements()) {
    dto.statements[id.getValue()] = statementToDTO(statement);
  }

  // Map ordered sets
  for (const [id, orderedSet] of document.getOrderedSets()) {
    dto.orderedSets[id.getValue()] = orderedSetToDTO(orderedSet);
  }

  // Map atomic arguments
  for (const [id, argument] of document.getAtomicArguments()) {
    dto.atomicArguments[id.getValue()] = atomicArgumentToDTO(argument);
  }

  // Map trees
  for (const [id, tree] of document.getTrees()) {
    dto.trees[id.getValue()] = treeToDTO(tree);
  }

  // Add stats if requested
  if (includeStats) {
    dto.stats = documentStatsToDTO(document.getStatistics());
  }

  return dto;
}

/**
 * Convert domain document statistics to DTO
 */
export function documentStatsToDTO(stats: any): DocumentStatsDTO {
  return {
    statementCount: stats.statementCount,
    argumentCount: stats.argumentCount,
    treeCount: stats.treeCount,
    connectionCount: stats.connectionCount,
    unusedStatements: stats.unusedStatements.map((id: any) => id.getValue()),
    unconnectedArguments: stats.unconnectedArguments.map((id: any) => id.getValue()),
    cyclesDetected: stats.cyclesDetected.map((cycle: any) => ({
      path: cycle.path.map((id: any) => id.getValue()),
      severity: cycle.severity
    })),
    validationStatus: {
      isValid: stats.validationStatus.isValid,
      errors: validationErrorsToDTOs(stats.validationStatus.errors)
    }
  };
}

/**
 * Reconstruct ProofDocument from DTO (for import scenarios)
 */
export function documentToDomain(dto: DocumentDTO): Result<ProofDocument, ValidationError> {
  // First reconstruct statements
  const statements = new Map();
  for (const [id, statementDTO] of Object.entries(dto.statements)) {
    const result = statementToDomain(statementDTO);
    if (result.isErr()) {
      return err(new ValidationError(`Failed to reconstruct statement ${id}: ${result.error.message}`));
    }
    statements.set(id, result.value);
  }

  // Then ordered sets (depends on statements)
  const orderedSets = new Map();
  for (const [id, orderedSetDTO] of Object.entries(dto.orderedSets || {})) {
    const result = orderedSetToDomain(orderedSetDTO);
    if (result.isErr()) {
      return err(new ValidationError(`Failed to reconstruct ordered set ${id}: ${result.error.message}`));
    }
    orderedSets.set(id, result.value);
  }

  // Then atomic arguments (depends on ordered sets)
  const arguments = new Map();
  for (const [id, argumentDTO] of Object.entries(dto.atomicArguments || {})) {
    const result = atomicArgumentToDomain(argumentDTO);
    if (result.isErr()) {
      return err(new ValidationError(`Failed to reconstruct argument ${id}: ${result.error.message}`));
    }
    arguments.set(id, result.value);
  }

  // Finally trees (depends on arguments)
  const trees = new Map();
  for (const [id, treeDTO] of Object.entries(dto.trees || {})) {
    const result = treeToDomain(treeDTO);
    if (result.isErr()) {
      return err(new ValidationError(`Failed to reconstruct tree ${id}: ${result.error.message}`));
    }
    trees.set(id, result.value);
  }

  // Reconstruct document aggregate
  const documentResult = ProofDocument.reconstruct({
    id: dto.id,
    version: dto.version,
    createdAt: new Date(dto.createdAt),
    modifiedAt: new Date(dto.modifiedAt),
    statements,
    orderedSets,
    arguments,
    trees
  });

  return documentResult;
}
```

### 6. Enhanced Validation Mapper
Update `src/application/mappers/ValidationMapper.ts` (already exists, needs enhancement):
```typescript
import { ValidationError } from '../../domain/shared/result.js';
import { ValidationErrorDTO } from '../queries/shared-types.js';

// Existing functions: validationErrorToDTO, validationErrorsToDTOs

/**
 * Map domain severity to DTO severity
 */
export function mapSeverityToDTO(severity?: string): 'error' | 'warning' | 'info' {
  switch (severity?.toLowerCase()) {
    case 'error':
    case 'critical':
      return 'error';
    case 'warning':
    case 'warn':
      return 'warning';
    case 'info':
    case 'information':
      return 'info';
    default:
      return 'error';
  }
}

/**
 * Create validation error DTO from message and optional location
 */
export function createValidationErrorDTO(
  message: string, 
  code = 'VALIDATION_ERROR',
  severity: 'error' | 'warning' | 'info' = 'error',
  location?: {
    treeId?: string;
    nodeId?: string;
    argumentId?: string;
  }
): ValidationErrorDTO {
  return {
    code,
    message,
    severity,
    location
  };
}
```

### 7. Bootstrap Mapper
Create `src/application/mappers/BootstrapMapper.ts`:
```typescript
import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../../domain/shared/result.js';
import type { BootstrapStatusDTO, BootstrapInstructionsDTO } from '../queries/bootstrap-queries.js';
import type { BootstrapResult } from '../dtos/operation-results.js';

/**
 * Convert domain bootstrap status to DTO
 */
export function bootstrapStatusToDTO(status: any): BootstrapStatusDTO {
  return {
    isInBootstrapState: status.isInBootstrapState,
    hasEmptyArguments: status.hasEmptyArguments,
    hasStatements: status.hasStatements,
    hasConnections: status.hasConnections,
    nextSteps: status.nextSteps,
    currentPhase: status.currentPhase
  };
}

/**
 * Convert domain bootstrap instructions to DTO
 */
export function bootstrapInstructionsToDTO(instructions: any): BootstrapInstructionsDTO {
  return {
    instructions: instructions.instructions,
    availableActions: instructions.availableActions,
    exampleCommands: instructions.exampleCommands?.map((cmd: any) => ({
      description: cmd.description,
      command: cmd.command
    }))
  };
}

/**
 * Convert domain bootstrap result to operation result DTO
 */
export function bootstrapResultToDTO(result: any): BootstrapResult {
  return {
    success: result.success,
    phase: result.phase,
    createdEntities: result.createdEntities ? {
      argumentId: result.createdEntities.argumentId?.getValue(),
      treeId: result.createdEntities.treeId?.getValue(),
      statementIds: result.createdEntities.statementIds?.map((id: any) => id.getValue()),
      orderedSetIds: result.createdEntities.orderedSetIds?.map((id: any) => id.getValue())
    } : undefined,
    nextSteps: result.nextSteps
  };
}
```

### 8. Connection Mapper
Create `src/application/mappers/ConnectionMapper.ts`:
```typescript
import type { ConnectionDTO, ConnectionPathDTO } from '../queries/connection-queries.js';

/**
 * Convert domain connection to DTO
 */
export function connectionToDTO(connection: any): ConnectionDTO {
  return {
    providerId: connection.providerId.getValue(),
    consumerId: connection.consumerId.getValue(),
    sharedOrderedSetId: connection.sharedOrderedSetId.getValue(),
    connectionType: connection.connectionType
  };
}

/**
 * Convert multiple domain connections to DTOs
 */
export function connectionsToDTOs(connections: any[]): ConnectionDTO[] {
  return connections.map(connectionToDTO);
}

/**
 * Convert domain connection path to DTO
 */
export function connectionPathToDTO(path: any): ConnectionPathDTO {
  return {
    steps: path.steps.map((id: any) => id.getValue()),
    sharedSets: path.sharedSets.map((id: any) => id.getValue()),
    totalLength: path.totalLength
  };
}

/**
 * Convert multiple domain connection paths to DTOs
 */
export function connectionPathsToDTOs(paths: any[]): ConnectionPathDTO[] {
  return paths.map(connectionPathToDTO);
}
```

### 9. Updated Mapper Index
Update `src/application/mappers/index.ts`:
```typescript
export * from './StatementMapper.js';
export * from './OrderedSetMapper.js';
export * from './AtomicArgumentMapper.js';
export * from './TreeMapper.js';
export * from './DocumentMapper.js';
export * from './ValidationMapper.js';
export * from './BootstrapMapper.js';
export * from './ConnectionMapper.js';
```

## Testing Requirements

### Mapper Tests
Create comprehensive tests for each mapper following modern TDD patterns:

```typescript
import { describe, test, expect } from 'vitest';
import { statementFactory } from '../../domain/__tests__/factories';
import { 
  validateStatementContent, 
  statementFlowToDTO,
  statementToDTO,
  statementToDomain
} from '../StatementMapper';

describe('Enhanced StatementMapper', () => {
  describe('validateStatementContent', () => {
    test('rejects empty content', () => {
      const result = validateStatementContent('');
      expect(result.isErr()).toBe(true);
      expect(result.error.message).toContain('cannot be empty');
    });

    test('rejects content exceeding length limit', () => {
      const longContent = 'a'.repeat(10001);
      const result = validateStatementContent(longContent);
      expect(result.isErr()).toBe(true);
      expect(result.error.message).toContain('cannot exceed 10,000 characters');
    });

    test('accepts valid content and trims whitespace', () => {
      const result = validateStatementContent('  Valid statement  ');
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('Valid statement');
    });

    // Property-based test
    test.prop([fc.string().filter(s => s.trim().length > 0 && s.length <= 10000)])(
      'accepts any non-empty string up to 10k chars',
      (content) => {
        const result = validateStatementContent(content);
        expect(result.isOk()).toBe(true);
        expect(result.value).toBe(content.trim());
      }
    );
  });

  describe('Entity ↔ DTO conversion', () => {
    test('statementToDTO preserves all fields', () => {
      const statement = statementFactory.build();
      const dto = statementToDTO(statement);
      
      expect(dto.id).toBe(statement.getId().getValue());
      expect(dto.content).toBe(statement.getContent());
      expect(dto.usageCount).toBe(statement.getUsageCount());
      expect(dto.createdAt).toBe(statement.getCreatedAt().toISOString());
      expect(dto.modifiedAt).toBe(statement.getModifiedAt().toISOString());
    });

    test('statementToDomain reconstructs entity correctly', () => {
      const original = statementFactory.build();
      const dto = statementToDTO(original);
      const result = statementToDomain(dto);
      
      expect(result.isOk()).toBe(true);
      const reconstructed = result.value;
      expect(reconstructed.getId().getValue()).toBe(original.getId().getValue());
      expect(reconstructed.getContent()).toBe(original.getContent());
    });

    test('statementToDomain validates DTO structure', () => {
      const invalidDTO = { 
        id: 'stmt1', 
        content: '', // Invalid empty content
        usageCount: 0,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };
      
      const result = statementToDomain(invalidDTO);
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeValidationError('Statement content cannot be empty');
    });
  });

  describe('statementFlowToDTO', () => {
    test('converts flow analysis correctly', () => {
      const mockFlow = createMockStatementFlow();
      const dto = statementFlowToDTO(mockFlow);
      
      expect(dto.statementId).toBe(mockFlow.statementId.getValue());
      expect(dto.usedIn).toHaveLength(mockFlow.usedIn.length);
      expect(dto.flowPaths).toHaveLength(mockFlow.flowPaths.length);
      
      // Verify nested structure
      dto.usedIn.forEach((usage, index) => {
        expect(usage.orderedSetId).toBe(mockFlow.usedIn[index].orderedSetId.getValue());
        expect(usage.argumentId).toBe(mockFlow.usedIn[index].argumentId.getValue());
        expect(usage.role).toMatch(/^(premise|conclusion)$/);
      });
    });
  });
});
```

### Integration Tests with Domain Layer
```typescript
describe('Mapper Integration with Domain', () => {
  test('round-trip conversion maintains entity integrity', () => {
    // Create complex domain structure
    const document = createTestDocument();
    const statement = document.createStatement('All men are mortal');
    const orderedSet = document.createOrderedSet([statement.getId()]);
    
    // Convert to DTO
    const statementDTO = statementToDTO(statement);
    const orderedSetDTO = orderedSetToDTO(orderedSet);
    
    // Reconstruct from DTO
    const statementResult = statementToDomain(statementDTO);
    const orderedSetResult = orderedSetToDomain(orderedSetDTO);
    
    expect(statementResult.isOk()).toBe(true);
    expect(orderedSetResult.isOk()).toBe(true);
    
    // Verify relationships preserved
    const reconstructedSet = orderedSetResult.value;
    expect(reconstructedSet.contains(statement.getId())).toBe(true);
  });
});
```

## Architectural Principles

### 1. Boundary Enforcement
- **Domain entities never leave the domain layer**
- **DTOs never enter the domain layer**
- **Mappers only translate at boundaries**
- **No domain imports in presentation/infrastructure layers**

### 2. Functional Pattern
- **All mappers are functions, not classes**
- **Follow existing codebase pattern exactly**
- **Use `.getValue()` method for value objects**
- **Pure functions with no side effects**

### 3. Validation Strategy
- **Structural validation**: In mappers (format, required fields)
- **Business validation**: In domain entities
- **Integration validation**: In application services
- **Validation errors use consistent ValidationError type**

### 4. Error Handling
- **Use neverthrow Result types for all fallible operations**
- **Map domain errors to DTO errors preserving context**
- **Chain Results with map/andThen for clean error propagation**
- **Never throw exceptions in mappers**

### 5. Performance Considerations
- **Lazy loading**: Tree structure mapping can defer node details**
- **Batch operations**: Provide array conversion functions**
- **Minimize allocations**: Reuse DTO structures where possible**
- **Async mappers**: For repository-dependent conversions**

## Success Criteria
- [ ] All domain entities have corresponding mappers
- [ ] Follow existing functional pattern exactly
- [ ] Use correct value object method names (.getValue())
- [ ] Domain entities never appear in DTOs
- [ ] DTOs never appear in domain layer
- [ ] All mappers use neverthrow Result types
- [ ] Comprehensive validation for all inputs
- [ ] 100% test coverage for mappers
- [ ] Clear separation of concerns
- [ ] Consistent error handling patterns

## Implementation Notes

### Common Patterns
```typescript
// 1. Simple entity to DTO
export function entityToDTO(entity: Entity): EntityDTO {
  return {
    id: entity.getId().getValue(),
    // Map all fields using getters
  };
}

// 2. DTO to domain with validation
export function entityToDomain(dto: EntityDTO): Result<Entity, ValidationError> {
  // Validate DTO structure first
  const contentResult = validateContent(dto.content);
  if (contentResult.isErr()) {
    return err(contentResult.error);
  }
  
  // Use domain factory/reconstruct methods
  return Entity.reconstruct({
    id: dto.id,
    content: contentResult.value,
    // ... other fields
  });
}

// 3. Batch operations with error collection
export function entitiesToDomains(dtos: EntityDTO[]): Result<Entity[], ValidationError> {
  const entities: Entity[] = [];
  const errors: string[] = [];
  
  for (const dto of dtos) {
    const result = entityToDomain(dto);
    if (result.isErr()) {
      errors.push(`Entity ${dto.id}: ${result.error.message}`);
    } else {
      entities.push(result.value);
    }
  }
  
  if (errors.length > 0) {
    return err(new ValidationError(`Multiple errors: ${errors.join('; ')}`));
  }
  
  return ok(entities);
}

// 4. Complex mapping with repositories
export async function treeWithDetailsToDTO(
  tree: Tree,
  repos: { node: NodeRepository; argument: ArgumentRepository }
): Promise<TreeStructureDTO> {
  // Async operations for detailed mapping
  const nodePromises = tree.getNodeIds().map(async (nodeId) => {
    const nodeResult = await repos.node.findById(nodeId);
    if (nodeResult.isErr()) return null;
    
    const node = nodeResult.value;
    return {
      nodeId: nodeId.getValue(),
      argumentId: node.getArgumentId().getValue(),
      // ... other mappings
    };
  });
  
  const nodes = (await Promise.all(nodePromises)).filter(n => n !== null);
  return buildTreeStructureDTO(tree, nodes);
}
```

### Common Pitfalls to Avoid
1. **Don't expose domain objects**: Never return domain entities from mappers
2. **Don't mutate inputs**: Mappers should be pure functions
3. **Don't skip validation**: Always validate DTOs before domain conversion
4. **Don't lose error context**: Preserve meaningful error messages
5. **Don't mix concerns**: Keep validation separate from transformation
6. **Don't forget value objects**: Use `.getValue()` for all value object access
7. **Don't create circular dependencies**: Mappers shouldn't import from outer layers

### Bootstrap Considerations
- Bootstrap mappers handle empty states gracefully
- Support incremental population of empty arguments
- Provide clear next-step guidance in DTOs
- Map bootstrap phases accurately

### Performance Tips
- Use object spreading for DTO creation
- Consider memoization for expensive conversions
- Batch database queries in async mappers
- Avoid N+1 queries in tree/graph mappings

## Notes
- Mappers are stateless utilities (functions, not classes)
- Validation focuses on structural/format concerns
- Business logic validation remains in domain
- Error mapping preserves context and meaning
- Support for both single and batch operations
- Bootstrap operations have specialized mappers
- Tree structure mapping requires repository collaboration
- Connection analysis supported through specialized mappers
- Follow neverthrow patterns consistently
- Maintain type safety throughout conversions